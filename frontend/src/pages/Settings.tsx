import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Server, Database, Cpu, Globe, GitBranch } from "lucide-react";

const services = [
  {
    name: "Backend API",
    provider: "Render",
    url: "https://render.com",
    description: "FastAPI REST backend (free web service, 750h/mo)",
    icon: Server,
    color: "bg-purple-100 text-purple-700",
  },
  {
    name: "Database",
    provider: "Supabase",
    url: "https://supabase.com",
    description: "PostgreSQL database (500MB free tier)",
    icon: Database,
    color: "bg-green-100 text-green-700",
  },
  {
    name: "Task Queue (Broker)",
    provider: "Upstash Redis",
    url: "https://upstash.com",
    description: "Redis queue for Celery tasks (10k cmd/day free)",
    icon: Cpu,
    color: "bg-red-100 text-red-700",
  },
  {
    name: "Frontend",
    provider: "Vercel",
    url: "https://vercel.com",
    description: "React frontend hosting (unlimited free deploys)",
    icon: Globe,
    color: "bg-blue-100 text-blue-700",
  },
  {
    name: "Scraper Worker",
    provider: "Self-hosted VPS",
    url: "",
    description: "Celery worker with Playwright — runs on your own VPS/machine",
    icon: Server,
    color: "bg-gray-100 text-gray-700",
  },
];

const envVars = [
  { key: "DATABASE_URL", desc: "Supabase PostgreSQL connection string (postgresql+asyncpg://...)" },
  { key: "REDIS_URL", desc: "Upstash Redis URL (redis://default:token@host:port)" },
  { key: "ENCRYPTION_KEY", desc: "Fernet key for credential encryption — generate once, keep secret" },
  { key: "GROQ_API_KEY", desc: "Groq API key for AI job scoring — free at console.groq.com (optional — disables scoring if missing)" },
  { key: "GROQ_MODEL", desc: "Model name (default: llama-3.3-70b-versatile)" },
  { key: "AI_SCORE_KEEP_THRESHOLD", desc: "Min score to classify a job as 'matched' (default: 60)" },
  { key: "SCRAPER_MIN_DELAY_S", desc: "Minimum delay between scraper requests in seconds (default: 2.0)" },
  { key: "SCRAPER_MAX_DELAY_S", desc: "Maximum delay between scraper requests in seconds (default: 7.0)" },
  { key: "ALLOWED_ORIGINS", desc: "Comma-separated list of frontend URLs allowed for CORS" },
];

export default function Settings() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Infrastructure, configuration and deployment info</p>
      </div>

      {/* Hosting */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Hosting Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(({ name, provider, url, description, icon: Icon, color }) => (
            <Card key={name}>
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{name}</span>
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center gap-0.5">
                          {provider} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">{provider}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Environment Variables */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground mb-4">
              Configure these in your <code className="bg-muted px-1 rounded text-xs">.env</code> file (backend) and as GitHub Actions secrets for CI/CD deployment.
            </p>
            <div className="space-y-2">
              {envVars.map(({ key, desc }) => (
                <div key={key} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono shrink-0 mt-0.5">{key}</code>
                  <span className="text-sm text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CI/CD */}
      <div>
        <h2 className="text-xl font-semibold mb-4">CI/CD Deployment</h2>
        <Card>
          <CardContent className="pt-5 space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Frontend → Vercel</p>
                <p className="text-muted-foreground">Auto-deploys on push to <code className="bg-muted px-1 rounded text-xs">main</code> via Vercel GitHub integration.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Backend → Render</p>
                <p className="text-muted-foreground">GitHub Actions triggers Render deploy hook on push. Set <code className="bg-muted px-1 rounded text-xs">RENDER_DEPLOY_HOOK_URL</code> in GitHub secrets.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Worker → VPS (SSH deploy)</p>
                <p className="text-muted-foreground">GitHub Actions SSHes into VPS and runs <code className="bg-muted px-1 rounded text-xs">docker compose pull && docker compose up -d</code>. Set <code className="bg-muted px-1 rounded text-xs">VPS_HOST</code>, <code className="bg-muted px-1 rounded text-xs">VPS_USER</code>, <code className="bg-muted px-1 rounded text-xs">VPS_SSH_KEY</code> in GitHub secrets.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
