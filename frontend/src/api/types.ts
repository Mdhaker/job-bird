export type Platform = "linkedin" | "indeed";

export type ScanStatus = "pending" | "running" | "paused" | "completed" | "failed";

export type JobStatus = "new" | "matched" | "archived" | "applied";

export interface LinkedInAccount {
  id: string;
  label: string;
  email: string;
  is_active: boolean;
  is_blocked: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface CandidateProfile {
  id: string;
  name: string;
  title: string | null;
  summary: string | null;
  skills: string[];
  experience_years: number | null;
  languages: string[];
  cv_filename: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScanJob {
  id: string;
  name: string;
  platform: Platform;
  status: ScanStatus;
  keywords: string;
  location: string;
  remote_filter: string | null;
  experience_level: string[];
  job_type: string[];
  date_posted: string | null;
  max_results: number;
  linkedin_account_id: string | null;
  candidate_profile_id: string | null;
  celery_task_id: string | null;
  error_message: string | null;
  total_found: number;
  total_scored: number;
  total_matched: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobPost {
  id: string;
  scan_job_id: string;
  platform: string;
  external_id: string;
  url: string;
  company_url: string | null;
  title: string;
  company: string;
  location: string | null;
  is_remote: boolean;
  job_type: string | null;
  experience_level: string | null;
  salary_range: string | null;
  description: string | null;
  skills_required: string[];
  is_easy_apply: boolean;
  posted_at: string | null;
  ai_score: number | null;
  ai_summary: string | null;
  ai_strengths: string[];
  ai_gaps: string[];
  ai_evaluated_at: string | null;
  status: JobStatus;
  scraped_at: string;
  created_at: string;
}

export interface JobPostList {
  items: JobPost[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
