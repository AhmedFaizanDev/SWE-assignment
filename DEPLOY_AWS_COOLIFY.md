# Production Deployment (AWS + Coolify)

This project is set up for production deployment with:

- `frontend` (React/Vite static app served by Nginx)
- `api` (Django + Gunicorn)
- `db` (PostgreSQL)
- `redis` (Redis)

All services can run inside Coolify from `docker-compose.prod.yml`.

## 1) AWS Infrastructure (minimum)

1. Create an EC2 instance (Ubuntu 22.04 LTS recommended) in a VPC with:
   - Inbound: `22` (restricted), `80`, `443`
   - Outbound: allow internet egress
2. Attach an Elastic IP to the instance.
3. Point DNS:
   - `frontend.example.com` -> EC2 Elastic IP
   - `api.example.com` -> EC2 Elastic IP

For higher resilience, move PostgreSQL and Redis to AWS managed services (RDS/ElastiCache). This repo currently includes containerized `db` and `redis` for a single-host production setup.

## 2) Install Coolify on EC2

Run on the EC2 host:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Open Coolify dashboard and complete initial admin setup.

## 3) Create a Coolify Project and Application

1. Connect your Git repository in Coolify.
2. Create a new **Docker Compose** application.
3. Set **Compose File Path** to:

```text
docker-compose.prod.yml
```

4. Add domains in Coolify:
   - `frontend.example.com` -> service `frontend`
   - `api.example.com` -> service `api`

Coolify will provision reverse proxy + TLS certificates automatically.

## 4) Configure Environment Variables in Coolify

Copy from `.env.production.example` and set real values in Coolify:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `SECRET_KEY`
- `ALLOWED_HOSTS` (include your API and frontend domains)
- `CORS_ALLOWED_ORIGINS` (frontend origin only)
- `CSRF_TRUSTED_ORIGINS` (API + frontend HTTPS origins)
- `SECURE_SSL_REDIRECT=True`
- `RUN_MIGRATIONS=1`
- `RUN_RAG_REINDEX=1` (recommended; refreshes semantic RAG index on deploy)
- `GUNICORN_WORKERS` / `GUNICORN_TIMEOUT`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `AI_EMBEDDING_MODEL`
- `AI_MAX_TOKENS`
- `AI_REQUEST_TIMEOUT_MS`
- `AI_RATE_LIMIT_PER_MIN`
- `AI_INSIGHTS_READ_PER_MIN`
- `VITE_API_URL=https://api.example.com`

Important:

- Keep all secrets only in Coolify env vars, not in git.
- `VITE_API_URL` is a build argument for frontend image; redeploy frontend when it changes.

## 5) Deploy

Trigger deploy from Coolify UI.

## 5.1) Enable Auto-Deploy (Webhook)

You have two practical auto-deploy options in Coolify:

### Option A -- Git push auto-deploy (recommended)

1. In Coolify app settings, enable **Auto Deploy** for your connected repository/branch.
2. Ensure your production branch is the one used by the Compose app.
3. On each push to that branch, Coolify will automatically rebuild and redeploy.

### Option B -- Deploy webhook (external trigger)

Use this when you want deployment from another system (custom CI, script, or manual trigger):

1. In Coolify app settings, copy the **Deploy Webhook URL**.
2. Store it securely as a secret (do not commit it).
3. Trigger deployment with:

```bash
curl -X POST "<coolify-deploy-webhook-url>"
```

For GitHub, you can either:

- keep Option A enabled (simplest), or
- create a GitHub webhook that calls the Coolify deploy webhook on `push` events.

If using a GitHub webhook, set:

- **Content type:** `application/json`
- **Event:** `Just the push event`
- **Secret:** set and verify in an intermediate relay if required by your setup

After deployment, verify:

1. API health:
   - `https://api.example.com/api/health/` returns `{"status":"ok"}`
2. Frontend:
   - `https://frontend.example.com` loads and can call API endpoints.
3. DB migrations:
   - Confirm migration logs from `api` service.
4. AI/RAG readiness:
   - Confirm `api` logs include `reindex_rag` completion (or run manually in Coolify terminal: `python manage.py reindex_rag`)
   - Verify `POST https://api.example.com/api/ai/query/` returns non-empty `meta.retrieval`.

## 6) Production Hardening Checklist

- Enable AWS backups/snapshots for EC2 volume and database data volume.
- Restrict SSH access to your office/VPN IPs.
- Turn on CloudWatch agent or external monitoring.
- Configure Coolify health checks and alerting.
- Use strong random values for `SECRET_KEY`, DB password, Redis password.
- Plan periodic OS package updates and Docker image patching.

## 7) No GitHub Actions Requirement

This setup does not require GitHub Actions. Coolify handles build + deploy directly from the repository.

