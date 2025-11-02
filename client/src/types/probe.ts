// Probe types based on NetView API OpenAPI specification

export type ProbeCategory = 'Uptime' | 'API' | 'Security' | 'Browser';
export type ProbeType = 'ICMP/Ping' | 'HTTP/HTTPS' | 'DNS Resolution' | 'SSL/TLS' | 'Authentication';
export type GatewayType = 'Core' | 'TenantSpecific';
export type ProbeStatus = 'Success' | 'Failure' | 'Warning' | 'unknown';

export interface ProbeCreate {
  name: string;
  description?: string;
  category: ProbeCategory;
  type: ProbeType;
  gateway_type: GatewayType;
  gateway_id?: string | null;
  notification_group_id?: string | null;
  check_interval?: number; // minimum: 60, maximum: 86400, default: 300
  timeout?: number; // minimum: 5, maximum: 300, default: 30
  retries?: number; // minimum: 0, maximum: 10, default: 3
  configuration?: Record<string, any>; // Probe-specific configuration
  is_active?: boolean; // default: true
}

export interface ProbeUpdate {
  name?: string;
  description?: string;
  category?: ProbeCategory;
  type?: ProbeType;
  gateway_type?: GatewayType;
  gateway_id?: string | null;
  notification_group_id?: string | null;
  check_interval?: number;
  timeout?: number;
  retries?: number;
  configuration?: Record<string, any>;
  is_active?: boolean;
}

export interface Probe {
  id: string;
  tenant_id: number;
  name: string;
  description?: string | null;
  category: ProbeCategory;
  type: ProbeType;
  gateway_type: GatewayType;
  gateway_id?: string | null;
  check_interval: number;
  timeout: number;
  retries: number;
  configuration: Record<string, any>;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ProbeResult {
  id: string;
  probe_id: string;
  gateway_id: string;
  tenant_id: number;
  status: ProbeStatus;
  result_data?: Record<string, any>;
  execution_time: number;
  error_message?: string | null;
  checked_at: string;
}

export interface ProbeStatus {
  probe_id: string;
  is_active: boolean;
  last_check?: string | null;
  status: ProbeStatus;
  response_time?: number | null;
  error_message?: string | null;
}

// Response wrapper types
export interface BaseResponse {
  success: boolean;
  timestamp: string;
}

export interface ProbeListResponse extends BaseResponse {
  data: Probe[];
  count: number;
}

export interface ProbeSingleResponse extends BaseResponse {
  data: Probe;
}

export interface ProbeResultsListResponse extends BaseResponse {
  data: ProbeResult[];
  count: number;
}

export interface ProbeStatusResponse extends BaseResponse {
  data: ProbeStatus;
}

export interface ProbeTypesResponse extends BaseResponse {
  data: Record<string, string[]> | string[]; // Category to types mapping OR array of types when filtered
  count: number;
}

export interface ErrorResponse extends BaseResponse {
  success: false;
  message: string;
  code?: string;
  details?: Record<string, any>;
}

// Query parameters for filtering probes
export interface ProbeListParams {
  category?: ProbeCategory;
  probe_type?: ProbeType;
  gateway_type?: GatewayType;
  is_active?: boolean | string;
}

export interface ProbeTypesParams {
  category?: ProbeCategory;
}

export interface ProbeResultsParams {
  limit?: number;
  offset?: number;
}

export interface ProbeHistoryParams {
  days?: number;
}

