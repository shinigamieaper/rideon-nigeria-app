"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Copy,
  Loader2,
  Plus,
  Users,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import {
  ActionModal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components";

type TeamMember = {
  uid: string;
  email: string;
  role: string;
  addedAt: string | null;
  addedBy: string | null;
};

type TeamInvite = {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string | null;
};

type TeamResponse = {
  partnerId: string;
  actor: { uid: string; kind: string; teamRole: string | null };
  canManage: boolean;
  members: TeamMember[];
  invites: TeamInvite[];
};

function inviteLink(partnerId: string, inviteId: string) {
  return `${window.location.origin}/join/partner?partnerId=${encodeURIComponent(partnerId)}&inviteId=${encodeURIComponent(inviteId)}`;
}

export default function PartnerTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [data, setData] = React.useState<TeamResponse | null>(null);

  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<
    "admin" | "manager" | "viewer"
  >("viewer");
  const [copyLinkModal, setCopyLinkModal] = React.useState<{
    url: string;
  } | null>(null);
  const [copyBusy, setCopyBusy] = React.useState(false);
  const [confirmModal, setConfirmModal] = React.useState<
    | { kind: "revoke_invite"; inviteId: string }
    | { kind: "remove_member"; memberUid: string }
    | null
  >(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      setSuccess(null);

      const user = auth.currentUser;
      if (!user) {
        router.replace("/login?next=/partner/team");
        return;
      }

      let token = await user.getIdToken();
      const fetchTeam = async (t: string) =>
        fetch("/api/partner/team", {
          headers: { Authorization: `Bearer ${t}` },
          cache: "no-store",
        });

      let res = await fetchTeam(token);
      if (res.status === 403) {
        token = await user.getIdToken(true);
        res = await fetchTeam(token);
      }

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Failed to load team.");
      }

      const j = (await res.json()) as TeamResponse;
      setData({
        ...j,
        members: Array.isArray(j?.members) ? j.members : [],
        invites: Array.isArray(j?.invites) ? j.invites : [],
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : null;
      setErr(message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    load();
  }, [load]);

  const createInvite = async () => {
    if (saving) return;
    setErr(null);
    setSuccess(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login?next=/partner/team");
        return;
      }

      setSaving(true);
      let token = await user.getIdToken();

      const doPost = async (t: string) =>
        fetch("/api/partner/team/invites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${t}`,
          },
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        });

      let res = await doPost(token);
      if (res.status === 403) {
        token = await user.getIdToken(true);
        res = await doPost(token);
      }

      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error || "Failed to create invite.");

      const partnerId = typeof j?.partnerId === "string" ? j.partnerId : "";
      const inviteId = typeof j?.inviteId === "string" ? j.inviteId : "";
      const inviteUrl = typeof j?.inviteUrl === "string" ? j.inviteUrl : "";
      const emailSent = j?.emailSent === true;
      if (!partnerId || !inviteId)
        throw new Error("Invite created but response was invalid.");

      const url = inviteUrl || inviteLink(partnerId, inviteId);

      try {
        await navigator.clipboard.writeText(url);
        setSuccess(
          emailSent
            ? "Invite created, emailed, and copied to clipboard."
            : "Invite created and copied to clipboard.",
        );
      } catch {
        setSuccess(
          emailSent
            ? "Invite created and emailed. Copy the link below if needed."
            : "Invite created. Copy the link below.",
        );
        setCopyLinkModal({ url });
      }

      setInviteEmail("");
      setInviteRole("viewer");
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : null;
      setErr(message || "Failed to create invite.");
    } finally {
      setSaving(false);
    }
  };

  const copyInvite = async (inviteId: string) => {
    if (!data?.partnerId) return;
    const url = inviteLink(data.partnerId, inviteId);
    try {
      await navigator.clipboard.writeText(url);
      setSuccess("Invite link copied.");
      setTimeout(() => setSuccess(null), 2500);
    } catch {
      setCopyLinkModal({ url });
    }
  };

  const revokeInvite = async (inviteId: string) => {
    if (!data?.canManage) return;
    setErr(null);
    setSuccess(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login?next=/partner/team");
        return;
      }

      setSaving(true);
      let token = await user.getIdToken();

      const doPost = async (t: string) =>
        fetch(
          `/api/partner/team/invites/${encodeURIComponent(inviteId)}/revoke`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${t}` },
          },
        );

      let res = await doPost(token);
      if (res.status === 403) {
        token = await user.getIdToken(true);
        res = await doPost(token);
      }

      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error || "Failed to revoke invite.");

      setSuccess("Invite revoked.");
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : null;
      setErr(message || "Failed to revoke invite.");
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (memberUid: string) => {
    if (!data?.canManage) return;
    setErr(null);
    setSuccess(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login?next=/partner/team");
        return;
      }

      setSaving(true);
      let token = await user.getIdToken();

      const doPost = async (t: string) =>
        fetch(
          `/api/partner/team/members/${encodeURIComponent(memberUid)}/remove`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${t}` },
          },
        );

      let res = await doPost(token);
      if (res.status === 403) {
        token = await user.getIdToken(true);
        res = await doPost(token);
      }

      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error || "Failed to remove member.");

      setSuccess("Member removed.");
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : null;
      setErr(message || "Failed to remove member.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/partner"
            className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg shadow-lg"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Team
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Invite colleagues and manage access roles.
            </p>
          </div>
        </div>
      </div>

      {(err || success) && (
        <div
          className={`rounded-2xl backdrop-blur-lg border shadow-lg p-5 ${
            success
              ? "bg-green-500/10 border-green-500/30 text-green-800 dark:text-green-200"
              : "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <p className="text-sm font-semibold">{success || err}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm">Loading team…</p>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800/60">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Invite a team member
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Create an invite link for a colleague. They must sign in
                    with the invited email.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="mt-2 w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Role
                </label>
                <div className="mt-2">
                  <Select
                    value={inviteRole}
                    onValueChange={(v) =>
                      setInviteRole(v as "admin" | "manager" | "viewer")
                    }
                  >
                    <SelectTrigger className="w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={createInvite}
                disabled={saving || !data?.canManage}
                className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white h-11 px-5 transition hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "#00529B" }}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create invite
              </button>
              {!data?.canManage ? (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Only admins can invite or remove members.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Members
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              People who can access this partner portal.
            </p>

            {data?.members?.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Role</th>
                      <th className="py-2 pr-4">Added</th>
                      <th className="py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                    {data.members.map((m) => (
                      <tr
                        key={m.uid}
                        className="text-slate-700 dark:text-slate-200"
                      >
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {m.email || m.uid}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {m.role}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {m.addedAt
                            ? new Date(m.addedAt).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          {data.canManage ? (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmModal({
                                  kind: "remove_member",
                                  memberUid: m.uid,
                                })
                              }
                              disabled={saving}
                              className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold h-9 px-3 border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 hover:bg-white/80 dark:hover:bg-slate-900/80 disabled:opacity-60"
                            >
                              Remove
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No team members yet.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Invites
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Pending and past invite links.
            </p>

            {data?.invites?.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Role</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Created</th>
                      <th className="py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                    {data.invites.map((inv) => (
                      <tr
                        key={inv.id}
                        className="text-slate-700 dark:text-slate-200"
                      >
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {inv.email || inv.id}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {inv.role}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {inv.status}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {inv.createdAt
                            ? new Date(inv.createdAt).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copyInvite(inv.id)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold h-9 px-3 border border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 hover:bg-white/80 dark:hover:bg-slate-900/80"
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </button>
                            {data.canManage && inv.status === "pending" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmModal({
                                    kind: "revoke_invite",
                                    inviteId: inv.id,
                                  })
                                }
                                disabled={saving}
                                className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold h-9 px-3 border border-red-200/80 dark:border-red-800/60 bg-red-50/60 dark:bg-red-900/20 text-red-700 dark:text-red-200 hover:bg-red-50/80 dark:hover:bg-red-900/30 disabled:opacity-60"
                              >
                                Revoke
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-white/60 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/60 p-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No invites yet.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      <ActionModal
        isOpen={Boolean(copyLinkModal)}
        onClose={() => setCopyLinkModal(null)}
        title="Copy invite link"
        description={
          <div className="space-y-2">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Copy and share this link with your teammate.
            </div>
            <input
              readOnly
              value={copyLinkModal?.url || ""}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full h-11 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/40 text-sm text-slate-900 dark:text-white"
            />
          </div>
        }
        confirmText="Copy"
        confirmVariant="primary"
        loading={copyBusy}
        onConfirm={async () => {
          const url = copyLinkModal?.url;
          if (!url) return;
          try {
            setCopyBusy(true);
            await navigator.clipboard.writeText(url);
            setCopyLinkModal(null);
            setSuccess("Invite link copied.");
            setTimeout(() => setSuccess(null), 2500);
          } catch {
            setSuccess("Copy failed. Please copy the link manually.");
          } finally {
            setCopyBusy(false);
          }
        }}
      />

      <ActionModal
        isOpen={Boolean(confirmModal)}
        onClose={() => setConfirmModal(null)}
        title={
          confirmModal?.kind === "revoke_invite"
            ? "Revoke invite"
            : "Remove team member"
        }
        description={
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {confirmModal?.kind === "revoke_invite"
              ? "Revoke this invite link? The recipient will no longer be able to use it."
              : "Remove this team member? They will lose access to this partner portal."}
          </div>
        }
        confirmText={
          confirmModal?.kind === "revoke_invite" ? "Revoke" : "Remove"
        }
        confirmVariant="destructive"
        loading={saving}
        onConfirm={() => {
          if (!confirmModal) return;
          if (confirmModal.kind === "revoke_invite") {
            setConfirmModal(null);
            return revokeInvite(confirmModal.inviteId);
          }
          setConfirmModal(null);
          return removeMember(confirmModal.memberUid);
        }}
      />
    </div>
  );
}
