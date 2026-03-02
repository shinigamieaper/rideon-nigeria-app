export type PlacementInterviewType =
  | "google_meet_audio"
  | "google_meet_video"
  | "in_person";

export type PlacementInterviewRequestStatus =
  | "requested"
  | "accepted"
  | "declined"
  | "scheduled"
  | "cancelled";

export type PlacementHireRequestStatus =
  | "requested"
  | "accepted"
  | "declined"
  | "admin_approved"
  | "cancelled";

export interface PlacementInterviewRequest {
  id: string;
  conversationId: string;
  driverId: string;
  customerId: string;
  customerName: string;
  customerAvatarUrl: string | null;
  status: PlacementInterviewRequestStatus;
  interviewType: PlacementInterviewType;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  respondedAt?: string;
}

export interface PlacementHireRequest {
  id: string;
  conversationId: string;
  driverId: string;
  customerId: string;
  customerName: string;
  customerAvatarUrl: string | null;
  status: PlacementHireRequestStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  respondedAt?: string;
}

export interface DriverInterviewRequestsResponse {
  requests: PlacementInterviewRequest[];
}

export interface DriverHireRequestsResponse {
  requests: PlacementHireRequest[];
}
