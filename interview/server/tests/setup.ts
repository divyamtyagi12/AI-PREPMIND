// Runs before any test file imports application code. Tests NEVER use the real .env database:
// MONGODB_URI is replaced by an in-memory MongoDB started in tests/helpers.ts.
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789-abcdefghijklmnop';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789-abcdefghijklmnop';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/never-used';

