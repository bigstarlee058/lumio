---
title: Configuration
description: Environment variables and integration setup
---

Lumio ships with sane defaults for local development. Production deployments require real secrets and stable
credentials.

## Root environment (.env)

These variables are read by Docker Compose in production-like setups.

```bash
# Required in production
JWT_SECRET=
JWT_REFRESH_SECRET=
DATABASE_URL=postgresql://user:password@host:5432/finflow

# User-managed integrations are configured in the UI.
# Env integration values are fallback-only.
```

## Backend environment (backend/.env)

The backend supports a full configuration reference in `backend/.env.all-options`. Common settings:

```bash
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://finflow:finflow@localhost:5432/finflow
REDIS_HOST=localhost

JWT_SECRET=
JWT_REFRESH_SECRET=
```

Configure OpenAI-compatible AI backends, SMTP, S3-compatible storage, WebDAV, IMAP, Telegram,
and the public App URL from the Integrations/Settings UI. `backend/.env.all-options` remains useful
for infrastructure settings and temporary fallback defaults.

## Frontend environment

The frontend reads `NEXT_PUBLIC_API_URL` and OAuth client IDs from the environment. In Docker, these are injected
by the compose file. For local dev, the default proxy route handles API calls.

## Secrets management

- Never commit `.env` files or API keys.
- Use Docker secrets or a secret manager for infrastructure secrets.
- Store integration credentials through the UI so they are encrypted per workspace.
- Rotate protocol credentials and JWT keys regularly.

Next: [Demo Mode](demo-mode)
