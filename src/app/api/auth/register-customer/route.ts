import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { getDb } from '@/lib/mongodb';

export const runtime = 'nodejs';

interface UserDoc {
  _id: string; // Firebase UID
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length)
      : '';

    if (!token) throw new Error('Missing Authorization Bearer token');

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const { firstName, lastName, phoneNumber } = (await req.json()) as {
      firstName: string;
      lastName: string;
      phoneNumber: string;
    };

    // Derive email from decoded token or user record to ensure consistency
    let email = decoded.email || '';
    if (!email) {
      const userRecord = await adminAuth.getUser(uid);
      email = userRecord.email || '';
    }

    if (!firstName || !lastName || !phoneNumber) {
      throw new Error('Missing required fields.');
    }

    if (!email) {
      throw new Error('Email not found on authenticated user.');
    }

    const db = await getDb();
    const usersCol = db.collection<UserDoc>('users');

    // Upsert user document keyed by Firebase UID
    await usersCol.updateOne(
      { _id: uid },
      {
        $set: {
          role: 'customer',
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

    // Set custom claim role=customer
    const userRecord = await adminAuth.getUser(uid);
    const existingClaims = userRecord.customClaims || {};
    await adminAuth.setCustomUserClaims(uid, { ...existingClaims, role: 'customer' });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error in register-customer:', error);
    return NextResponse.json(
      { error: 'Failed to register customer.' },
      { status: 500 }
    );
  }
}
