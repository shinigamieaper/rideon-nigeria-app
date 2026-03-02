/**
 * Brand Banner system types.
 * Used by admin CRUD API and public read API.
 */

export type BannerPortal =
  | "public"
  | "customer"
  | "driver_on_demand"
  | "driver_full_time"
  | "partner";

export type BannerStatus = "draft" | "active" | "archived";

export const VALID_PORTALS: BannerPortal[] = [
  "public",
  "customer",
  "driver_on_demand",
  "driver_full_time",
  "partner",
];

export const VALID_STATUSES: BannerStatus[] = ["draft", "active", "archived"];

export const PORTAL_LABELS: Record<BannerPortal, string> = {
  public: "Public Site",
  customer: "Customer App",
  driver_on_demand: "On-Demand Driver",
  driver_full_time: "Full-Time Driver",
  partner: "Partner Portal",
};

/** Shape stored in Firestore `brand_banners/{id}` */
export interface BrandBannerDoc {
  title: string;
  message: string;
  ctaLabel: string;
  ctaLink: string;
  portals: BannerPortal[];
  status: BannerStatus;
  priority: number;
  /** Firestore Timestamp — ISO string when serialised */
  startAt: string | null;
  /** Firestore Timestamp — ISO string when serialised */
  endAt: string | null;
  dismissible: boolean;
  dismissForHours: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

/** JSON shape returned to clients from the public read API */
export interface BrandBannerPublic {
  id: string;
  show: boolean;
  title: string;
  message: string;
  ctaLabel: string;
  ctaLink: string;
  dismissible: boolean;
  dismissForHours: number;
}
