# ERMS (EngInventory) API

Django REST API for the Engineering Resource Management System.
Backed by PostgreSQL and Redis, containerised with Docker, and designed for deployment on AWS (ECS Fargate + RDS + ElastiCache).

---

## Quick Start (Docker Compose)

```bash
# From the repository root:
docker compose up --build
```

This starts three services:

| Service | Port | Purpose |
|---------|------|---------|
| `db`    | 5432 | PostgreSQL 16 |
| `redis` | 6379 | Redis 7 (caching) |
| `api`   | 8000 | Django / Gunicorn |

Once healthy, run migrations and (optionally) seed the database:

```bash
docker compose exec api python manage.py migrate
docker compose exec api python manage.py seed
```

API base URL: `http://localhost:8000/api/`

Health check: `GET http://localhost:8000/api/health/`

Django admin: `http://localhost:8000/admin/`

---

## Environment Variables

Documented in `.env.example`. Override in `.env` or via `docker-compose.yml` / ECS task definition.

| Variable | Default (Compose) | Description |
|----------|-------------------|-------------|
| `DATABASE_URL` | `postgres://erms:erms@db:5432/erms` | PostgreSQL connection URI |
| `REDIS_URL` | `redis://redis:6379/1` | Redis connection URI |
| `SECRET_KEY` | dev placeholder | Django secret key |
| `DEBUG` | `True` | Set `False` in production |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated hostnames |
| `CORS_ALLOWED_ORIGINS` | (see defaults in `settings.py`) | Comma-separated frontend origins. With `DEBUG=True`, local defaults (5173 + 8080) are merged in so one port in `.env` does not block the other. |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health/` | Health check (returns `{"status":"ok"}`) |
| GET | `/api/inventory/` | List inventory (`?q=`, `?category=`) |
| GET | `/api/inventory/<id>/` | Get one item |
| POST | `/api/inventory/` | Create item |
| PATCH | `/api/inventory/<id>/` | Update item |
| DELETE | `/api/inventory/<id>/` | Delete item |
| GET | `/api/suppliers/` | List suppliers |
| GET | `/api/suppliers/<id>/` | Get one supplier |
| POST | `/api/suppliers/` | Create supplier |
| PATCH | `/api/suppliers/<id>/` | Update supplier |
| DELETE | `/api/suppliers/<id>/` | Delete supplier |
| GET | `/api/requests/` | List requests (`?status=`) |
| POST | `/api/requests/` | Create request (status = Pending) |
| GET | `/api/requests/<id>/` | Get one request |
| PATCH | `/api/requests/<id>/` | Update status (Approved / Rejected / Issued) |
| GET | `/api/borrowed/` | List borrowed items (`?status=`) |
| GET | `/api/borrowed/<id>/` | Get one borrowed item |
| PATCH | `/api/borrowed/<id>/` | Return (`action: "return"`) or extend (`expectedReturnDate`) |
| GET | `/api/activity/` | List activity log (`?limit=`) |
| **Reports** | | |
| GET | `/api/reports/monthly-usage/` | Monthly usage by category (for charts / exports) |
| GET | `/api/reports/borrow-leaderboard/` | Borrow demand leaderboard (`?limit=10`) |
| **AI Insights** | | |
| POST | `/api/ai/query/` | Natural-language Q&A grounded in live data |
| GET | `/api/ai/insights/` | List active AI-generated insights |
| POST | `/api/ai/insights/` | Generate fresh insights via OpenAI |
| PATCH | `/api/ai/insights/<id>/feedback/` | Submit feedback on an insight |
| POST | `/api/ai/simulate-reorder/` | What-if reorder simulation for an item |
| GET | `/api/ai/suggestions/` | List AI-generated action suggestions |
| PATCH | `/api/ai/suggestions/<id>/` | Approve / reject / execute a suggestion |
| GET | `/api/ai/usage/` | Token/cost usage stats |
| **Analytics** | | |
| GET | `/api/analytics/kpi/` | Latest KPI snapshot (or computed live) |
| GET | `/api/analytics/kpi/history/` | KPI trend data (`?days=`) |
| GET | `/api/analytics/movements/` | Recent inventory movements |
| GET | `/api/analytics/demand/` | Demand signals for forecasting |
| GET | `/api/analytics/supplier-performance/` | Supplier performance records |
| GET | `/api/analytics/stock-health/` | Live stock health breakdown |
| **Alerts** | | |
| GET | `/api/alerts/` | List alerts (`?status=`, `?severity=`, `?type=`) |
| PATCH | `/api/alerts/<id>/` | Acknowledge / resolve / dismiss an alert |
| GET | `/api/alerts/risks/` | Current risk scores |
| POST | `/api/alerts/compute/` | Trigger risk computation |

Responses use **camelCase** keys to match the frontend TypeScript types.

---

## Project Structure

```
apps/api/
  config/       Django settings, root URLs, WSGI
  core/         Management commands (seed)
  suppliers/    Supplier model + CRUD
  inventory/    InventoryItem model + CRUD (FK to Supplier)
  item_requests/ ItemRequest model; create + status transitions (Issue flow)
  borrowed/     BorrowedItem model; list + return/extend
  activity/     ActivityEntry model; read-only log
```

---

## AWS Deployment

The recommended production topology:

```
ALB (HTTPS :443)  -->  ECS Fargate (Django/Gunicorn :8000)
                            |               |
                       RDS PostgreSQL   ElastiCache Redis
```

### Step-by-step

1. **VPC** — Private subnets for RDS, ElastiCache, and ECS tasks. Public subnets for the ALB.

2. **RDS PostgreSQL** — Create an instance; allow inbound 5432 from the ECS security group only.

3. **ElastiCache Redis** — Same pattern; allow inbound 6379 from the ECS security group only.

4. **ECR** — Build and push the Docker image:
   ```bash
   cd apps/api
   docker build -t <account>.dkr.ecr.<region>.amazonaws.com/erms-api:latest .
   docker push <account>.dkr.ecr.<region>.amazonaws.com/erms-api:latest
   ```

5. **ECS Fargate** — Create a task definition with:
   - Container image from ECR
   - Environment variables or AWS Secrets Manager references for `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`
   - `DEBUG=False`, `ALLOWED_HOSTS=<alb-dns>,<custom-domain>`
   - `CORS_ALLOWED_ORIGINS=https://app.yourdomain.com` (your static frontend origin(s))
   - Port mapping: 8000
   - Health check path: `/api/health/`

6. **ALB** — Listener on 443 (ACM certificate) forwarding to the ECS target group on port 8000.

7. **Migrations** — Run as a one-off ECS task or CI step:
   ```bash
   python manage.py migrate
   ```

8. **Seed** (optional, first deploy only):
   ```bash
   python manage.py seed
   ```

### Frontend

The frontend is deployed independently (e.g. Netlify, S3 + CloudFront, your own static host).
Set `VITE_API_URL` to the ALB's public HTTPS URL (no trailing slash):

```
VITE_API_URL=https://api.yourdomain.com
```

---

## Local Development Without Docker

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
```

Without `DATABASE_URL` set, Django falls back to SQLite. Without `REDIS_URL`, caching uses local memory. This is fine for quick iteration but does not match production behaviour.

```bash
python manage.py migrate
python manage.py seed
python manage.py runserver
```
