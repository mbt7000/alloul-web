// Account Types
export type AccountType = 'job_applicant' | 'company';

export interface JobApplicantProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  resume_url?: string;
  bio?: string;
  created_at: string;
}

export interface CompanyProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  username: string;
  company_type: string;
  description: string;
  logo_url?: string;
  website?: string;
  subscription_tier: 'free' | 'basic' | 'premium';
  subscription_expires: string;
  employees_count: number;
  created_at: string;
}

export interface CompanyEmployee {
  id: string;
  company_id: string;
  user_id: string;
  email: string;
  name: string;
  role: string;
  added_at: string;
}
