# SWE project

A lab inventory and equipment management app: track stock, requests, borrowed items, suppliers, and reports. The UI is a React + Vite frontend in `apps/frontend`; backend/API code lives in `apps/api`. Run all commands from the repo root.

## Setup

```sh
git clone <YOUR_GIT_URL> && cd <YOUR_PROJECT_NAME>
npm install
npm run dev
```

## Production Deployment

Production deployment with AWS + Coolify is documented in `DEPLOY_AWS_COOLIFY.md`.

For production containers, use `docker-compose.prod.yml` and set environment values from `.env.production.example` in Coolify (or your secret manager).
