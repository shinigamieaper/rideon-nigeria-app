// Placement track deprecated - redirect to service settings
import { redirect } from "next/navigation";

export default function CareerPreferencesPage() {
  redirect("/driver/profile/settings");
}
