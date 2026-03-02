"use client";

import * as React from "react";
import { Camera, Loader2, Upload, X } from "lucide-react";

export interface ProfilePhotoUploadProps
  extends React.ComponentPropsWithoutRef<"div"> {
  currentPhotoUrl?: string | null;
  onPhotoChange: (photoUrl: string) => void;
  uploading?: boolean;
  required?: boolean;
  label?: string;
  helperText?: string;
  folder?: string;
  uploadPreset?: string;
}

const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = ({
  currentPhotoUrl,
  onPhotoChange,
  uploading: externalUploading = false,
  required = false,
  label = "Professional Photo",
  helperText = "Upload a clear, professional headshot. This photo will be visible to clients.",
  folder = "driver_profiles",
  uploadPreset: uploadPresetProp,
  className,
  ...divProps
}) => {
  const [localUploading, setLocalUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const uploading = externalUploading || localUploading;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPEG, PNG, etc.)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setError(null);
    setLocalUploading(true);

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset =
        uploadPresetProp ||
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
        "rideon_profiles";

      if (!cloudName) {
        throw new Error(
          "Upload unavailable: Cloudinary cloud name is not configured.",
        );
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", folder);

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
        } catch (parseErr) {
          console.warn("Failed to parse Cloudinary error response", parseErr);
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      if (!data?.secure_url) {
        throw new Error("Upload succeeded but no URL was returned.");
      }
      onPhotoChange(data.secure_url);
    } catch (err: any) {
      console.error("Photo upload error:", err);
      const isOffline =
        typeof navigator !== "undefined" && navigator.onLine === false;
      setError(
        isOffline
          ? "You appear to be offline. Please reconnect and try again."
          : err?.message || "Failed to upload photo. Please try again.",
      );
    } finally {
      setLocalUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemovePhoto = () => {
    onPhotoChange("");
    setError(null);
  };

  const wrapperClasses = [className].filter(Boolean).join(" ");

  return (
    <div {...divProps} className={wrapperClasses}>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="flex items-start gap-4">
        {/* Photo Preview */}
        <div className="relative flex-shrink-0">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700">
            {currentPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentPhotoUrl}
                alt="Profile photo"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Camera className="w-8 h-8 text-slate-400" />
              </div>
            )}
          </div>

          {currentPhotoUrl && !uploading && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition"
              aria-label="Remove photo"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id="profile-photo-input"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={[
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
              "bg-blue-600 text-white font-medium",
              "hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              "transition-colors",
            ].join(" ")}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {currentPhotoUrl ? "Change Photo" : "Upload Photo"}
              </>
            )}
          </button>

          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            {helperText}
          </p>

          {error && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
            JPG, PNG, or GIF. Max 5MB.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePhotoUpload;
