"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck,
  UserPlus,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Trash2,
  X,
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

interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string | null;
}

interface AuditLogEntry {
  id: string;
  actionType: string;
  actorId: string;
  actorEmail: string;
  targetId?: string;
  targetType?: string;
  details: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "down";
  message: string;
  lastCheck: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  super_admin: "Super Admin",
  ops_admin: "Ops Admin",
  driver_admin: "Driver Admin",
  product_admin: "Product Admin",
  finance_admin: "Finance Admin",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin:
    "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  ops_admin: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  driver_admin:
    "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  product_admin:
    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  finance_admin:
    "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  admin: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400",
};

export default function SystemPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("admin");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);
  const [removeAdminModal, setRemoveAdminModal] = useState<{
    uid: string;
    email: string;
  } | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [healthLoading, setHealthLoading] = useState(true);

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/admins", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch admins");
      }

      const data = await res.json();
      setAdmins(data.admins || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load admin users");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setAuditLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/audit-logs?limit=10", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error("Failed to fetch audit logs");
        return;
      }

      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      setHealthLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/system/health", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error("Failed to fetch health status");
        return;
      }

      const data = await res.json();
      setHealthChecks(data.checks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchAdmins();
        fetchAuditLogs();
        fetchHealth();
      }
    });
    return () => unsubscribe();
  }, [fetchAdmins, fetchAuditLogs, fetchHealth]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAddLoading(true);
      setAddError(null);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: addEmail, role: addRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add admin");
      }

      setShowAddModal(false);
      setAddEmail("");
      setAddRole("admin");
      fetchAdmins();
      fetchAuditLogs();
    } catch (err: any) {
      setAddError(err.message || "Failed to add admin");
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveAdmin = async (uid: string, email: string) => {
    try {
      setRemoveLoading(uid);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/admins", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to remove admin");
      }

      setRemoveAdminModal(null);
      fetchAdmins();
      fetchAuditLogs();
    } catch (err: any) {
      setError(err.message || "Failed to remove admin");
    } finally {
      setRemoveLoading(null);
    }
  };

  const filteredAdmins = admins.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.email.toLowerCase().includes(q) ||
      a.displayName.toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q)
    );
  });

  const getInitials = (name: string) => {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div
          data-tour="admin-system-header"
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg shadow-blue-500/30">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                System & Admins
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Manage admin roles and view audit logs
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all"
          >
            <UserPlus className="h-4 w-4" />
            Add Admin
          </button>
        </div>

        {/* Add Admin Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Add Admin User
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setAddError(null);
                    setAddEmail("");
                    setAddRole("admin");
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleAddAdmin} className="space-y-4">
                {addError && (
                  <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                    {addError}
                  </p>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    User Email
                  </label>
                  <input
                    type="email"
                    required
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    User must already have an account in the system
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Admin Role
                  </label>
                  <Select value={addRole} onValueChange={(v) => setAddRole(v)}>
                    <SelectTrigger className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-blue-500/50 shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin (General)</SelectItem>
                      <SelectItem value="super_admin">
                        Super Admin (Full Access)
                      </SelectItem>
                      <SelectItem value="ops_admin">
                        Ops Admin (Reservations, Operations)
                      </SelectItem>
                      <SelectItem value="driver_admin">
                        Driver Admin (Driver Management)
                      </SelectItem>
                      <SelectItem value="product_admin">
                        Product Admin (Catalog, Pricing)
                      </SelectItem>
                      <SelectItem value="finance_admin">
                        Finance Admin (Payouts, Transactions)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setAddError(null);
                    }}
                    className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading || !addEmail}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60"
                  >
                    {addLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Admin"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Admin Users */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Admin Users
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : error ? (
                <p className="text-center text-sm text-red-500 py-4">{error}</p>
              ) : filteredAdmins.length === 0 ? (
                <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">
                  {searchQuery
                    ? "No admins match your search"
                    : 'No admin users yet. Click "Add Admin" to get started.'}
                </p>
              ) : (
                filteredAdmins.map((admin) => (
                  <div
                    key={admin.uid}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {getInitials(admin.displayName)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white text-sm">
                          {admin.displayName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {admin.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ROLE_COLORS[admin.role] || ROLE_COLORS.admin
                        }`}
                      >
                        {ROLE_LABELS[admin.role] || admin.role}
                      </span>
                      <button
                        onClick={() =>
                          setRemoveAdminModal({
                            uid: admin.uid,
                            email: admin.email,
                          })
                        }
                        disabled={removeLoading === admin.uid}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Remove admin"
                      >
                        {removeLoading === admin.uid ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Role descriptions */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Available Roles
              </p>
              <div className="space-y-2 text-xs">
                <p className="text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Super Admin:
                  </span>{" "}
                  Full access to all sections
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Ops Admin:
                  </span>{" "}
                  Reservations, Operations, Support
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Driver Admin:
                  </span>{" "}
                  Driver management, Applications
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Product/Finance Admin:
                  </span>{" "}
                  Catalog, Pricing, Finance, Config
                </p>
              </div>
            </div>
          </div>

          {/* Audit Log */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Audit Log
              </h2>
              <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                View All
              </button>
            </div>

            <div className="space-y-3">
              {auditLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">
                  No audit log entries yet. Actions like approving drivers or
                  managing admins will appear here.
                </p>
              ) : (
                auditLogs.map((entry) => {
                  const isSuccess = [
                    "driver_approved",
                    "driver_reinstated",
                    "admin_added",
                  ].includes(entry.actionType);
                  const isWarning = [
                    "driver_suspended",
                    "driver_rejected",
                    "admin_removed",
                    "booking_cancelled",
                  ].includes(entry.actionType);

                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl"
                    >
                      {isSuccess ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : isWarning ? (
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Clock className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {entry.details}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          by {entry.actorEmail} ·{" "}
                          {new Date(entry.createdAt).toLocaleString("en-NG", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-8 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              System Health
            </h2>
            <button
              onClick={fetchHealth}
              disabled={healthLoading}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
            >
              {healthLoading ? "Checking..." : "Refresh"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {healthLoading && healthChecks.length === 0 ? (
              <div className="col-span-4 flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : healthChecks.length === 0 ? (
              <p className="col-span-4 text-center text-sm text-slate-500 dark:text-slate-400 py-4">
                Unable to fetch health status
              </p>
            ) : (
              healthChecks.map((check) => {
                const statusColors = {
                  healthy: "text-green-600 dark:text-green-400",
                  degraded: "text-amber-600 dark:text-amber-400",
                  down: "text-red-600 dark:text-red-400",
                };
                const dotColors = {
                  healthy: "bg-green-500",
                  degraded: "bg-amber-500",
                  down: "bg-red-500",
                };
                const statusLabels = {
                  healthy: "Healthy",
                  degraded: "Degraded",
                  down: "Down",
                };

                return (
                  <div
                    key={check.name}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl"
                    title={check.message}
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">
                      {check.name}
                    </span>
                    <span
                      className={`flex items-center gap-1.5 text-xs font-medium ${statusColors[check.status]}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${dotColors[check.status]}`}
                      />
                      {statusLabels[check.status]}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <ActionModal
        isOpen={Boolean(removeAdminModal)}
        onClose={() => setRemoveAdminModal(null)}
        title="Remove Admin"
        description={
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Remove admin privileges from{" "}
            <span className="font-semibold">{removeAdminModal?.email}</span>?
          </div>
        }
        confirmText="Remove"
        confirmVariant="destructive"
        loading={Boolean(
          removeAdminModal && removeLoading === removeAdminModal.uid,
        )}
        onConfirm={() => {
          if (!removeAdminModal) return;
          return handleRemoveAdmin(
            removeAdminModal.uid,
            removeAdminModal.email,
          );
        }}
      />
    </div>
  );
}
