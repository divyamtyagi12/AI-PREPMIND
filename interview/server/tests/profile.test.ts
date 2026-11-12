import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { Session } from '../src/models/Session';
import { User } from '../src/models/User';
import {
  clearTestDb,
  registerClient,
  startTestDb,
  stopTestDb,
  TestClient,
  validProfile,
  validUser,
} from './helpers';

const app = createApp();

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

describe('GET /api/users/profile', () => {
  it('returns the authenticated user profile', async () => {
    const { client } = await registerClient(app);
    const res = await client.get('/api/users/profile');
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ email: validUser.email, preparationGoals: [] });
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });
});

describe('PATCH /api/users/profile', () => {
  it('saves onboarding data permanently and marks onboarding complete', async () => {
    const { client } = await registerClient(app);
    const res = await client.patch('/api/users/profile', validProfile);
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ ...validProfile, onboardingCompleted: true });

    // persisted in MongoDB and visible on a fresh login
    const stored = await User.findOne({ email: validUser.email });
    expect(stored).toMatchObject({ college: 'IIT Delhi', targetRole: 'Backend Developer', onboardingCompleted: true });
    const again = new TestClient(app);
    await again.post('/api/auth/login', { email: validUser.email, password: validUser.password });
    expect((await again.get('/api/users/profile')).body.data.user.preferredLanguage).toBe('Python');
  });

  it('supports partial updates, custom roles and name changes', async () => {
    const { client } = await registerClient(app);
    await client.patch('/api/users/profile', validProfile);
    const res = await client.patch('/api/users/profile', { name: 'Asha V', targetRole: 'Quant Developer' });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ name: 'Asha V', targetRole: 'Quant Developer', college: 'IIT Delhi' });
    expect(res.body.data.user.onboardingCompleted).toBe(true);
  });

  it('does not mark onboarding complete when fields are missing', async () => {
    const { client } = await registerClient(app);
    const res = await client.patch('/api/users/profile', { college: 'IIT Delhi' });
    expect(res.body.data.user.onboardingCompleted).toBe(false);
  });

  it.each([
    ['bad level', { preparationLevel: 'Expert' }, 'preparationLevel'],
    ['bad language', { preferredLanguage: 'Cobol' }, 'preferredLanguage'],
    ['empty goals', { preparationGoals: [] }, 'preparationGoals'],
    ['unknown goal', { preparationGoals: ['Hacking'] }, 'preparationGoals.0'],
    ['far future year', { graduationYear: 2999 }, 'graduationYear'],
    ['blank college', { college: '   ' }, 'college'],
    ['short name', { name: 'x' }, 'name'],
  ])('rejects invalid input: %s', async (_l, body, field) => {
    const { client } = await registerClient(app);
    const res = await client.patch('/api/users/profile', body);
    expect(res.status).toBe(400);
    expect(res.body.error.details[field]).toBeTruthy();
  });

  it('rejects an empty update', async () => {
    const { client } = await registerClient(app);
    expect((await client.patch('/api/users/profile', {})).status).toBe(400);
  });

  it('cannot modify protected fields (role, email, passwordHash, id, onboardingCompleted)', async () => {
    const { client } = await registerClient(app);
    for (const body of [
      { role: 'admin' },
      { email: 'hacker@example.com' },
      { passwordHash: 'x' },
      { _id: '507f1f77bcf86cd799439011' },
      { onboardingCompleted: true },
    ]) {
      expect((await client.patch('/api/users/profile', body)).status).toBe(400);
    }
    const stored = await User.findOne();
    expect(stored).toMatchObject({ role: 'student', email: validUser.email, onboardingCompleted: false });
  });

  it("only ever changes the authenticated user's own record", async () => {
    const { client: alice } = await registerClient(app);
    const { client: bob } = await registerClient(app, { name: 'Bob Rao', email: 'bob@example.com' });
    const bobDoc = await User.findOne({ email: 'bob@example.com' });

    // Alice tries to target Bob by id in the body, query string and path: all ignored/rejected.
    expect((await alice.patch('/api/users/profile', { id: bobDoc!.id, college: 'Hacked' })).status).toBe(400);
    await alice.patch(`/api/users/profile?userId=${bobDoc!.id}`, { college: 'Alice College' });
    expect((await alice.patch(`/api/users/${bobDoc!.id}/profile`, { college: 'Hacked' })).status).toBe(404);

    expect((await User.findOne({ email: 'bob@example.com' }))!.college).toBeUndefined();
    expect((await User.findOne({ email: validUser.email }))!.college).toBe('Alice College');
    expect((await bob.get('/api/users/profile')).body.data.user.college).toBeUndefined();
  });
});

describe('PATCH /api/users/password', () => {
  const change = { currentPassword: validUser.password, newPassword: 'NewPassw0rd9', confirmPassword: 'NewPassw0rd9' };

  it('changes the password, allows login with the new one, and revokes other sessions', async () => {
    const { client } = await registerClient(app);
    const other = new TestClient(app);
    await other.post('/api/auth/login', { email: validUser.email, password: validUser.password });

    const res = await client.patch('/api/users/password', change);
    expect(res.status).toBe(200);

    expect((await client.get('/api/auth/me')).status).toBe(200); // current session survives
    expect((await other.get('/api/auth/me')).status).toBe(401); // other device signed out
    expect(
      (await new TestClient(app).post('/api/auth/login', { email: validUser.email, password: validUser.password })).status,
    ).toBe(401);
    expect(
      (await new TestClient(app).post('/api/auth/login', { email: validUser.email, password: change.newPassword })).status,
    ).toBe(200);
    expect(await Session.countDocuments({ revokedAt: { $ne: null } })).toBe(1);
  });

  it('rejects a wrong current password', async () => {
    const { client } = await registerClient(app);
    const res = await client.patch('/api/users/password', { ...change, currentPassword: 'Wrong12345' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.currentPassword).toBeTruthy();
  });

  it.each([
    ['weak new password', { newPassword: 'short', confirmPassword: 'short' }, 'newPassword'],
    ['mismatch', { confirmPassword: 'Other12345' }, 'confirmPassword'],
    ['same as current', { newPassword: validUser.password, confirmPassword: validUser.password }, 'newPassword'],
  ])('rejects %s', async (_l, override, field) => {
    const { client } = await registerClient(app);
    const res = await client.patch('/api/users/password', { ...change, ...override });
    expect(res.status).toBe(400);
    expect(res.body.error.details[field]).toBeTruthy();
  });

  it('requires authentication', async () => {
    const client = new TestClient(app);
    client.cookies.set('pm_csrf', 'valid-csrf-token');
    expect((await client.patch('/api/users/password', change)).status).toBe(401);
  });
});

