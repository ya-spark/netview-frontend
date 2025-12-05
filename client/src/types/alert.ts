// Alert types based on NetView API OpenAPI specification

export type AlertType = 'Down' | 'Slow' | 'Error';

export interface AlertResponse {
  id: string;
  probe_id: string;
  tenant_id: number;
  type: AlertType;
  message: string;
  consecutive_failures: number;
  is_resolved: boolean;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at: string;
  // Additional fields from joined queries
  probe_name?: string;
  category?: string;
  probe_type?: string;
  gateway_name?: string;
  resolved_by_name?: string;
}

export interface AlertListResponse {
  success: boolean;
  timestamp: string;
  data: AlertResponse[];
  count: number;
}
