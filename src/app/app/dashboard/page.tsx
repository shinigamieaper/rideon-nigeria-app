import { Metadata } from "next";
import DashboardClient from "../../../../components/app/DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard • RideOn",
};

export default function Page() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <DashboardClient />
      </div>
    </div>
  );
}
