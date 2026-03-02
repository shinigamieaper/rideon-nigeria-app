"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Settings2, MapPin, Loader2, Plus, X } from "lucide-react";
import { auth } from "@/lib/firebase";

interface ServiceCity {
  name: string;
  enabled: boolean;
  activeDrivers: number;
  onlineDrivers: number;
}

export default function OperationsPage() {
  const [error, setError] = useState<string | null>(null);

  // Cities state
  const [cities, setCities] = useState<ServiceCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [showAddCity, setShowAddCity] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [addCityLoading, setAddCityLoading] = useState(false);

  const fetchCities = useCallback(async () => {
    try {
      setCitiesLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/operations/cities", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error("Failed to fetch cities");
        return;
      }

      const data = await res.json();
      setCities(data.cities || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchCities();
      }
    });
    return () => unsubscribe();
  }, [fetchCities]);

  const handleAddCity = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCityName.trim()) return;

    try {
      setAddCityLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/operations/cities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newCityName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add city");
      }

      setShowAddCity(false);
      setNewCityName("");
      fetchCities();
    } catch (err: any) {
      setError(err.message || "Failed to add city");
    } finally {
      setAddCityLoading(false);
    }
  };

  const handleToggleCity = async (cityName: string, enabled: boolean) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/admin/operations/cities", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: cityName, enabled }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update city");
      }

      fetchCities();
    } catch (err: any) {
      setError(err.message || "Failed to update city");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg shadow-blue-500/30">
              <Settings2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Operations
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Service city configuration
              </p>
            </div>
          </div>
        </div>

        {error && <p className="mb-6 text-xs text-red-500">{error}</p>}

        <div className="grid grid-cols-1 gap-8">
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Service Cities
              </h2>
              <button
                onClick={() => setShowAddCity(true)}
                className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Plus className="h-4 w-4" />
                Add City
              </button>
            </div>

            {/* Add City Form */}
            {showAddCity && (
              <form
                onSubmit={handleAddCity}
                className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCityName}
                    onChange={(e) => setNewCityName(e.target.value)}
                    placeholder="Enter city name..."
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={addCityLoading || !newCityName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {addCityLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Add"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCity(false);
                      setNewCityName("");
                    }}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                  >
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {citiesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : cities.length === 0 ? (
                <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">
                  No service cities configured. Click &quot;Add City&quot; to
                  get started.
                </p>
              ) : (
                cities.map((city) => (
                  <div
                    key={city.name}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin
                        className={`h-5 w-5 ${city.enabled ? "text-blue-500" : "text-slate-400"}`}
                      />
                      <div>
                        <p
                          className={`font-medium text-sm ${city.enabled ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
                        >
                          {city.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {city.activeDrivers} driver
                          {city.activeDrivers === 1 ? "" : "s"} •{" "}
                          {city.onlineDrivers} online
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleCity(city.name, !city.enabled)}
                      className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        city.enabled
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600"
                      }`}
                    >
                      {city.enabled ? "Active" : "Disabled"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
