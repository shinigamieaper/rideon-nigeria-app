"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export interface LogoutButtonProps
  extends React.ComponentPropsWithoutRef<"button"> {
  redirectTo?: string;
}

export default function LogoutButton({
  redirectTo = "/login",
  className,
  children = "Log out",
  ...rest
}: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleLogout() {
    try {
      setLoading(true);
      await signOut(auth);
      try {
        // Clear any cached profile and notify header to reset
        localStorage.removeItem("rideon-profile");
        window.dispatchEvent(
          new CustomEvent("rideon-profile-updated", {
            detail: { initials: "RN", avatarColor: "#00529B" },
          }),
        );
      } catch {}
      router.replace(redirectTo);
    } catch (e: any) {
      setError(e?.message || "Failed to log out. Please try again.");
      setTimeout(() => setError(null), 2500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {error && (
        <div className="mb-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className={[
          "inline-flex items-center justify-center h-11 px-4 rounded-md",
          "bg-red-600 text-white hover:bg-red-700",
          "disabled:opacity-60",
          className || "",
        ].join(" ")}
        {...rest}
      >
        {loading ? "Logging out…" : children}
      </button>
    </>
  );
}
