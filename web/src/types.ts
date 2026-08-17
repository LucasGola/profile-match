export type Seniority = 'junior' | 'mid' | 'senior';

export interface Weights {
  stack: number;
  seniority: number;
  remote: number;
  keywords: number;
}

export interface SeniorityTerms {
  senior: string[];
  mid: string[];
  junior: string[];
}

export interface Matching {
  fuzzyThreshold: number;
  unknownSeniorityScore: number;
  seniorityTerms: SeniorityTerms;
  remoteTerms: string[];
}

export interface Profile {
  stack: string[];
  seniority: Seniority | null;
  keywords: string[];
  remote: boolean;
  weights: Weights;
  matching: Matching;
}

export interface BreakdownItem {
  criterion: string;
  score: number;
  weight: number;
  contribution: number;
  detail: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  url: string;
  location: string | null;
  score: number | null;
  scoreBreakdown: BreakdownItem[] | null;
  firstSeenAt: string;
  notifiedAt: string | null;
}

export interface JobsResponse {
  data: Job[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Stats {
  total: number;
  notified: number;
  byScoreBucket: { bucket: string; count: number }[];
  bySource: { source: string; count: number }[];
  byDay: { date: string; count: number }[];
}
