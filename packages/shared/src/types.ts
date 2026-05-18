// ============================
// Shared Types for B2B Lead Gen
// ============================

// --- Enums ---
export type LeadSourceType = 'apollo' | 'hunter' | 'snovio' | 'mailscout' | 'emailall' | 'google_search' | 'manual_import' | 'csv_import';
export type EmailVerificationStatus = 'pending' | 'valid' | 'invalid' | 'risky' | 'unknown';
export type CampaignContactStatus = 'pending' | 'sent' | 'opened' | 'clicked' | 'replied' | 'unsubscribed' | 'bounced';
export type InboxThreadStatus = 'new' | 'follow_up' | 'closed_won' | 'closed_lost' | 'spam';
export type EmailChannelProvider = 'brevo' | 'resend' | 'mailgun' | 'mailjet';
export type UserRole = 'admin' | 'manager' | 'sales';

// --- Tenant ---
export interface TenantDTO {
  id: string;
  name: string;
  plan: string;
  status: string;
  createdAt: string;
}

// --- Company ---
export interface CompanyDTO {
  id: string;
  tenantId: string;
  name: string;
  domain: string;
  industry: string | null;
  country: string | null;
  size: string | null;
  website: string | null;
  customsSource: string | null;
  score: number;
  createdAt: string;
}

// --- Contact ---
export interface ContactDTO {
  id: string;
  tenantId: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  verificationStatus: EmailVerificationStatus;
  patternMatched: boolean;
  score: number;
  status: string;
  source: LeadSourceType;
  createdAt: string;
}

// --- Email Template ---
export interface EmailTemplateDTO {
  id: string;
  tenantId: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  language: string;
  createdAt: string;
}

// --- Campaign ---
export interface CampaignDTO {
  id: string;
  tenantId: string;
  name: string;
  industryFilter: string[];
  countryFilter: string[];
  status: 'draft' | 'running' | 'paused' | 'completed';
  templateId: string | null;
  dailyLimit: number;
  timeWindow: { start: string; end: string };
  createdAt: string;
}

// --- Inbox Thread ---
export interface InboxThreadDTO {
  id: string;
  tenantId: string;
  contactId: string | null;
  campaignId: string | null;
  subject: string;
  lastMessageAt: string;
  status: InboxThreadStatus;
  assignedUserId: string | null;
  isHotLead: boolean;
  createdAt: string;
}

// --- Send Channel ---
export interface SendChannelDTO {
  id: string;
  tenantId: string;
  provider: EmailChannelProvider;
  dailyLimit: number;
  dailySent: number;
  status: 'active' | 'paused' | 'exhausted';
  createdAt: string;
}

// --- Daily Stats ---
export interface DailyStatsDTO {
  id: string;
  tenantId: string;
  date: string;
  collectedCount: number;
  verifiedCount: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  repliedCount: number;
  bouncedCount: number;
  hotLeadCount: number;
}

// --- API Payloads ---
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export interface CollectionRequest {
  industry: string;
  country: string;
  keywords: string[];
  sources: LeadSourceType[];
  companyDomains?: string[];
}

export interface DashboardResponse {
  todayStats: DailyStatsDTO;
  funnel: {
    collected: number;
    verified: number;
    sent: number;
    opened: number;
    replied: number;
    hotLeads: number;
  };
  trends: Array<{ date: string; sent: number; replied: number }>;
}
