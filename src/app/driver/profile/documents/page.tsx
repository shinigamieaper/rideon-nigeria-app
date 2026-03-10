"use client";

import * as React from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Modal, StickyBanner } from "@/components";
import {
  Loader2,
  Upload,
  Eye,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";

async function getUserOrWait(timeoutMs = 4000): Promise<User> {
  if (auth.currentUser) return auth.currentUser;
  return await new Promise<User>((resolve, reject) => {
    const t = window.setTimeout(() => {
      unsub();
      reject(new Error("Authentication timed out. Please try again."));
    }, timeoutMs);
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) return;
      window.clearTimeout(t);
      unsub();
      resolve(u);
    });
  });
}

type DocumentStatus = "approved" | "pending" | "expired" | "missing";

interface DocumentInfo {
  name: string;
  key: string;
  url?: string;
  status: DocumentStatus;
  expiryDate?: string;
}

export default function DocumentsPage() {
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerTitle, setViewerTitle] = React.useState("");
  const [viewerResolvedUrl, setViewerResolvedUrl] = React.useState("");
  const [viewerPreviewUrl, setViewerPreviewUrl] = React.useState("");
  const [viewerPageUrls, setViewerPageUrls] = React.useState<string[]>([]);
  const [viewerLoading, setViewerLoading] = React.useState(false);
  const [viewerError, setViewerError] = React.useState<string | null>(null);
  const [viewerKind, setViewerKind] = React.useState<"pdf" | "image" | "other">(
    "other",
  );

  const [track, setTrack] = React.useState<"fleet" | "placement" | "both">(
    "fleet",
  );
  const [documents, setDocuments] = React.useState<DocumentInfo[]>([]);

  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>(
    {},
  );

  React.useEffect(() => {
    async function load() {
      try {
        const user = await getUserOrWait();
        const token = await user.getIdToken();
        const res = await fetch("/api/drivers/me/documents", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || "Failed to load documents");

        setTrack(j.track || "fleet");
        setDocuments(j.documents || []);
      } catch (e: any) {
        setError(e?.message || "Unable to load documents.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerTitle("");
    setViewerResolvedUrl("");
    setViewerPreviewUrl("");
    setViewerPageUrls([]);
    setViewerError(null);
    setViewerLoading(false);
    setViewerKind("other");
  };

  const openViewer = async (doc: DocumentInfo) => {
    if (!doc.url) return;

    setViewerTitle(doc.name);
    setViewerOpen(true);
    setViewerResolvedUrl("");
    setViewerError(null);
    setViewerLoading(true);
    setViewerKind("other");

    try {
      const user = await getUserOrWait();
      const token = await user.getIdToken();

      const base = String(doc.url || "").split("?")[0];
      if (!base.startsWith("/api/files/")) {
        throw new Error(
          "This document link is not compatible. Please re-upload the document.",
        );
      }

      const res = await fetch(`${base}?resolve=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed to open document");
      const resolved = typeof j?.url === "string" ? j.url : "";
      if (!resolved) throw new Error("Failed to open document");

      const preview = typeof j?.previewUrl === "string" ? j.previewUrl : "";
      setViewerPreviewUrl(preview);

      const pageUrls = Array.isArray(j?.pageUrls)
        ? (j.pageUrls as any[]).filter((v) => typeof v === "string")
        : [];
      setViewerPageUrls(pageUrls as string[]);

      const kindFromApi =
        j?.kind === "pdf" || j?.kind === "image" || j?.kind === "other"
          ? j.kind
          : null;
      if (kindFromApi) {
        setViewerKind(kindFromApi);
      } else {
        const isPdf = /\.pdf(\?|$)/i.test(resolved);
        const isImg = /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(resolved);
        setViewerKind(isPdf ? "pdf" : isImg ? "image" : "other");
      }
      setViewerResolvedUrl(resolved);
    } catch (e: any) {
      setViewerError(e?.message || "Unable to open document.");
    } finally {
      setViewerLoading(false);
    }
  };

  const handleFileSelect = async (docKey: string, file: File | null) => {
    if (!file) return;

    try {
      setUploading(docKey);
      setError(null);
      setSuccess(null);

      const user = await getUserOrWait();
      const token = await user.getIdToken();

      const fd = new FormData();
      fd.append("key", docKey);
      fd.append("file", file);

      const uploadRes = await fetch("/api/uploads/driver-docs", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const uploadData = await uploadRes.json().catch(() => null);
      if (!uploadRes.ok)
        throw new Error(uploadData?.error || "Failed to upload file");
      if (!uploadData?.url) throw new Error("Upload failed");

      const fileUrl = String(uploadData.url);

      // Notify backend to update document status
      const notifyRes = await fetch("/api/drivers/me/documents/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentKey: docKey, fileUrl }),
      });

      const notifyData = await notifyRes.json();
      if (!notifyRes.ok)
        throw new Error(notifyData?.error || "Failed to confirm upload");

      // Update local state
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.key === docKey
            ? { ...doc, url: fileUrl, status: "pending" as DocumentStatus }
            : doc,
        ),
      );

      setSuccess("Document uploaded successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.message || "Unable to upload document.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setUploading(null);
    }
  };

  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "expired":
        return <AlertCircle className="h-4 w-4" />;
      case "missing":
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700";
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700";
      case "expired":
        return "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700";
      case "missing":
        return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-700";
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6">
        <div className="h-6 w-32 rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
        <div className="mt-1 h-4 w-full max-w-2xl rounded bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />

        <div className="mt-3 h-6 w-40 rounded-lg bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />

        <div className="mt-5 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-4 animate-pulse"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-48 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                    <div className="h-5 w-20 rounded-full bg-slate-200/70 dark:bg-slate-800/70" />
                  </div>
                  <div className="h-3 w-32 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-9 w-20 rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
                  <div className="h-9 w-24 rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Documents
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Upload and manage your required documents. Documents are reviewed by our
        team within 24-48 hours.
      </p>

      {(error || success) && (
        <StickyBanner className="z-50 mt-4">
          <div
            className={[
              "rounded-xl px-3 py-2 text-[13px] shadow border",
              success
                ? "bg-green-500/10 border-green-500/30 text-green-800 dark:text-green-200"
                : "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200",
            ].join(" ")}
          >
            {success || error}
          </div>
        </StickyBanner>
      )}

      {track && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300">
          {track === "fleet" && "Fleet Driver Track"}
          {track === "placement" && "Placement Track"}
          {track === "both" && "Both Tracks (Fleet + Placement)"}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.key}
            className="rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg p-4 transition-all duration-300"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {doc.name}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${getStatusColor(doc.status)}`}
                  >
                    {getStatusIcon(doc.status)}
                    {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                  </span>
                </div>
                {doc.expiryDate && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {doc.url && doc.status !== "missing" && (
                  <button
                    type="button"
                    onClick={() => void openViewer(doc)}
                    className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-800/60 transition"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRefs.current[doc.key]?.click()}
                  disabled={uploading === doc.key}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-[#00529B] text-white text-xs font-medium hover:bg-[#003D7A] shadow-lg shadow-blue-900/20 transition-all duration-200 disabled:opacity-60"
                >
                  {uploading === doc.key ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      {doc.status === "missing" ? "Upload" : "Replace"}
                    </>
                  )}
                </button>

                <input
                  ref={(el) => {
                    fileInputRefs.current[doc.key] = el;
                  }}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) =>
                    handleFileSelect(doc.key, e.target.files?.[0] || null)
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="mt-8 text-center py-12 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/60 shadow-lg">
          <FileText className="h-12 w-12 mx-auto text-slate-400" />
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            No documents found for your track.
          </p>
        </div>
      )}

      <Modal
        isOpen={viewerOpen}
        onClose={closeViewer}
        title={viewerTitle || "Document"}
        className="max-w-5xl"
      >
        {viewerLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Opening…</span>
          </div>
        ) : viewerError ? (
          <div className="space-y-3">
            <div className="text-sm text-red-700 dark:text-red-300">
              {viewerError}
            </div>
          </div>
        ) : viewerResolvedUrl ? (
          <div className="space-y-3">
            <div className="flex items-center justify-end">
              <a
                href={`${viewerResolvedUrl}${viewerResolvedUrl.includes("?") ? "&" : "?"}download=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            </div>
            {viewerKind === "image" ? (
              <img
                src={viewerResolvedUrl}
                alt={viewerTitle}
                className="w-full max-h-[70vh] object-contain rounded-xl bg-white/60 dark:bg-slate-900/40"
              />
            ) : viewerKind === "pdf" ? (
              <div className="space-y-3">
                {viewerPageUrls.length > 0 ? (
                  <div className="max-h-[70vh] overflow-auto space-y-3 rounded-xl bg-white/60 dark:bg-slate-900/40 p-3">
                    {viewerPageUrls.map((u, idx) => (
                      <img
                        key={`${u}-${idx}`}
                        src={u}
                        alt={`${viewerTitle} (Page ${idx + 1})`}
                        className="w-full object-contain rounded-lg bg-white/60 dark:bg-slate-900/40"
                      />
                    ))}
                  </div>
                ) : viewerPreviewUrl ? (
                  <img
                    src={viewerPreviewUrl}
                    alt={`${viewerTitle} (Preview)`}
                    className="w-full max-h-[70vh] object-contain rounded-xl bg-white/60 dark:bg-slate-900/40"
                  />
                ) : (
                  <iframe
                    src={viewerResolvedUrl}
                    className="w-full h-[70vh] rounded-xl bg-white/60 dark:bg-slate-900/40"
                  />
                )}
              </div>
            ) : (
              <a
                href={viewerResolvedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <Eye className="h-4 w-4" />
                Open
              </a>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
