// Placement marketplace deprecated - redirect to personal profile
import { redirect } from "next/navigation";

export default function PublicProfilePage() {
  redirect("/driver/profile/personal");
}
