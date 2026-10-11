/** Client-safe enums and labels shared by the database, validation and UI. */

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "site_visit_scheduled",
  "site_assessed",
  "final_quote_issued",
  "negotiation",
  "won",
  "lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  site_visit_scheduled: "Site Visit Scheduled",
  site_assessed: "Site Assessed",
  final_quote_issued: "Final Quote Issued",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const LEAD_SOURCES = ["online_quotation", "site_assessment_form", "contact_form", "manual"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  online_quotation: "Online quotation",
  site_assessment_form: "Site assessment form",
  contact_form: "Contact form",
  manual: "Manual entry",
};

export const SITE_VISIT_STATUSES = ["requested", "scheduled", "completed", "cancelled"] as const;
export type SiteVisitStatus = (typeof SITE_VISIT_STATUSES)[number];

export const PROJECT_CATEGORIES = [
  "residential",
  "commercial",
  "driveways",
  "walkways",
  "courtyards",
  "parking_areas",
  "landscaping",
  "other",
] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  residential: "Residential",
  commercial: "Commercial",
  driveways: "Driveways",
  walkways: "Walkways",
  courtyards: "Courtyards",
  parking_areas: "Parking Areas",
  landscaping: "Landscaping",
  other: "Other Projects",
};

/** Size buckets used by the admin dashboard filter. */
export const PROJECT_SIZE_BUCKETS = {
  small: { label: "Under 100 SQM", min: 0, max: 100 },
  medium: { label: "100 – 500 SQM", min: 100, max: 500 },
  large: { label: "500 – 2,000 SQM", min: 500, max: 2000 },
  xlarge: { label: "Over 2,000 SQM", min: 2000, max: Number.MAX_SAFE_INTEGER },
} as const;
export type ProjectSizeBucket = keyof typeof PROJECT_SIZE_BUCKETS;
