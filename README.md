# FitAI Coach - Backend

AI-powered fitness and nutrition coaching application.

## Setup

1. Install dependencies:
\\\
npm install
\\\

2. Create .env file from .env.example

3. Set up PostgreSQL and update DATABASE_URL

4. Run migrations:
\\\
npm run prisma:migrate
\\\

5. Start development server:
\\\
npm run dev
\\\

## API Endpoints

- POST /api/auth/register
- POST /api/auth/login
- GET /api/health
