import type { Express } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

let mongod: MongoMemoryServer | null = null;

export async function startTestDb(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('prepmind_test'));
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}

export async function stopTestDb(): Promise<void> {
  await mongoose.disconnect();
  await mongod?.stop();
}

export async function clearTestDb(): Promise<void> {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

export const validUser = {
  name: 'Asha Verma',
  email: 'asha@example.com',
  password: 'Passw0rdOK',
  confirmPassword: 'Passw0rdOK',
};

export const validProfile = {
  college: 'IIT Delhi',
  degree: 'B.Tech / B.E.',
  branch: 'Computer Science',
  graduationYear: new Date().getFullYear() + 1,
  targetRole: 'Backend Developer',
  preparationLevel: 'Intermediate',
  preferredLanguage: 'Python',
  preparationGoals: ['DSA', 'Core CS'],
};

/** Minimal cookie-aware client that automatically sends the CSRF header, like the browser SPA does. */
export class TestClient {
  cookies = new Map<string, string>();
  constructor(private app: Express) {}

  private store(setCookie: string[] | undefined) {
    for (const line of setCookie ?? []) {
      const [pair] = line.split(';');
      const idx = pair.indexOf('=');
      const name = pair.slice(0, idx);
      const value = pair.slice(idx + 1);
      if (/expires=thu, 01 jan 1970/i.test(line) || value === '') this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  async send(
    method: 'get' | 'post' | 'patch',
    url: string,
    body?: unknown,
    opts: { csrf?: boolean; headers?: Record<string, string> } = {},
  ) {
    const req = request(this.app)[method](url);
    const cookieHeader = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    if (cookieHeader) req.set('Cookie', cookieHeader);
    const csrf = this.cookies.get('pm_csrf');
    if (csrf && opts.csrf !== false) req.set('X-CSRF-Token', csrf);
    for (const [k, v] of Object.entries(opts.headers ?? {})) req.set(k, v);
    if (body !== undefined) req.send(body as object);
    const res = await req;
    this.store(res.headers['set-cookie'] as unknown as string[] | undefined);
    return res;
  }

  get = (url: string) => this.send('get', url);
  post = (url: string, body?: unknown, opts?: { csrf?: boolean; headers?: Record<string, string> }) =>
    this.send('post', url, body, opts);
  patch = (url: string, body?: unknown, opts?: { csrf?: boolean; headers?: Record<string, string> }) =>
    this.send('patch', url, body, opts);
}

export async function registerClient(app: Express, overrides: Partial<typeof validUser> = {}) {
  const client = new TestClient(app);
  const res = await client.post('/api/auth/register', { ...validUser, ...overrides });
  return { client, res };
}

