import { redirect } from "next/navigation";

export default function LegacyServiceUnavailableRedirect() {
  redirect("/service-unavailable");
}
