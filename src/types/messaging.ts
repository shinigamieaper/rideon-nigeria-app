/**
 * Unified Messaging Data Model
 *
 * Firestore Collections:
 * - conversations (collection)
 * - conversations/{conversationId}/messages (subcollection)
 */

// ============================================================================
// Conversation Types
// ============================================================================

export type ConversationType = "support" | "trip" | "general" | "system";

export type ConversationStatus = "open" | "pending" | "resolved" | "closed";

export type ConversationPriority = "low" | "normal" | "high" | "urgent";

export type ParticipantRole = "customer" | "driver" | "admin" | "support";

export type ConversationSource =
  | "support_contact_form"
  | "trip_chat"
  | "profile_support"
  | "driver_support"
  | "full_time_driver_portal"
  | "placement_portfolio"
  | "public_site"
  | "system";

export type ConversationChannel = "in_app" | "web" | "public_site";

export interface ParticipantProfile {
  name?: string;
  role?: ParticipantRole;
  avatarUrl?: string;
  email?: string;
  phone?: string;
}

export interface ConversationContext {
  customerId?: string;
  driverId?: string;
  reservationId?: string;
  bookingId?: string;
  cityId?: string;
  channel?: ConversationChannel;
  source?: ConversationSource;
  supportInvolved?: boolean;
  placementContactStatus?: "requested" | "accepted" | "declined";
  placementHireStatus?: "requested" | "accepted" | "declined";
}

/**
 * Conversation Document (Firestore: conversations/{conversationId})
 *
 * Represents a conversation thread between participants.
 */
export interface Conversation {
  // Core identity
  id: string;
  type: ConversationType;

  // Participants
  memberIds: string[]; // e.g., [userUid, 'support'] or [customerUid, driverUid]
  memberKey?: string; // Deterministic key for deduplication, e.g., 'uid1|uid2'
  participantProfiles: Record<string, ParticipantProfile>;
  createdBy?: string; // uid of who initiated

  // Support/ticket semantics
  status: ConversationStatus;
  priority: ConversationPriority;
  assignedAgentId?: string; // uid of support agent handling it
  tags?: string[]; // e.g., ['payment', 'driver_behavior', 'technical_issue']

  // Context / linkage
  context?: ConversationContext;

  // Last activity
  lastMessage: string;
  lastMessageAt: string; // ISO date string
  lastMessageSenderId?: string;
  unreadCounts: Record<string, number>; // { [uid]: count, support: count }

  // Timestamps
  createdAt: string;
  updatedAt: string;
  firstResponseAt?: string; // For SLA metrics on support tickets
  resolvedAt?: string;
  closedAt?: string;

  // Legacy fields (for backward compatibility)
  title?: string;
}

// ============================================================================
// Message Types
// ============================================================================

export type MessageSenderRole =
  | "customer"
  | "driver"
  | "support"
  | "admin"
  | "system";

export type MessageStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export interface MessageAttachment {
  type: "image" | "pdf" | "other";
  url: string;
  name?: string;
  size?: number;
}

export interface MessageMeta {
  internalNote?: boolean; // Internal notes visible only to admins
  agentId?: string; // The actual admin uid who sent the message (when senderId is 'support')
  systemEvent?: string; // For system-generated messages
}

/**
 * Message Document (Firestore: conversations/{conversationId}/messages/{messageId})
 */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string; // user uid, driver uid, 'support', or 'system'
  senderRole: MessageSenderRole;
  text?: string; // Legacy field name
  content?: string; // Preferred field name
  attachments?: MessageAttachment[];
  createdAt: string; // ISO date string
  status?: MessageStatus;
  meta?: MessageMeta;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

// --- Admin Messages List ---
export interface AdminMessagesListParams {
  type?: ConversationType;
  status?: ConversationStatus;
  priority?: ConversationPriority;
  assignedTo?: "me" | "unassigned" | string;
  q?: string; // Search query
  page?: number;
  limit?: number;
}

export interface AdminConversationListItem {
  id: string;
  type: ConversationType;
  status: ConversationStatus;
  priority: ConversationPriority;
  assignedAgentId?: string;
  participants: {
    id: string;
    name: string;
    role?: ParticipantRole;
    avatarUrl?: string;
  }[];
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number; // Unread count for 'support' side
  tags?: string[];
  context?: ConversationContext;
  createdAt: string;
  firstResponseAt?: string;
}

export interface AdminMessagesListResponse {
  conversations: AdminConversationListItem[];
  total: number;
  page: number;
  limit: number;
}

// --- Admin Conversation Detail ---
export interface AdminConversationDetailResponse {
  conversation: {
    id: string;
    type: ConversationType;
    status: ConversationStatus;
    priority: ConversationPriority;
    assignedAgentId?: string;
    tags?: string[];
    context?: ConversationContext;
    participants: {
      id: string;
      name: string;
      role?: ParticipantRole;
      avatarUrl?: string;
      email?: string;
      phone?: string;
    }[];
    createdAt: string;
    firstResponseAt?: string;
    resolvedAt?: string;
  };
  messages: {
    id: string;
    senderId: string;
    senderRole: MessageSenderRole;
    content: string;
    createdAt: string;
    meta?: MessageMeta;
  }[];
}

// --- Admin Reply ---
export interface AdminReplyRequest {
  content: string;
  internalNote?: boolean; // If true, message is internal and won't be visible to user
}

// --- Admin Update Conversation ---
export interface AdminUpdateConversationRequest {
  status?: ConversationStatus;
  priority?: ConversationPriority;
  assignedAgentId?: string | null;
  tags?: string[];
}
