import { Link, useLocation } from "react-router-dom";
import {
  Bird,
  LayoutDashboard,
  Search,
  Briefcase,
  Settings,
  Linkedin,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/scan-jobs", label: "Scan Jobs", icon: Search },
  { to: "/results", label: "Results", icon: Briefcase },
  { to: "/accounts", label: "LinkedIn Accounts", icon: Linkedin },
  { to: "/profile", label: "Candidate Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="flex items-center gap-2 px-6 py-5 border-b">
          <Bird className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold tracking-tight">JobBird</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === to || (to !== "/" && pathname.startsWith(to))
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-6 py-4 border-t text-xs text-muted-foreground">
          JobBird v0.1.0
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
