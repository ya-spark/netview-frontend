// Collaborator types based on NetView Collaborators API specification

export interface Collaborator {
  id: string; // UUID
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'SuperAdmin' | 'Owner' | 'Admin' | 'Editor' | 'Viewer';
  isActive: boolean;
  createdAt: string; // ISO 8601 date string
}

export interface CollaboratorCreate {
  email: string; // required
  first_name?: string; // optional
  last_name?: string; // optional
  role?: 'SuperAdmin' | 'Owner' | 'Admin' | 'Editor' | 'Viewer'; // optional, default: Viewer
  is_active?: boolean; // optional, default: true
}

export interface CollaboratorUpdate {
  first_name?: string;
  last_name?: string;
  email?: string; // optional, must be unique per tenant if changed
  role?: 'SuperAdmin' | 'Owner' | 'Admin' | 'Editor' | 'Viewer';
  is_active?: boolean;
}

export interface CollaboratorListResponse {
  success: boolean;
  timestamp: string;
  data: Collaborator[];
  count: number;
}

export interface CollaboratorSingleResponse {
  success: boolean;
  timestamp: string;
  data: Collaborator;
}

export interface CollaboratorDeleteResponse {
  success: boolean;
  timestamp: string;
  data: {
    message: string;
    collaborator_id: string;
  };
}

