"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { auth } from "@/lib/firebase";
import {
  Car,
  Search,
  Loader2,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  TrendingUp,
  Users,
  Building2,
  UploadCloud,
} from "lucide-react";
import {
  ActionModal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components";
import { computeCustomerUnitRateNgn } from "@/lib/pricing";

interface Listing {
  id: string;
  city: string;
  category: string;
  make: string;
  model: string;
  adminActive: boolean;
  seats: number | null;
  images: string[];
  dayRateNgn: number;
  block4hRateNgn: number;
  partnerBaseDayRateNgn?: number;
  partnerBaseBlock4hRateNgn?: number;
  adminMarkupFixedNgn?: number;
  status: string;
  createdAt: string | null;
}

interface ListingForm {
  city: string;
  category: string;
  make: string;
  model: string;
  adminActive: boolean;
  seats: number;
  images: string[];
  newImageUrl: string;
  dayRateNgn: number;
  block4hRateNgn: number;
  partnerBaseDayRateNgn: number;
  partnerBaseBlock4hRateNgn: number;
  adminMarkupFixedNgn: number;
  description: string;
}

const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano"];
const CATEGORIES = ["sedan", "suv", "luxury", "van", "bus"];

const defaultForm: ListingForm = {
  city: "Lagos",
  category: "sedan",
  make: "",
  model: "",
  adminActive: true,
  seats: 4,
  images: [],
  newImageUrl: "",
  dayRateNgn: 0,
  block4hRateNgn: 0,
  partnerBaseDayRateNgn: 0,
  partnerBaseBlock4hRateNgn: 0,
  adminMarkupFixedNgn: 0,
  description: "",
};

export default function CatalogPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ListingForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (cityFilter) params.set("city", cityFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/catalog?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch listings");
      const data = await res.json();
      setListings(data.listings || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }, [cityFilter, statusFilter]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchListings();
    });
    return () => unsubscribe();
  }, [fetchListings]);

  const openEditModal = async (listing: Listing) => {
    setEditingId(listing.id);
    setFormError(null);
    setImageUploadError(null);
    setShowModal(true);
    setModalLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();

      const res = await fetch(`/api/admin/catalog/${listing.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to load listing details");
      }

      const data = await res.json();

      setForm({
        city: data.city || listing.city,
        category: data.category || listing.category,
        make: data.make || listing.make,
        model: data.model || listing.model,
        adminActive: data.adminActive === false ? false : true,
        seats: typeof data.seats === "number" ? data.seats : listing.seats || 4,
        images: Array.isArray(data.images)
          ? data.images
          : Array.isArray(listing.images)
            ? listing.images
            : [],
        newImageUrl: "",
        dayRateNgn:
          typeof data.dayRateNgn === "number"
            ? data.dayRateNgn
            : listing.dayRateNgn,
        block4hRateNgn:
          typeof data.block4hRateNgn === "number"
            ? data.block4hRateNgn
            : listing.block4hRateNgn,
        partnerBaseDayRateNgn:
          typeof data.partnerBaseDayRateNgn === "number"
            ? data.partnerBaseDayRateNgn
            : typeof listing.partnerBaseDayRateNgn === "number"
              ? listing.partnerBaseDayRateNgn
              : 0,
        partnerBaseBlock4hRateNgn:
          typeof data.partnerBaseBlock4hRateNgn === "number"
            ? data.partnerBaseBlock4hRateNgn
            : typeof listing.partnerBaseBlock4hRateNgn === "number"
              ? listing.partnerBaseBlock4hRateNgn
              : 0,
        adminMarkupFixedNgn:
          typeof data.adminMarkupFixedNgn === "number"
            ? data.adminMarkupFixedNgn
            : typeof listing.adminMarkupFixedNgn === "number"
              ? listing.adminMarkupFixedNgn
              : 0,
        description: data.description || "",
      });
    } catch (err: any) {
      console.error(err);
      setForm({
        city: listing.city,
        category: listing.category,
        make: listing.make,
        model: listing.model,
        adminActive: listing.adminActive === false ? false : true,
        seats: listing.seats || 4,
        images: Array.isArray(listing.images) ? listing.images : [],
        newImageUrl: "",
        dayRateNgn: listing.dayRateNgn,
        block4hRateNgn: listing.block4hRateNgn,
        partnerBaseDayRateNgn:
          typeof listing.partnerBaseDayRateNgn === "number"
            ? listing.partnerBaseDayRateNgn
            : 0,
        partnerBaseBlock4hRateNgn:
          typeof listing.partnerBaseBlock4hRateNgn === "number"
            ? listing.partnerBaseBlock4hRateNgn
            : 0,
        adminMarkupFixedNgn:
          typeof listing.adminMarkupFixedNgn === "number"
            ? listing.adminMarkupFixedNgn
            : 0,
        description: "",
      });
      setFormError(err?.message || "Failed to load listing");
    } finally {
      setModalLoading(false);
    }
  };

  const uploadImagesToCloudinary = async (files: File[]) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset =
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "rideon_profiles";

    if (!cloudName) {
      throw new Error("Upload unavailable: Cloudinary is not configured.");
    }

    const uploadedUrls: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", "catalog/vehicles");

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const res = await fetch(cloudinaryUrl, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errorMessage = "Upload failed. Please try again.";
        try {
          const errorBody = await res.json();
          const apiMessage = errorBody?.error?.message;
          if (typeof apiMessage === "string" && apiMessage.trim()) {
            errorMessage = apiMessage;
          }
        } catch {
          // ignore
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      if (!data?.secure_url) {
        throw new Error("Upload succeeded but no URL was returned.");
      }
      uploadedUrls.push(data.secure_url);
    }

    return uploadedUrls;
  };

  const handleAddImageUrl = () => {
    const url = form.newImageUrl.trim();
    if (!url) return;

    setForm((prev) => ({
      ...prev,
      images: [...prev.images, url],
      newImageUrl: "",
    }));
  };

  const handleRemoveImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleImageFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    setImageUploadError(null);

    const invalidType = selected.find((f) => !f.type.startsWith("image/"));
    if (invalidType) {
      setImageUploadError("Please select image files only (JPEG, PNG, etc.).");
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }

    const tooLarge = selected.find((f) => f.size > 5 * 1024 * 1024);
    if (tooLarge) {
      setImageUploadError("Each image must be less than 5MB.");
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }

    setImageUploading(true);
    try {
      const uploadedUrls = await uploadImagesToCloudinary(selected);
      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }));
    } catch (err: any) {
      console.error("Car image upload error:", err);
      const isOffline =
        typeof navigator !== "undefined" && navigator.onLine === false;
      setImageUploadError(
        isOffline
          ? "You appear to be offline. Please reconnect and try again."
          : err?.message || "Failed to upload image. Please try again.",
      );
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setFormError(null);

    if (!editingId) {
      setFormError(
        "Creating vehicles from Admin Catalog is disabled. Vehicles must come from partner submissions.",
      );
      return;
    }

    // Validation
    if (!form.make.trim() || !form.model.trim()) {
      setFormError("Make and model are required.");
      return;
    }
    const hasPartnerBase = form.partnerBaseDayRateNgn > 0;
    const effectiveDayRate = hasPartnerBase
      ? computeCustomerUnitRateNgn({
          baseRateNgn: form.partnerBaseDayRateNgn,
          markupFixedNgn: form.adminMarkupFixedNgn,
        })
      : form.dayRateNgn;

    if (effectiveDayRate <= 0) {
      setFormError(
        "Customer day rate must be greater than 0 (either set customer day rate or partner base day rate).",
      );
      return;
    }
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();

      const url = `/api/admin/catalog/${editingId}`;
      const method = "PUT";

      const payload = {
        city: form.city,
        category: form.category,
        make: form.make,
        model: form.model,
        seats: form.seats,
        images: Array.isArray(form.images) ? form.images : [],
        adminActive: Boolean(form.adminActive),
        dayRateNgn: form.dayRateNgn,
        block4hRateNgn: form.block4hRateNgn,
        partnerBaseDayRateNgn: form.partnerBaseDayRateNgn,
        partnerBaseBlock4hRateNgn: form.partnerBaseBlock4hRateNgn,
        adminMarkupFixedNgn: form.adminMarkupFixedNgn,
        description: form.description,
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setShowModal(false);
      fetchListings();
    } catch (err: any) {
      setFormError(err.message || "Failed to save listing");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleteLoading(id);
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();

      const res = await fetch(`/api/admin/catalog/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete");

      setDeleteModal(null);
      fetchListings();
    } catch (err) {
      console.error(err);
      setError("Failed to delete listing");
    } finally {
      setDeleteLoading(null);
    }
  };

  // Filter listings by search
  const filteredListings = listings.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.make.toLowerCase().includes(q) ||
      l.model.toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q)
    );
  });

  // Stats
  const activeCount = listings.filter(
    (l) => l.status === "available" && l.adminActive !== false,
  ).length;
  const citiesCount = new Set(listings.map((l) => l.city)).size;
  const avgCustomerPrice = listings.length
    ? Math.round(
        listings.reduce((sum, l) => sum + l.dayRateNgn, 0) / listings.length,
      )
    : 0;
  const avgRideOnAddOn = listings.length
    ? Math.round(
        listings.reduce((sum, l) => sum + (l.adminMarkupFixedNgn || 0), 0) /
          listings.length,
      )
    : 0;

  const formatNgn = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg shadow-blue-500/30">
              <Car className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Catalog & Pricing
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Manage vehicle listings and pricing
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-48"
              />
            </div>
            <div className="w-[160px]">
              <Select
                value={cityFilter || "all"}
                onValueChange={(v) => setCityFilter(v === "all" ? "" : v)}
              >
                <SelectTrigger className="h-11 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-blue-500/50 cursor-pointer shadow-none">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[160px]">
              <Select
                value={statusFilter || "all"}
                onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
              >
                <SelectTrigger className="h-11 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-blue-500/50 cursor-pointer shadow-none">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <Car className="h-4 w-4" />
              <span className="text-sm">Active Listings</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {activeCount}
            </p>
          </div>
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <Building2 className="h-4 w-4" />
              <span className="text-sm">Cities Covered</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {citiesCount}
            </p>
          </div>
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Avg Customer Price</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatNgn(avgCustomerPrice)}
            </p>
          </div>
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-sm">Avg RideOn Add-on</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatNgn(avgRideOnAddOn)}
            </p>
          </div>
        </div>

        {/* Listings Table */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-500">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>{error}</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Car className="h-12 w-12 mb-3 text-slate-300 dark:text-slate-600" />
              <p>No listings found</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Listings are created via partner submissions.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Vehicle
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      City
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Partner/Day
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      RideOn Add-on
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Customer/Day
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                  {filteredListings.map((listing) => {
                    return (
                      <tr
                        key={listing.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center flex-shrink-0">
                              {listing.images?.[0] ? (
                                <img
                                  src={listing.images[0]}
                                  alt={`${listing.make} ${listing.model}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                {listing.make} {listing.model}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {listing.category} • {listing.seats} seats
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {listing.city}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">
                            {formatNgn(listing.partnerBaseDayRateNgn || 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-medium text-blue-600 dark:text-blue-400 text-sm">
                            {formatNgn(listing.adminMarkupFixedNgn || 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-slate-900 dark:text-white text-sm">
                            {formatNgn(listing.dayRateNgn)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                              listing.status === "available" &&
                              listing.adminActive !== false
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {listing.status}
                            {listing.adminActive === false ? " (hidden)" : ""}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(listing)}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ id: listing.id })}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Edit Listing
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {formError && (
                <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              {modalLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <>
                  {/* Vehicle Info */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      Vehicle Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                          City
                        </label>
                        <Select
                          value={form.city}
                          onValueChange={(v) => setForm({ ...form, city: v })}
                        >
                          <SelectTrigger className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-blue-500/50 cursor-pointer shadow-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CITIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2 flex items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center gap-2">
                          <input
                            id="adminActive"
                            type="checkbox"
                            checked={Boolean(form.adminActive)}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                adminActive: e.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label
                            htmlFor="adminActive"
                            className="text-xs font-medium text-slate-700 dark:text-slate-300"
                          >
                            Admin active (visible to customers)
                          </label>
                        </div>
                        <span
                          className={`text-[11px] font-semibold ${form.adminActive ? "text-green-700 dark:text-green-400" : "text-slate-500 dark:text-slate-400"}`}
                        >
                          {form.adminActive ? "Live" : "Hidden"}
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                          Category
                        </label>
                        <Select
                          value={form.category}
                          onValueChange={(v) =>
                            setForm({ ...form, category: v })
                          }
                        >
                          <SelectTrigger className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-blue-500/50 cursor-pointer shadow-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c.charAt(0).toUpperCase() + c.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                          Make
                        </label>
                        <input
                          type="text"
                          value={form.make}
                          onChange={(e) =>
                            setForm({ ...form, make: e.target.value })
                          }
                          placeholder="e.g. Toyota"
                          className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                          Model
                        </label>
                        <input
                          type="text"
                          value={form.model}
                          onChange={(e) =>
                            setForm({ ...form, model: e.target.value })
                          }
                          placeholder="e.g. Camry"
                          className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                          Seats
                        </label>
                        <input
                          type="number"
                          value={form.seats}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              seats: parseInt(e.target.value) || 4,
                            })
                          }
                          min={1}
                          max={50}
                          className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                          Images
                        </label>

                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="url"
                              value={form.newImageUrl}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  newImageUrl: e.target.value,
                                })
                              }
                              placeholder="Paste an image URL (optional)"
                              className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                            <button
                              type="button"
                              onClick={handleAddImageUrl}
                              className="px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                            >
                              Add URL
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <input
                              ref={imageInputRef}
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleImageFilesSelected}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => imageInputRef.current?.click()}
                              disabled={imageUploading}
                              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all disabled:opacity-50"
                            >
                              {imageUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <UploadCloud className="h-4 w-4" />
                              )}
                              {imageUploading
                                ? "Uploading..."
                                : "Upload Images"}
                            </button>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              PNG/JPG/WebP, max 5MB each
                            </span>
                          </div>

                          {imageUploadError && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                              <AlertCircle className="h-4 w-4 flex-shrink-0" />
                              {imageUploadError}
                            </div>
                          )}

                          {form.images.length === 0 ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              No images added yet.
                            </p>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {form.images.map((url, idx) => (
                                <div
                                  key={`${url}-${idx}`}
                                  className="relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60"
                                >
                                  <img
                                    src={url}
                                    alt={`Listing image ${idx + 1}`}
                                    className="w-full h-24 object-cover"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(idx)}
                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors"
                                    title="Remove image"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                  {idx === 0 && (
                                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/50 text-white text-[10px] font-semibold">
                                      Primary
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      Pricing (NGN)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 grid grid-cols-2 gap-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                        <div>
                          <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1.5">
                            Customer Day Rate
                          </label>
                          <input
                            type="number"
                            value={form.dayRateNgn || ""}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                dayRateNgn: parseInt(e.target.value) || 0,
                              })
                            }
                            placeholder="e.g. 50000"
                            className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            Leave this as-is if you are using partner base +
                            markup.
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1.5">
                            Customer 4h Rate
                          </label>
                          <input
                            type="number"
                            value={form.block4hRateNgn || ""}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                block4hRateNgn: parseInt(e.target.value) || 0,
                              })
                            }
                            placeholder="e.g. 25000"
                            className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            If partner base is set and 4h base is empty, we’ll
                            infer 50% of base day.
                          </p>
                        </div>
                      </div>

                      <div className="col-span-2 grid grid-cols-2 gap-4 p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30">
                        <div>
                          <label className="block text-xs font-medium text-amber-700 dark:text-amber-400 mb-1.5">
                            Partner Base Day Rate
                          </label>
                          <input
                            type="number"
                            value={form.partnerBaseDayRateNgn || ""}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                partnerBaseDayRateNgn:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                            placeholder="e.g. 40000"
                            className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-amber-700 dark:text-amber-400 mb-1.5">
                            Partner Base 4h Rate
                          </label>
                          <input
                            type="number"
                            value={form.partnerBaseBlock4hRateNgn || ""}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                partnerBaseBlock4hRateNgn:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                            placeholder="optional"
                            className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-amber-700 dark:text-amber-400 mb-1.5">
                            Admin Markup (Fixed)
                          </label>
                          <input
                            type="number"
                            value={form.adminMarkupFixedNgn || ""}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                adminMarkupFixedNgn:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                            placeholder="e.g. 5000"
                            className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        VAT is applied globally at checkout (7.5%).
                      </p>
                    </div>

                    {/* Pricing Preview */}
                    {(() => {
                      const hasPartnerBase =
                        form.partnerBaseDayRateNgn > 0 ||
                        form.partnerBaseBlock4hRateNgn > 0;
                      const effectiveDayRate =
                        hasPartnerBase && form.partnerBaseDayRateNgn > 0
                          ? computeCustomerUnitRateNgn({
                              baseRateNgn: form.partnerBaseDayRateNgn,
                              markupFixedNgn: form.adminMarkupFixedNgn,
                            })
                          : form.dayRateNgn;

                      const baseBlock =
                        form.partnerBaseBlock4hRateNgn > 0
                          ? form.partnerBaseBlock4hRateNgn
                          : form.partnerBaseDayRateNgn > 0
                            ? Math.round(form.partnerBaseDayRateNgn * 0.5)
                            : 0;
                      const effectiveBlockRate =
                        hasPartnerBase && baseBlock > 0
                          ? computeCustomerUnitRateNgn({
                              baseRateNgn: baseBlock,
                              markupFixedNgn: form.adminMarkupFixedNgn,
                            })
                          : form.block4hRateNgn;

                      if (!(effectiveDayRate > 0 || effectiveBlockRate > 0))
                        return null;
                      return (
                        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                            Pricing Preview
                          </p>
                          {effectiveDayRate > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                Computed customer day rate:
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {formatNgn(effectiveDayRate)}
                              </span>
                            </div>
                          )}
                          {effectiveBlockRate > 0 && (
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                Computed customer 4h rate:
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {formatNgn(effectiveBlockRate)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || modalLoading || imageUploading}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      <ActionModal
        isOpen={Boolean(deleteModal)}
        onClose={() => setDeleteModal(null)}
        title="Delete Listing"
        description={
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to delete this listing? This action cannot be
            undone.
          </div>
        }
        confirmText="Delete"
        confirmVariant="destructive"
        loading={Boolean(deleteModal && deleteLoading === deleteModal.id)}
        onConfirm={() => {
          if (!deleteModal) return;
          return handleDelete(deleteModal.id);
        }}
      />
    </div>
  );
}
