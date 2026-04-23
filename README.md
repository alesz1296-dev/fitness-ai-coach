# FitAI Coach

AI-powered fitness coach for workouts, nutrition, progress tracking, and personalized chat guidance.

## GitHub About

AI fitness coach with workout planning, nutrition tracking, progress analytics, and coaching chat.

## Overview

FitAI Coach is a full-stack fitness coaching web app that combines workout logging, nutrition tracking, body progress insights, and AI-guided recommendations in one place.

The app includes:

- Personalized workout tracking and templates
- Nutrition logging with calorie and macro goals
- Weight and progress analytics
- AI chat agents for coaching, nutrition, and general support
- Weekly planning and monthly progress reports

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: Prisma ORM with SQLite
- Authentication: JWT access and refresh tokens
- AI: OpenAI API with multi-agent tool calling
- State and charts: Zustand, React Router, Recharts
- Validation: Zod

## Core Features

- Workout CRUD, templates, and exercise progression
- Food logging with macro tracking and calorie goals
- Weight tracking with trend visualization
- Dashboard with aggregated fitness data
- AI chat with coach, nutritionist, and general assistant modes
- Structured AI responses that can be saved into workouts and plans
- Weekly workout planning
- Monthly report generation
- Onboarding flow with profile, TDEE, and macro setup

## Project Structure

```text
fitness_ai_coach/
|-- src/                 # Express backend
|-- prisma/              # Prisma schema and migrations
|-- client/              # React frontend
|-- scripts/             # Local development helpers
|-- CONTEXT.md           # Project context and architecture notes
|-- LOG.md               # Session change log
```

## Getting Started

### 1. Install dependencies

From the project root:

```bash
npm install
```

From the frontend folder:

```bash
cd client
npm install
```

### 2. Configure environment variables

Create your local environment file:

```bash
cp .env.example .env
```

Set the required values in `.env`, especially:

- `OPENAI_API_KEY`
- `JWT_SECRET`
- `DATABASE_URL`

## Database

This project currently uses SQLite for local development.

Generate the Prisma client:

```bash
npx prisma generate
```

Apply migrations:

```bash
npx prisma migrate deploy
```

For schema changes during development:

```bash
npx prisma migrate dev --name your_migration_name
```

## Run Locally

### Backend

From the project root:

```bash
npm run dev
```

The backend runs on port `3000`.

### Frontend

From `client/`:

```bash
npm run dev
```

The frontend runs on Vite's local dev server, typically port `5173`.

## Available Scripts

### Root

```bash
npm run dev
npm run build
npm run start
npm run db:migrate
npm run db:generate
npm run db:studio
```

### Client

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## API Overview

All backend routes are under `/api`.

Main route groups:

- `/api/auth`
- `/api/users`
- `/api/workouts`
- `/api/foods`
- `/api/weight`
- `/api/goals`
- `/api/calorie-goals`
- `/api/templates`
- `/api/chat`
- `/api/weekly-plan`
- `/api/reports`
- `/api/dashboard`
- `/api/search`

## AI Layer

FitAI Coach includes three AI agent modes:

- Coach
- Nutritionist
- General assistant

The AI layer supports tool calling and returns structured workout, nutrition, and meal-plan blocks so the frontend can offer save and log actions directly from chat.

## Production Notes

Before deploying publicly, the current architecture should be hardened with:

- PostgreSQL instead of SQLite
- Redis for token revocation and rate limiting
- Docker setup
- CI pipeline
- Stronger environment validation and OpenAI error handling

## Notes

- The canonical Prisma schema is `prisma/schema.prisma`
- After schema changes, run `npx prisma generate`
- JWT revocation and rate limiting are currently in-memory
- `CONTEXT.md` contains the most detailed project architecture reference
