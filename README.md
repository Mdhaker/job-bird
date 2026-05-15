# JobBird 🐦

> Smart job scanner with LinkedIn scraping, AI scoring, and automated workflows.

## Architecture

```
[Vercel - React Frontend]
        │
        ▼ REST API
[Render - FastAPI Backend] ──── [Supabase - PostgreSQL]
        │
        ▼ Celery tasks
[Upstash - Redis Queue]
        │
        ▼ worker polls
[VPS - Celery Worker + Playwright]
```

## CI/CD Pipeline (GitHub Actions)

Three workflows trigger on push to `main`:

| Workflow | Trigger path | Steps |
|---|---|---|
| `deploy-backend.yml` | `backend/**` | Build API image → GHCR → Run migrations → Trigger Render |
| `deploy-worker.yml` | `backend/**`, `worker/**` | Build worker image → GHCR → SSH VPS → docker compose pull & up |
| `deploy-frontend.yml` | `frontend/**` | npm ci → build → deploy to Vercel |

---

## One-Time Cloud Setup

### 1. Supabase (Database)

1. Create a new project at https://supabase.com
2. Go to **Project Settings → Database → Connection string** → choose **URI** mode
3. Switch the scheme from `postgres://` to `postgresql+asyncpg://`
4. Copy the **Transaction** pooler URI (port 6543) — this is your `DATABASE_URL`

### 2. Upstash (Redis Queue)

1. Create a Redis database at https://upstash.com
2. Copy the **Redis URL** (starts with `redis://default:...`) — this is your `REDIS_URL`

### 3. Render (Backend API)

1. Go to https://render.com → **New → Blueprint**
2. Connect your GitHub repo — Render will auto-detect `render.yaml` and create the service
3. After service is created, go to the service → **Settings → Deploy Hook** → copy the URL
4. Set all environment variables in Render Dashboard → **Environment** (see list below)
5. Set `autoDeploy: false` in `render.yaml` is already set — Render will only deploy when triggered by CI

### 4. Vercel (Frontend)

1. Go to https://vercel.com → **New Project** → import your GitHub repo
2. Set **Root Directory** to `frontend`
3. Add environment variable: `VITE_API_URL` = your Render service URL (e.g. `https://jobbird-api.onrender.com`)
4. From **Project Settings → General** copy:
   - **Project ID** → `VERCEL_PROJECT_ID`
5. From **Account Settings → Tokens** create a token → `VERCEL_TOKEN`
6. From **Account Settings → General** copy your **Team ID** (or personal account ID) → `VERCEL_ORG_ID`

### 5. VPS (Celery Worker)

SSH into your VPS and run these commands once:

```bash
# Install Docker + Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# Clone the repo
git clone https://github.com/YOUR_USER/jobbird.git ~/jobbird
cd ~/jobbird

# Create .env from example and fill in all values
cp backend/.env.example .env
nano .env   # fill in DATABASE_URL, REDIS_URL, ENCRYPTION_KEY, OPENAI_API_KEY

# Create the ~/jobbird directory that CI expects
mkdir -p ~/jobbird
```

The CI will handle all future deploys via SSH.

### 6. GitHub Secrets

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Where to get it |
|---|---|
| `DATABASE_URL` | Supabase → Connection URI (asyncpg scheme) |
| `REDIS_URL` | Upstash → Redis URL |
| `ENCRYPTION_KEY` | Generate: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| `SECRET_KEY` | Any random string (32+ chars) |
| `RENDER_DEPLOY_HOOK_URL` | Render → Service → Settings → Deploy Hook |
| `VPS_HOST` | Your VPS IP address |
| `VPS_USER` | SSH username (`ubuntu`, `root`, etc.) |
| `VPS_SSH_KEY` | Private SSH key in PEM format (the one whose public key is in VPS `~/.ssh/authorized_keys`) |
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel → Account Settings → General → Your ID |
| `VERCEL_PROJECT_ID` | Vercel → Project Settings → General → Project ID |
| `VITE_API_URL` | Your Render service URL e.g. `https://jobbird-api.onrender.com` |

### 7. First Deploy

Once all secrets are set, push to `main`:

```bash
git add .
git commit -m "feat: initial deployment"
git push origin main
```

All three workflows will run automatically. Monitor progress in the **Actions** tab.

---

## Generating the Encryption Key

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Run this once and save the output as `ENCRYPTION_KEY`. Never regenerate it — existing encrypted credentials will be unreadable.

---

## Features (v1)

- [x] LinkedIn job scraping with anti-detection (Playwright stealth, rate limiting, session persistence)
- [x] Configurable scan jobs (keywords, location, remote filter, date posted)
- [x] AI-powered job scoring via OpenAI (GPT-4o-mini)
- [x] Candidate profile + CV upload
- [x] Job results with match score, strengths/gaps, apply link
- [x] Manual status management (matched / archived / applied)
- [x] Fully automated CI/CD via GitHub Actions

## Roadmap

- [ ] Automated application submission (Easy Apply)
- [ ] AI-generated tailored CV + motivation letter
- [ ] Email monitoring for recruiter responses
- [ ] Indeed / other platform support
- [ ] Real-time scraping progress via WebSockets
- [ ] Proxy pool support
