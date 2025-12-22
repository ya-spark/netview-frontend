// Gateway types based on NetView API OpenAPI specification

export interface GatewayCreate {
  name: string;
  type: 'Core' | 'TenantSpecific';
  location?: string;
  ip_address?: string;
  platform?: string;
  version?: string;
  resource_group?: string; // Defaults to "default" or "core" for core tenant
}

export interface GatewayUpdate {
  name?: string;
  location?: string;
  ip_address?: string;
  platform?: string;
  version?: string;
  resource_group?: string;
}

export interface GatewayResponse {
  id: string;
  tenant_id: number;
  name: string;
  type: 'Core' | 'TenantSpecific';
  location?: string;
  ip_address?: string;
  platform?: string;
  version?: string;
  status: 'pending' | 'registered' | 'active' | 'revoked';
  is_online: boolean;
  last_heartbeat?: string;
  auth_token_prefix?: string;
  resource_group: string;
  created_at: string;
  updated_at: string;
  system_info?: GatewaySystemInfo;  // Optional system information
}

export interface GatewayRegistrationRequest {
  registration_key: string;
  gateway_id: string;
}

export interface GatewayRegistrationResponse {
  auth_token: string;
  gateway: GatewayResponse;
  message: string;
}

export interface GatewayResultsSubmission {
  results: GatewayProbeResult[];
}

export interface GatewayProbeResult {
  probe_id: string;
  status: 'Success' | 'Failure' | 'Warning';
  result_data?: Record<string, any>;
  execution_time: number;
  error_message?: string;
  checked_at?: string;
}

export interface GatewayHeartbeat {
  status: string;
  data?: Record<string, any>;
}

// Response wrapper types
export interface BaseResponse {
  success: boolean;
  timestamp: string;
}

export interface GatewayListResponse extends BaseResponse {
  data: GatewayResponse[];
  count: number;
}

export interface GatewaySingleResponse extends BaseResponse {
  data: GatewayResponse;
  registration_key?: string;
  message?: string;
}

export interface ErrorResponse extends BaseResponse {
  success: false;
  message: string;
  code?: string;
  details?: Record<string, any>;
}

// Registration key response
export interface RegistrationKeyResponse extends BaseResponse {
  data: {
    registration_key: string;
  };
}

// Audit log types
export interface AuditLog {
  id: string;
  gateway_id: string;
  action: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface AuditLogListResponse extends BaseResponse {
  data: AuditLog[];
  count: number;
}

// Gateway System Information
export interface GatewaySystemInfo {
  gateway_id: string;
  cpu_usage: number;  // 0-100 percentage
  memory_total: number;  // bytes
  memory_used: number;  // bytes
  memory_free: number;  // bytes
  disk_total: number;  // bytes
  disk_used: number;  // bytes
  disk_free: number;  // bytes
  logs_size: number;  // bytes
  db_size: number;  // bytes
  updated_at: string;  // ISO timestamp
}

// Storage Breakdowns
export interface LogsBreakdown {
  [key: string]: number;  // log type -> size in bytes
}

export interface DbBreakdown {
  [key: string]: number;  // db file path -> size in bytes
}

