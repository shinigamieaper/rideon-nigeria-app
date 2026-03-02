import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Services | RideOn Nigeria",
  description: "Explore RideOn's mobility services across Nigeria.",
};

export default function CorporateSolutionsPage() {
  redirect("/services");
}
