export type Role = "OWNER" | "RECRUITER" | "INTERVIEWER";
export type Stage = "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "HIRED" | "REJECTED";
export type JobStatus = "DRAFT" | "OPEN" | "CLOSED";
export type WorkType = "ONSITE" | "HYBRID" | "REMOTE";
export type AiStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";
export type Verdict = "met" | "partial" | "missing";
export type Recommendation = "STRONG_NO" | "NO" | "YES" | "STRONG_YES";
export type TemplateKey = "received" | "interview" | "offer" | "rejected";

export interface Company {
  id: string;
  name: string;
  slug: string;
  about: string;
  website: string | null;
  brandColor: string;
}

export interface Me {
  user: { id: string; name: string; email: string };
  role: Role;
  company: Company;
}

export interface Requirement {
  id?: string;
  text: string;
  keywords: string[];
  weight: number;
  mustHave: boolean;
}

export interface Job {
  id: string;
  title: string;
  slug: string;
  department: string;
  location: string;
  workType: WorkType;
  employmentType: string;
  description: string;
  salaryMin: number | null;
  salaryMax: number | null;
  status: JobStatus;
  createdAt: string;
  publishedAt: string | null;
  requirements: (Requirement & { id: string })[];
}

export interface JobListItem extends Omit<Job, "requirements"> {
  applicationCount: number;
  newToday: number;
  avgScore: number | null;
  stages: Partial<Record<Stage, number>>;
}

export interface Card {
  id: string;
  jobId: string;
  stage: Stage;
  rank: number;
  score: number | null;
  aiStatus: AiStatus;
  provider: string | null;
  source: string;
  createdAt: string;
  stageChangedAt: string;
  candidate: { id: string; name: string; email: string; city: string | null };
  skills: string[];
  mustHaveMissing: boolean;
  experienceYears: number | null;
  interviewCount: number;
  noteCount: number;
}

export interface ScoredRequirement extends Requirement {
  id: string;
  verdict: Verdict;
  evidence: string;
}

export interface Analysis {
  score: number;
  summary: string;
  requirements: ScoredRequirement[];
  strengths: string[];
  concerns: string[];
  interviewQuestions: string[];
  experienceYears: number | null;
  skills: string[];
  mustHaveMissing: string[];
  provider: "claude" | "local";
  model?: string;
  durationMs: number;
}

export interface Activity {
  id: string;
  type: "applied" | "stage" | "note" | "scored" | "email" | "interview" | "scorecard";
  data: Record<string, unknown>;
  createdAt: string;
  actor: { id: string; name: string } | null;
}

export interface KitQuestion {
  requirementId: string | null;
  topic: string;
  question: string;
  why: string;
  goodSigns: string[];
  redFlags: string[];
  followUp: string;
}

export interface InterviewKit {
  focus: string;
  questions: KitQuestion[];
  provider: "claude" | "local";
  model?: string;
  generatedAt: string;
}

export type KitAnswers = Record<string, { note: string; signal: "good" | "weak" | null }>;

export interface Scorecard {
  id: string;
  ratings: Record<string, number>;
  recommendation: Recommendation;
  notes: string;
  answers: KitAnswers;
  createdAt: string;
  author: { id: string; name: string };
}

export interface Interview {
  id: string;
  title: string;
  startsAt: string;
  durationMin: number;
  location: string;
  cancelledAt: string | null;
  kit: InterviewKit | null;
  panelists: { user: { id: string; name: string } }[];
  scorecards: Scorecard[];
  hiddenScorecards?: number;
  application?: { id: string; stage: Stage; score: number | null; candidate: { name: string; email: string }; job: { id: string; title: string } };
}

export interface Email {
  id: string;
  to: string;
  subject: string;
  body: string;
  template: TemplateKey;
  status: "QUEUED" | "SENT" | "FAILED";
  createdAt: string;
  sentAt: string | null;
  application?: { id: string; candidate: { name: string }; job: { title: string } } | null;
}

export interface ApplicationDetail {
  id: string;
  stage: Stage;
  score: number | null;
  aiStatus: AiStatus;
  aiError: string | null;
  provider: string | null;
  analysis: Analysis | null;
  source: string;
  coverLetter: string | null;
  cvFileName: string;
  cvMime: string;
  cvText: string;
  rejectReason: string | null;
  createdAt: string;
  stageChangedAt: string;
  candidate: { id: string; name: string; email: string; phone: string | null; city: string | null; linkedin: string | null };
  job: Job;
  activities: Activity[];
  interviews: Interview[];
  emails: Email[];
  otherApplications: { id: string; stage: Stage; score: number | null; createdAt: string; job: { id: string; title: string } }[];
}

export interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Analytics {
  totals: { applications: number; openJobs: number; upcomingInterviews: number; hired: number; avgTimeToHire: number | null; last7: number };
  funnel: { stage: Stage; count: number }[];
  stages: Partial<Record<Stage, number>>;
  sources: { source: string; count: number }[];
  daily: { day: string; count: number }[];
  scores: { label: string; count: number }[];
  providers: { provider: string; count: number }[];
}

export interface Paged<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}
