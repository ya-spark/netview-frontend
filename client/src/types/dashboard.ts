// Dashboard types based on NetView API OpenAPI specification

// Base response wrapper types
export interface BaseResponse {
  success: boolean;
  timestamp: string;
}

export interface DashboardStatsResponse {
  total_probes: number;
  active_probes: number;
  total_alerts: number;
  unresolved_alerts: number;
  total_gateways: number;
  online_gateways: number;
  success_rate: number;
  recent_activity: number;
  // Billing/Credit information
  credits_limit: number;
  credits_used: number;
  credits_remaining: number;
  monthly_spending: number;
  billing_tier: string;
}

export interface DashboardSingleResponse extends BaseResponse {
  data: DashboardStatsResponse;
}
