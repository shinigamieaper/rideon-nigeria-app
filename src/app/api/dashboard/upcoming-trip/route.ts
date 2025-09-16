import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface BookingDoc {
  _id: string;
  customerId: string;
  scheduledPickupTime: Date;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) {
      // Not authenticated – return null data gracefully
      return NextResponse.json({ upcomingTrip: null }, { status: 200 });
    }

    // Defer Firebase Admin import until a token exists
    const { adminAuth } = await import('@/lib/firebaseAdmin');
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Defer MongoDB import and connection until after auth is verified
    const { getDb } = await import('@/lib/mongodb');

    const db = await getDb();
    const col = db.collection<BookingDoc>('bookings');

    const now = new Date();

    const upcoming = await col.find(
      {
        customerId: uid,
        scheduledPickupTime: { $gte: now },
        status: { $in: ['requested', 'confirmed', 'driver_assigned', 'en_route', 'in_progress'] },
      },
      {
        projection: {
          _id: 1,
          scheduledPickupTime: 1,
          pickupAddress: 1,
          dropoffAddress: 1,
        },
        sort: { scheduledPickupTime: 1 },
        limit: 1,
      }
    ).toArray();

    const doc = upcoming[0] ?? null;
    return NextResponse.json({
      upcomingTrip: doc
        ? {
            _id: String(doc._id),
            scheduledPickupTime: doc.scheduledPickupTime,
            pickupAddress: doc.pickupAddress,
            dropoffAddress: doc.dropoffAddress,
          }
        : null,
    });
  } catch (error) {
    console.error('Error in GET /api/dashboard/upcoming-trip:', error);
    return NextResponse.json({ error: 'Failed to fetch upcoming trip.' }, { status: 500 });
  }
}
