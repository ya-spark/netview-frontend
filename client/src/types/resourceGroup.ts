// Resource Group types

export interface ResourceGroupCreate {
  name: string;
  description?: string;
}

export interface ResourceGroupUpdate {
  name?: string;
  description?: string;
}

export interface ResourceGroup {
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

export interface ResourceGroupListResponse extends BaseResponse {
  data: ResourceGroup[];
  count: number;
}

export interface ResourceGroupSingleResponse extends BaseResponse {
  data: ResourceGroup;
}

