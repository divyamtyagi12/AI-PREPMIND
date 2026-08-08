import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import path from 'path';

import { loadStore } from './store';
import healthRouter from './routes/health';
import interviewRouter from './routes/interview';
import candidatesRouter from './routes/candidates';
import { errorHandler } from './middleware/errorHandler';

// ─── Load data ────────────────────────────────────────────────────────────────
// Must happen before routes are mounted so every handler can call getStore().
loadStore();

// ─── App setup ────────────────────────────────────────────────────────────────
const app = express();

// Security
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'", "'unsafe-inline'"],   // needed for inline <script> in index.html
        styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
        connectSrc:  ["'self'"],
        imgSrc:      ["'self'", 'data:'],
      },
    },
  }),
);

// CORS
app.use(cors());

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static frontend & UI Route ───────────────────────────────────────────────
// Serves public/index.html at GET / and static assets from public/
app.get('/', (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), 'public/index.html'));
});
app.use(express.static('public'));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/health', healthRouter);
app.use('/api/interview', interviewRouter);
app.use('/api/candidates', candidatesRouter);

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { message: 'Route not found' } });
});

// Central error handler (must be last)
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  console.log(`\n🚀  Interview Platform API`);
  console.log(`   Environment : ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`   Listening on: http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Interview   : POST http://localhost:${PORT}/api/interview\n`);
});

export default app;
