export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { createAuditLog } from "@/lib/auditLog";
import { requireAdmin } from "@/lib/adminRbac";

interface ServiceCity {
  name: string;
  enabled: boolean;
  activeDrivers: number;
  onlineDrivers: number;
}

/**
 * GET /api/admin/operations/cities
 * Fetch service cities with live driver counts
 */
export async function GET(req: NextRequest) {
  try {
    const { response } = await requireAdmin(req, [
      "super_admin",
      "admin",
      "ops_admin",
    ]);
    if (response) return response;

    // Fetch config for service cities
    const configDoc = await adminDb
      .collection("config")
      .doc("service_cities")
      .get();

    let configuredCities: { name: string; enabled: boolean }[] = [];

    if (configDoc.exists) {
      const data = configDoc.data();
      configuredCities = data?.cities || [];
    } else {
      // Default cities if no config exists
      configuredCities = [
        { name: "Lagos", enabled: true },
        { name: "Abuja", enabled: true },
        { name: "Port Harcourt", enabled: true },
        { name: "Ibadan", enabled: true },
      ];

      // Create the config document with defaults
      await adminDb.collection("config").doc("service_cities").set({
        cities: configuredCities,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Fetch driver counts per city
    const cities: ServiceCity[] = [];

    for (const cityConfig of configuredCities) {
      // Count approved drivers in this city
      const approvedQuery = await adminDb
        .collection("drivers")
        .where("status", "==", "approved")
        .where("servedCities", "array-contains", cityConfig.name)
        .get();

      // Count online drivers in this city
      const onlineQuery = await adminDb
        .collection("drivers")
        .where("status", "==", "approved")
        .where("onlineStatus", "==", true)
        .where("servedCities", "array-contains", cityConfig.name)
        .get();

      cities.push({
        name: cityConfig.name,
        enabled: cityConfig.enabled,
        activeDrivers: approvedQuery.size,
        onlineDrivers: onlineQuery.size,
      });
    }

    return NextResponse.json({ cities }, { status: 200 });
  } catch (error) {
    console.error("Error fetching service cities:", error);
    return NextResponse.json(
      { error: "Failed to fetch service cities." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/operations/cities
 * Add a new service city
 * Body: { name: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { caller, response } = await requireAdmin(req, [
      "super_admin",
      "ops_admin",
    ]);
    if (response) return response;

    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "City name is required" },
        { status: 400 },
      );
    }

    const cityName = name.trim();

    // Get current config
    const configDoc = await adminDb
      .collection("config")
      .doc("service_cities")
      .get();
    let cities: { name: string; enabled: boolean }[] = [];

    if (configDoc.exists) {
      cities = configDoc.data()?.cities || [];
    }

    // Check if city already exists
    if (cities.some((c) => c.name.toLowerCase() === cityName.toLowerCase())) {
      return NextResponse.json(
        { error: "City already exists" },
        { status: 400 },
      );
    }

    // Add new city
    cities.push({ name: cityName, enabled: true });

    await adminDb.collection("config").doc("service_cities").set({
      cities,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: caller!.uid,
    });

    await createAuditLog({
      actionType: "config_service_cities_updated",
      actorId: caller!.uid,
      actorEmail: caller!.email || "admin",
      targetId: "service_cities",
      targetType: "config",
      details: `Added service city ${cityName}`,
      metadata: { city: cityName, operation: "add" },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Added ${cityName} as a service city`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error adding service city:", error);
    return NextResponse.json(
      { error: "Failed to add service city." },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/operations/cities
 * Toggle city enabled status
 * Body: { name: string, enabled: boolean }
 */
export async function PATCH(req: NextRequest) {
  try {
    const { caller, response } = await requireAdmin(req, [
      "super_admin",
      "ops_admin",
    ]);
    if (response) return response;

    const body = await req.json();
    const { name, enabled } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "City name is required" },
        { status: 400 },
      );
    }

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Enabled status is required" },
        { status: 400 },
      );
    }

    // Get current config
    const configDoc = await adminDb
      .collection("config")
      .doc("service_cities")
      .get();

    if (!configDoc.exists) {
      return NextResponse.json(
        { error: "Service cities not configured" },
        { status: 404 },
      );
    }

    const cities: { name: string; enabled: boolean }[] =
      configDoc.data()?.cities || [];

    // Find and update the city
    const cityIndex = cities.findIndex(
      (c) => c.name.toLowerCase() === name.toLowerCase(),
    );
    if (cityIndex === -1) {
      return NextResponse.json({ error: "City not found" }, { status: 404 });
    }

    cities[cityIndex].enabled = enabled;

    await adminDb.collection("config").doc("service_cities").set({
      cities,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: caller!.uid,
    });

    await createAuditLog({
      actionType: "config_service_cities_updated",
      actorId: caller!.uid,
      actorEmail: caller!.email || "admin",
      targetId: "service_cities",
      targetType: "config",
      details: `Updated service city ${name} to ${enabled ? "enabled" : "disabled"}`,
      metadata: { city: name, enabled, operation: "toggle" },
    });

    return NextResponse.json(
      {
        success: true,
        message: `${name} is now ${enabled ? "enabled" : "disabled"}`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating service city:", error);
    return NextResponse.json(
      { error: "Failed to update service city." },
      { status: 500 },
    );
  }
}
