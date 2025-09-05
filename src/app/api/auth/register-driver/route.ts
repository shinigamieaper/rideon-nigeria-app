import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { getDb } from '@/lib/mongodb';

export const runtime = 'nodejs';

// Explicit MongoDB collection types
interface UserDoc {
  _id: string; // Firebase UID as string
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DriverDoc {
  userId: string; // references Firebase UID
  status: 'pending_review' | 'approved' | 'rejected';
  placementStatus: 'available' | 'placed';
  experienceYears: number;
  vehicle: { make: string; model: string; year: number; licensePlate: string };
  documents: { driversLicenseUrl: string; lasdriCardUrl: string; vehicleRegistrationUrl: string };
  createdAt?: Date;
  updatedAt?: Date;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length)
      : '';

    if (!token) {
      throw new Error('Missing Authorization Bearer token');
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      experienceYears,
      vehicle,
      documents,
    }: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber: string;
      experienceYears: number;
      vehicle: { make: string; model: string; year: number; licensePlate: string };
      documents: { driversLicenseUrl: string; lasdriCardUrl: string; vehicleRegistrationUrl: string };
    } = body;

    const db = await getDb();
    const usersCol = db.collection<UserDoc>('users');
    const driversCol = db.collection<DriverDoc>('drivers');

    // Users collection: _id = uid
    await usersCol.updateOne(
      { _id: uid },
      {
        $set: {
          role: 'driver',
          firstName,
          lastName,
          email,
          phoneNumber,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Drivers collection: one-to-one via userId
    await driversCol.updateOne(
      { userId: uid },
      {
        $set: {
          userId: uid,
          status: 'pending_review',
          placementStatus: 'available',
          experienceYears,
          vehicle: {
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            licensePlate: vehicle.licensePlate,
          },
          documents: {
            driversLicenseUrl: documents.driversLicenseUrl,
            lasdriCardUrl: documents.lasdriCardUrl,
            vehicleRegistrationUrl: documents.vehicleRegistrationUrl,
          },
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Set custom claim role=driver (merge with existing)
    const userRecord = await adminAuth.getUser(uid);
    const existingClaims = userRecord.customClaims || {};
    await adminAuth.setCustomUserClaims(uid, { ...existingClaims, role: 'driver' });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error in register-driver:', error);
    return NextResponse.json({ error: 'Failed to register driver application.' }, { status: 500 });
  }
}
