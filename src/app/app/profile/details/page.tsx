import { ProfileForm } from "@/components";

export default function Page() {
  return (
    <div className="py-6">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Update your personal information.
        </p>
      </div>
      <div className="mt-4">
        <ProfileForm />
      </div>
    </div>
  );
}
