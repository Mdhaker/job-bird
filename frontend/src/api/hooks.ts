import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type {
  LinkedInAccount,
  CandidateProfile,
  ScanJob,
  JobPost,
  JobPostList,
  JobStatus,
} from "./types";

// ── LinkedIn Accounts ──────────────────────────────────────────────────────────

export function useLinkedInAccounts() {
  return useQuery<LinkedInAccount[]>({
    queryKey: ["linkedin-accounts"],
    queryFn: () => apiClient.get("/linkedin-accounts/").then((r) => r.data),
  });
}

export function useCreateLinkedInAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { label: string; email: string; password: string }) =>
      apiClient.post("/linkedin-accounts/", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["linkedin-accounts"] }),
  });
}

export function useDeleteLinkedInAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/linkedin-accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["linkedin-accounts"] }),
  });
}

// ── Candidate Profiles ─────────────────────────────────────────────────────────

export function useCandidateProfiles() {
  return useQuery<CandidateProfile[]>({
    queryKey: ["candidate-profiles"],
    queryFn: () => apiClient.get("/candidate-profiles/").then((r) => r.data),
  });
}

export function useCreateCandidateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CandidateProfile>) =>
      apiClient.post("/candidate-profiles/", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["candidate-profiles"] }),
  });
}

export function useUpdateCandidateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CandidateProfile> }) =>
      apiClient.patch(`/candidate-profiles/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["candidate-profiles"] }),
  });
}

export function useUploadCV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      return apiClient
        .post(`/candidate-profiles/${id}/upload-cv`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["candidate-profiles"] }),
  });
}

// ── Scan Jobs ──────────────────────────────────────────────────────────────────

export function useScanJobs() {
  return useQuery<ScanJob[]>({
    queryKey: ["scan-jobs"],
    queryFn: () => apiClient.get("/scan-jobs/").then((r) => r.data),
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasRunning = data?.some((j) => j.status === "running" || j.status === "pending");
      return hasRunning ? 5000 : false;
    },
  });
}

export function useScanJob(id: string) {
  return useQuery<ScanJob>({
    queryKey: ["scan-jobs", id],
    queryFn: () => apiClient.get(`/scan-jobs/${id}`).then((r) => r.data),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "running" || status === "pending" ? 3000 : false;
    },
    enabled: !!id,
  });
}

export function useCreateScanJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ScanJob>) =>
      apiClient.post("/scan-jobs/", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scan-jobs"] }),
  });
}

export function useStartScanJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/scan-jobs/${id}/start`).then((r) => r.data),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["scan-jobs"] });
      qc.invalidateQueries({ queryKey: ["scan-jobs", id] });
    },
  });
}

export function useStopScanJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/scan-jobs/${id}/stop`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scan-jobs"] }),
  });
}

export function useDeleteScanJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/scan-jobs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scan-jobs"] }),
  });
}

// ── Job Posts ──────────────────────────────────────────────────────────────────

export function useJobPosts(params: {
  scan_job_id?: string;
  status?: JobStatus;
  min_score?: number;
  location?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery<JobPostList>({
    queryKey: ["job-posts", params],
    queryFn: () =>
      apiClient
        .get("/job-posts/", { params: { ...params } })
        .then((r) => r.data),
    enabled: true,
  });
}

export function useJobPost(id: string) {
  return useQuery<JobPost>({
    queryKey: ["job-posts", id],
    queryFn: () => apiClient.get(`/job-posts/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useUpdateJobStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobStatus }) =>
      apiClient
        .patch(`/job-posts/${id}/status`, null, { params: { new_status: status } })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-posts"] }),
  });
}
