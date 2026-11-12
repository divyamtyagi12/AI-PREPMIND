import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { Session } from '../src/models/Session';
import { User } from '../src/models/User';
import { clearTestDb, registerClient, startTestDb, stopTestDb, TestClient, validUser } from './helpers';

const app = createApp();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

describe('POST /api/auth/register', () => {
  it('registers a user, sets httpOnly cookies and never leaks the password hash', async () => {
    const { client, res } = await registerClient(app);
    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({
      name: 'Asha Verma',
      email: 'asha@example.com',
      role: 'student',
      onboardingCompleted: false,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|password"/i);

    const cookies = (res.headers['set-cookie'] as unknown as string[]).join('\n');
    expect(cookies).toMatch(/pm_access=.*HttpOnly/);
    expect(cookies).toMatch(/pm_refresh=.*HttpOnly/);
    expect(cookies).toMatch(/SameSite=Lax/);
    expect(client.cookies.has('pm_csrf')).toBe(true);

    const stored = await User.findOne({ email: 'asha@example.com' }).select('+passwordHash');
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(stored?.passwordHash).not.toContain(validUser.password);
  });

  it('normalizes email casing and whitespace', async () => {
    const { res } = await registerClient(app, { email: '  ASHA@Example.COM ' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('asha@example.com');
  });

  it('rejects a duplicate email (case-insensitively) with 409', async () => {
    await registerClient(app);
    const { res } = await registerClient(app, { email: 'ASHA@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
    expect(await User.countDocuments()).toBe(1);
  });

  it.each([
    ['invalid email', { email: 'nope' }, 'email'],
    ['short password', { password: 'a1', confirmPassword: 'a1' }, 'password'],
    ['password without number', { password: 'abcdefghij', confirmPassword: 'abcdefghij' }, 'password'],
    ['mismatched confirmation', { confirmPassword: 'Different123' }, 'confirmPassword'],
    ['short name', { name: 'A' }, 'name'],
  ])('rejects %s with field errors', async (_label, override, field) => {
    const { res } = await registerClient(app, override);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[field]).toBeTruthy();
  });

  it('rejects unknown fields such as role (no privilege escalation)', async () => {
    const client = new TestClient(app);
    const res = await client.post('/api/auth/register', { ...validUser, role: 'admin' });
    expect(res.status).toBe(400);
    expect(await User.countDocuments()).toBe(0);
  });

  it('rejects requests from a disallowed Origin', async () => {
    const client = new TestClient(app);
    const res = await client.post('/api/auth/register', validUser, { headers: { Origin: 'https://evil.example' } });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await registerClient(app);
    const client = new TestClient(app);
    const res = await client.post('/api/auth/login', { email: 'ASHA@example.com', password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('asha@example.com');
    expect(client.cookies.has('pm_access')).toBe(true);
    expect((await client.get('/api/auth/me')).status).toBe(200);
  });

  it('rejects an incorrect password with a generic message', async () => {
    await registerClient(app);
    const res = await new TestClient(app).post('/api/auth/login', { email: validUser.email, password: 'WrongPass1' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('gives the same response for an unknown email', async () => {
    const res = await new TestClient(app).post('/api/auth/login', { email: 'ghost@example.com', password: 'WrongPass1' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Incorrect email or password');
  });

  it('rate limits repeated failed logins', async () => {
    const limited = createApp({ loginMax: 3 });
    const client = new TestClient(limited);
    await registerClient(limited);
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      statuses.push((await client.post('/api/auth/login', { email: validUser.email, password: 'WrongPass1' })).status);
    }
    expect(statuses).toEqual([401, 401, 401, 429, 429]);
  });
});

describe('protected access, sessions and tokens', () => {
  it('rejects unauthenticated access to /me and /users/*', async () => {
    const client = new TestClient(app);
    expect((await client.get('/api/auth/me')).status).toBe(401);
    expect((await client.get('/api/users/profile')).status).toBe(401);
    client.cookies.set('pm_csrf', 'valid-csrf-token');
    expect((await client.patch('/api/users/profile', { college: 'X' })).status).toBe(401);
  });

  it('GET /me returns the safe user object', async () => {
    const { client } = await registerClient(app);
    const res = await client.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects a tampered access token', async () => {
    const { client } = await registerClient(app);
    client.cookies.set('pm_access', client.cookies.get('pm_access') + 'x');
    const res = await client.get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects a token signed with the wrong secret', async () => {
    const { client } = await registerClient(app);
    const forged = jwt.sign({ sid: 'x' }, 'some-other-secret-that-is-long-enough-123', {
      subject: 'x',
      issuer: 'prepmind-ai',
    });
    client.cookies.set('pm_access', forged);
    expect((await client.get('/api/auth/me')).body.error.code).toBe('INVALID_TOKEN');
  });

  it('reports an expired access token with TOKEN_EXPIRED', async () => {
    const { client } = await registerClient(app);
    const user = await User.findOne();
    const session = await Session.findOne();
    const expired = jwt.sign({ sid: session!.id }, process.env.JWT_ACCESS_SECRET!, {
      subject: user!.id,
      issuer: 'prepmind-ai',
      expiresIn: -10,
    });
    client.cookies.set('pm_access', expired);
    const res = await client.get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('refresh rotates the refresh token and the old one becomes unusable (reuse revokes the session)', async () => {
    const { client } = await registerClient(app);
    const oldRefresh = client.cookies.get('pm_refresh')!;

    const res = await client.post('/api/auth/refresh');
    expect(res.status).toBe(200);
    const newRefresh = client.cookies.get('pm_refresh')!;
    expect(newRefresh).not.toBe(oldRefresh);
    expect((await client.get('/api/auth/me')).status).toBe(200);

    // Attacker replays the old, already-rotated token.
    const attacker = new TestClient(app);
    attacker.cookies.set('pm_refresh', oldRefresh);
    attacker.cookies.set('pm_csrf', 'abc');
    const replay = await attacker.post('/api/auth/refresh');
    expect(replay.status).toBe(401);

    // The legitimate session was revoked as a precaution.
    expect((await client.get('/api/auth/me')).status).toBe(401);
  });

  it('only stores a hash of the refresh token', async () => {
    const { client } = await registerClient(app);
    const session = await Session.findOne();
    expect(session!.refreshTokenHash).not.toBe(client.cookies.get('pm_refresh'));
    expect(session!.refreshTokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('logout revokes the session: the old access and refresh tokens stop working', async () => {
    const { client } = await registerClient(app);
    const access = client.cookies.get('pm_access')!;
    const refresh = client.cookies.get('pm_refresh')!;

    const res = await client.post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect((await Session.findOne())!.revokedAt).toBeTruthy();

    const replay = new TestClient(app);
    replay.cookies.set('pm_access', access);
    replay.cookies.set('pm_refresh', refresh);
    replay.cookies.set('pm_csrf', 'abc');
    expect((await replay.get('/api/auth/me')).body.error.code).toBe('SESSION_REVOKED');
    expect((await replay.post('/api/auth/refresh')).status).toBe(401);
  });

  it('blocks state-changing requests without a valid CSRF token', async () => {
    const { client } = await registerClient(app);
    const res = await client.post('/api/auth/logout', undefined, { csrf: false });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_INVALID');
    const wrong = await client.patch('/api/users/profile', { college: 'X' }, { headers: { 'X-CSRF-Token': 'wrong' } });
    expect(wrong.status).toBe(403);
  });
});

describe('misc', () => {
  it('returns JSON 404s and sets security headers', async () => {
    const res = await new TestClient(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('rejects oversized bodies', async () => {
    const client = new TestClient(app);
    const res = await client.post('/api/auth/login', { email: 'a@b.co', password: 'x'.repeat(20_000) });
    expect(res.status).toBe(413);
  });
});

