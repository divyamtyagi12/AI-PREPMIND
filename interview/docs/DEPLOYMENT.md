# PrepMind AI — Production Deployment Guide

## 1. Prerequisites
- **Node.js**: v20+ LTS
- **MongoDB**: MongoDB Atlas cluster (or self-hosted MongoDB 7.0+)
- **Google Gemini API Key**: For AI Question Generation, AI Tutor, and AI Mock Interviews
- **Judge0 CE / RapidAPI Endpoint**: For sandboxed online code execution

## 2. Environment Configuration
### Backend (`interview/server/.env`)
Copy `interview/server/.env.example` to `interview/server/.env`:
```env
PORT=4000
NODE_ENV=production
CLIENT_ORIGIN=https://your-frontend-domain.com
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/prepmind?retryWrites=true&w=majority
JWT_ACCESS_SECRET=<64-hex-char-random-secret-1>
JWT_REFRESH_SECRET=<64-hex-char-random-secret-2>
TRUST_PROXY=1
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-2.5-flash
CODE_EXECUTION_PROVIDER=judge0
CODE_EXECUTION_BASE_URL=https://judge0-ce.p.rapidapi.com
CODE_EXECUTION_API_KEY=<your-rapidapi-or-judge0-key>
```

### Frontend (`interview/client/.env`)
Copy `interview/client/.env.example` to `interview/client/.env`:
```env
VITE_API_BASE_URL=https://your-backend-domain.com
```

## 3. Build & Start Commands
```bash
# 1. Install dependencies
npm --prefix interview/server ci
npm --prefix interview/client ci

# 2. Build TypeScript backend & Vite production frontend
npm --prefix interview/server run build
npm --prefix interview/client run build

# 3. Seed initial taxonomy, external DSA problems, and diagnostic assessments
npm --prefix interview/server run seed:taxonomy
npm --prefix interview/server run seed:external
npm --prefix interview/server run seed:assessments

# 4. Start production server
npm --prefix interview/server start
```

## 4. Health Verification
Verify `GET /api/health` returns:
```json
{
  "success": true,
  "data": { "status": "ok", "db": "connected" }
}
```

