export type DisasterType = "flood" | "cyclone" | "landslide" | "earthquake" | "fire" | "other";
export type ReportCategory =
  | "trapped"
  | "medical"
  | "road_blocked"
  | "shelter_needed"
  | "food_water_needed"
  | "infrastructure_damage"
  | "other";
export type SeverityLevel = "low" | "medium" | "high" | "critical";
export type ReportStatus = "reported" | "verified" | "rejected" | "pending";

export interface CrowdReportCreate {
  disaster_type: DisasterType;
  category: ReportCategory;
  severity: SeverityLevel;
  description: string;
  latitude: number;
  longitude: number;
  photo_urls: string[];
  reporter_contact?: string;
  source: string;
}

export interface CrowdReport {
  id: string;
  disaster_type: DisasterType;
  category: ReportCategory;
  severity: SeverityLevel;
  status: ReportStatus;
  description: string;
  latitude: number;
  longitude: number;
  photo_urls: string[];
  reporter_contact_masked?: string;
  confidence_score: number;
  source: string;
  created_at: string;
  updated_at: string;
  verified_by?: string;
  verified_at?: string;
  verification_note?: string;
}

export interface CrowdReportListResponse {
  total: number;
  limit: number;
  offset: number;
  items: CrowdReport[];
}

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  count: number;
  critical_count: number;
  verified_count: number;
}

export interface CrowdReportFilters {
  disaster_type?: DisasterType;
  status?: ReportStatus;
  severity?: SeverityLevel;
  min_lat?: number;
  max_lat?: number;
  min_lon?: number;
  max_lon?: number;
  limit?: number;
  offset?: number;
}
