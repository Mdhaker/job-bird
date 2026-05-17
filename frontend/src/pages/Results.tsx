import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useJobPosts, useScanJobs, useUpdateJobStatus } from "@/api/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ExternalLink, MapPin, Building2, Briefcase, Zap, TrendingUp,
  ChevronLeft, ChevronRight, Loader2, CheckCircle2, Archive,
} from "lucide-react";
import { formatDate, scoreColor } from "@/lib/utils";
import type { JobStatus } from "@/api/types";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "matched", label: "Matched" },
  { value: "new", label: "New" },
  { value: "archived", label: "Archived" },
  { value: "applied", label: "Applied" },
];

export default function Results() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);

  const scanJobId = searchParams.get("scan_job_id") || undefined;
  const statusFilter = (searchParams.get("status") || "") as JobStatus | "";

  const { data: scanJobs = [] } = useScanJobs();
  const { data, isLoading } = useJobPosts({
    scan_job_id: scanJobId,
    status: statusFilter || undefined,
    page,
    page_size: 20,
  });

  const updateStatus = useUpdateJobStatus();

  const handleStatusFilter = (v: string) => {
    setPage(1);
    const p = new URLSearchParams(searchParams);
    if (v) p.set("status", v); else p.delete("status");
    setSearchParams(p);
  };

  const handleScanFilter = (v: string) => {
    setPage(1);
    const p = new URLSearchParams(searchParams);
    if (v) p.set("scan_job_id", v); else p.delete("scan_job_id");
    setSearchParams(p);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Results</h1>
        <p className="text-muted-foreground mt-1">Browse and manage scraped job matches</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={scanJobId || ""} onValueChange={handleScanFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="All scan jobs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All scan jobs</SelectItem>
            {scanJobs.map((j) => (
              <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {data && (
          <span className="text-sm text-muted-foreground self-center">{data.total} jobs found</span>
        )}
      </div>

      {/* Job Cards */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : !data?.items.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No jobs found for the selected filters.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {data.items.map((post) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  {/* Score */}
                  <div className="shrink-0 text-center w-14">
                    {post.ai_score != null ? (
                      <>
                        <div className={`text-2xl font-bold ${scoreColor(post.ai_score)}`}>{post.ai_score}</div>
                        <div className="text-xs text-muted-foreground">score</div>
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground pt-2">—</div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold hover:text-primary flex items-center gap-1"
                        >
                          {post.title}
                          <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                        </a>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{post.company}</span>
                          {post.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{post.location}</span>}
                          {post.job_type && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{post.job_type}</span>}
                          {post.is_easy_apply && (
                            <span className="flex items-center gap-1 text-blue-600"><Zap className="h-3.5 w-3.5" />Easy Apply</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {post.status === "matched" && <Badge variant="success">Matched</Badge>}
                        {post.status === "archived" && <Badge variant="secondary">Archived</Badge>}
                        {post.status === "applied" && <Badge variant="info">Applied</Badge>}
                        {post.status === "new" && <Badge variant="outline">New</Badge>}
                      </div>
                    </div>

                    {/* AI Summary */}
                    {post.ai_summary && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{post.ai_summary}</p>
                    )}

                    {/* Strengths / Gaps */}
                    {((post.ai_strengths?.length || 0) > 0 || (post.ai_gaps?.length || 0) > 0) && (
                      <div className="flex gap-4 mt-2 flex-wrap">
                        {(post.ai_strengths?.length || 0) > 0 && (
                          <div className="text-xs">
                            <span className="text-green-600 font-medium">✓ </span>
                            {post.ai_strengths?.slice(0, 2).join(" · ")}
                          </div>
                        )}
                        {(post.ai_gaps?.length || 0) > 0 && (
                          <div className="text-xs">
                            <span className="text-yellow-600 font-medium">△ </span>
                            {post.ai_gaps?.slice(0, 2).join(" · ")}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      {post.status !== "matched" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: post.id, status: "matched" })}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Keep
                        </Button>
                      )}
                      {post.status !== "archived" && (
                        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => updateStatus.mutate({ id: post.id, status: "archived" })}>
                          <Archive className="h-3.5 w-3.5" /> Archive
                        </Button>
                      )}
                      {post.status !== "applied" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: post.id, status: "applied" })}>
                          <TrendingUp className="h-3.5 w-3.5" /> Mark Applied
                        </Button>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">{formatDate(post.scraped_at)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {data.total_pages}</span>
              <Button variant="outline" size="sm" disabled={page >= data.total_pages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
