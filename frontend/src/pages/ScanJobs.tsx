import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useScanJobs,
  useCreateScanJob,
  useStartScanJob,
  useStopScanJob,
  useDeleteScanJob,
  useLinkedInAccounts,
  useCandidateProfiles,
} from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Play, Square, Trash2, ExternalLink, Loader2, AlertCircle,
} from "lucide-react";
import { formatDate, statusColor } from "@/lib/utils";
import type { ScanJob } from "@/api/types";

const EMPTY_FORM = {
  name: "",
  platform: "linkedin",
  keywords: "",
  location: "",
  remote_filter: "",
  date_posted: "",
  max_results: 100,
  linkedin_account_id: "",
  candidate_profile_id: "",
};

export default function ScanJobs() {
  const { data: scanJobs = [], isLoading } = useScanJobs();
  const { data: accounts = [] } = useLinkedInAccounts();
  const { data: profiles = [] } = useCandidateProfiles();

  const createMutation = useCreateScanJob();
  const startMutation = useStartScanJob();
  const stopMutation = useStopScanJob();
  const deleteMutation = useDeleteScanJob();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createMutation.mutateAsync({
        ...form,
        max_results: Number(form.max_results),
        linkedin_account_id: form.linkedin_account_id || undefined,
        candidate_profile_id: form.candidate_profile_id || undefined,
        remote_filter: form.remote_filter || undefined,
        date_posted: form.date_posted || undefined,
      } as any);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStart = (id: string) => startMutation.mutate(id);
  const handleStop = (id: string) => stopMutation.mutate(id);
  const handleDelete = (id: string) => {
    if (confirm("Delete this scan job?")) deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scan Jobs</h1>
          <p className="text-muted-foreground mt-1">Configure and run LinkedIn job scanners</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          New Scan Job
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Scan Job</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input placeholder="e.g. Senior React Developer - Paris" value={form.name} onChange={(e) => set("name", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={(v) => set("platform", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Keywords *</Label>
                <Input placeholder="e.g. React developer, TypeScript" value={form.keywords} onChange={(e) => set("keywords", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Location *</Label>
                <Input placeholder="e.g. Paris, France" value={form.location} onChange={(e) => set("location", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Remote Filter</Label>
                <Select value={form.remote_filter} onValueChange={(v) => set("remote_filter", v)}>
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date Posted</Label>
                <Select value={form.date_posted} onValueChange={(v) => set("date_posted", v)}>
                  <SelectTrigger><SelectValue placeholder="Any time" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any time</SelectItem>
                    <SelectItem value="24h">Past 24 hours</SelectItem>
                    <SelectItem value="week">Past week</SelectItem>
                    <SelectItem value="month">Past month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Max Results</Label>
                <Input type="number" min={10} max={500} value={form.max_results} onChange={(e) => set("max_results", parseInt(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>LinkedIn Account *</Label>
                <Select value={form.linkedin_account_id} onValueChange={(v) => set("linkedin_account_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.label} ({a.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Candidate Profile (for AI scoring)</Label>
                <Select value={form.candidate_profile_id} onValueChange={(v) => set("candidate_profile_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select profile" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="md:col-span-2 flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" /> {error}
                </div>
              )}

              <div className="md:col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Scan Job
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Scan Jobs List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : scanJobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No scan jobs yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {scanJobs.map((job: ScanJob) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/scan-jobs/${job.id}`} className="font-semibold hover:text-primary">{job.name}</Link>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(job.status)}`}>{job.status}</span>
                      {job.status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {job.keywords} · {job.location}
                      {job.remote_filter && ` · ${job.remote_filter}`}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{job.total_found} scraped</span>
                      <span>{job.total_scored} scored</span>
                      <span className="text-green-600 font-medium">{job.total_matched} matched</span>
                      {job.completed_at && <span>Completed {formatDate(job.completed_at)}</span>}
                    </div>
                    {job.error_message && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {job.error_message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {job.total_matched > 0 && (
                      <Link to={`/results?scan_job_id=${job.id}&status=matched`}>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-3.5 w-3.5" /> Results
                        </Button>
                      </Link>
                    )}
                    {job.status !== "running" ? (
                      <Button size="sm" onClick={() => handleStart(job.id)} disabled={startMutation.isPending}>
                        <Play className="h-3.5 w-3.5" /> Start
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => handleStop(job.id)}>
                        <Square className="h-3.5 w-3.5" /> Stop
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(job.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
