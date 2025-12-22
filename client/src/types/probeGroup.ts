// Probe Group types

export interface ProbeGroupCreate {
  name: string;
  description?: string;
}

export interface ProbeGroupUpdate {
  name?: string;
  description?: string;
}

export interface ProbeGroup {
  id: string;
  tenant_id: number;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Response wrapper types
export interface BaseResponse {
  success: boolean;
  timestamp: string;
}

export interface ProbeGroupListResponse extends BaseResponse {
  data: ProbeGroup[];
  count: number;
}

export interface ProbeGroupSingleResponse extends BaseResponse {
  data: ProbeGroup;
}

