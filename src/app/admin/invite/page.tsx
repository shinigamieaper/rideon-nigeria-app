"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Loader2, Plus } from "lucide-react";

export default function AdminInvitePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || "Failed to add admin",
        });
        return;
      }
      setMessage({
        type: "success",
        text: `Admin invite sent to ${email}`,
      });
      setEmail("");
      setRole("admin");
    } catch (e) {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold mb-2">
          <Plus className="w-5 h-5" />
          Invite Admin
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Add a new admin by email. They must already have an account.
        </p>
        {message && (
          <p
            className={`text-sm mb-4 ${message.type === "error" ? "text-red-600" : "text-green-600"}`}
          >
            {message.text}
          </p>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <Select value={role} onValueChange={setRole} disabled={submitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="ops_admin">Ops Admin</SelectItem>
                <SelectItem value="driver_admin">Driver Admin</SelectItem>
                <SelectItem value="product_admin">Product Admin</SelectItem>
                <SelectItem value="finance_admin">Finance Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Send Admin Invite
          </Button>
        </form>
      </div>
    </div>
  );
}
