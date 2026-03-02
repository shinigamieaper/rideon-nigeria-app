import { adminDb } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export type AuditActionType =
  | "driver_approved"
  | "driver_rejected"
  | "driver_suspended"
  | "driver_reinstated"
  | "driver_recruitment_visibility_updated"
  | "driver_recruitment_profile_update_submitted"
  | "driver_recruitment_profile_update_approved"
  | "driver_recruitment_profile_update_rejected"
  | "full_time_driver_application_approved"
  | "full_time_driver_application_rejected"
  | "full_time_driver_application_needs_more_info"
  | "partner_application_approved"
  | "partner_application_rejected"
  | "partner_suspended"
  | "partner_reinstated"
  | "partner_vehicle_submission_approved"
  | "partner_vehicle_submission_rejected"
  | "partner_vehicle_submission_changes_requested"
  | "partner_driver_submission_approved"
  | "partner_driver_submission_rejected"
  | "partner_driver_submission_changes_requested"
  | "admin_added"
  | "admin_removed"
  | "booking_cancelled"
  | "booking_assigned"
  | "reservation_cancelled"
  | "reservation_needs_reassignment"
  | "reservation_vehicle_reassigned"
  | "driver_reassigned"
  | "driver_unassigned"
  | "price_updated"
  | "config_updated"
  | "config_feature_flags_updated"
  | "config_assignment_rules_updated"
  | "config_service_cities_updated"
  | "config_banner_updated"
  | "catalog_listing_created"
  | "catalog_listing_updated"
  | "catalog_listing_deleted"
  | "finance_payout_marked_paid"
  | "finance_payouts_exported"
  | "refund_initiated"
  | "refund_pending"
  | "refund_processing"
  | "refund_processed"
  | "refund_failed"
  | "payment_amount_mismatch"
  | "payment_currency_mismatch"
  | "payment_metadata_mismatch"
  | "conversation_updated"
  | "support_joined_conversation"
  | "assignment_run"
  | "brand_banner_created"
  | "brand_banner_updated"
  | "brand_banner_deleted"
  | "marketing_testimonial_created";

export interface AuditLogEntry {
  id: string;
  actionType: AuditActionType;
  actorId: string;
  actorEmail: string;
  targetId?: string;
  targetType?: string;
  details: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface CreateAuditLogParams {
  actionType: AuditActionType;
  actorId: string;
  actorEmail: string;
  targetId?: string;
  targetType?: string;
  details: string;
  metadata?: Record<string, any>;
}

/**
 * Creates an audit log entry in Firestore
 */
export async function createAuditLog(
  params: CreateAuditLogParams,
): Promise<void> {
  try {
    await adminDb.collection("audit_logs").add({
      actionType: params.actionType,
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      targetId: params.targetId || null,
      targetType: params.targetType || null,
      details: params.details,
      metadata: params.metadata || {},
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // Log but don't throw - audit logging should not break the main flow
    console.error("[AuditLog] Failed to create audit log entry:", error);
  }
}

/**
 * Fetches recent audit log entries
 */
export async function fetchAuditLogs(
  limit: number = 20,
): Promise<AuditLogEntry[]> {
  try {
    const snapshot = await adminDb
      .collection("audit_logs")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const logs: AuditLogEntry[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      const createdAt =
        data.createdAt?.toDate?.()?.toISOString() ||
        (typeof data.createdAt === "string"
          ? data.createdAt
          : new Date().toISOString());

      const actionType = (data.actionType || data.action) as AuditActionType;
      const actorId: string = data.actorId || data.adminUid || "system";
      const actorEmail: string = data.actorEmail || data.adminEmail || "system";
      const targetId: string | undefined =
        data.targetId || data.conversationId || undefined;
      const targetType: string | undefined =
        data.targetType || (data.conversationId ? "conversation" : undefined);
      const metadata: Record<string, any> | undefined =
        data.metadata || data.changes || undefined;

      logs.push({
        id: doc.id,
        actionType,
        actorId,
        actorEmail,
        targetId,
        targetType,
        details: data.details || "",
        metadata,
        createdAt,
      });
    }

    return logs;
  } catch (error) {
    console.error("[AuditLog] Failed to fetch audit logs:", error);
    return [];
  }
}
