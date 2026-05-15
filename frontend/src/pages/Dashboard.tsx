import { useScanJobs } from "@/api/hooks";
import { useJobPosts } from "@/api/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Search, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { formatDate, statusColor } from "@/lib/utils";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { data: scanJobs = [] } = useScanJobs();
  const { data: matchedJobs } = useJobPosts({ status: "matched", page_size: 5 });
  const { data: allJobs } = useJobPosts({ page_size: 1 });

  const running = scanJobs.filter((j) => j.status === "running").length;
  const completed = scanJobs.filter((j) => j.status === "completed").length;
  const totalMatched = scanJobs.reduce((s, j) => s + j.total_matched, 0);
  const totalFound = scanJobs.reduce((s, j) => s + j.total_found, 0);

  const stats = [
    { label: "Total Scan Jobs", value: scanJobs.length, icon: Search, color: "text-blue-600" },
    { label: "Running Now", value: running, icon: Clock, color: "text-yellow-600" },
    { label: "Jobs Scraped", value: totalFound, icon: Briefcase, color: "text-purple-600" },
    { label: "Matched Jobs", value: totalMatched, icon: CheckCircle2, color: "text-green-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your job scanning activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-3xl font-bold mt-1">{value}</p>
                </div>
                <Icon className={`h-8 w-8 ${color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Scan Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Scans</CardTitle>
            <Link to="/scan-jobs" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {scanJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No scan jobs yet. <Link to="/scan-jobs" className="text-primary hover:underline">Create one</Link></p>
            ) : (
              <div className="space-y-3">
                {scanJobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <Link to={`/scan-jobs/${job.id}`} className="font-medium text-sm hover:text-primary">{job.name}</Link>
                      <p className="text-xs text-muted-foreground">{job.keywords} · {job.location}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{job.total_found} found</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(job.status)}`}>{job.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Matched Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top Matched Jobs</CardTitle>
            <Link to="/results?status=matched" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {!matchedJobs?.items.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No matched jobs yet. Run a scan to get started.</p>
            ) : (
              <div className="space-y-3">
                {matchedJobs.items.map((post) => (
                  <div key={post.id} className="flex items-start justify-between py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0 pr-4">
                      <a href={post.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:text-primary truncate block">{post.title}</a>
                      <p className="text-xs text-muted-foreground">{post.company} · {post.location}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-sm font-bold text-green-600">{post.ai_score}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
