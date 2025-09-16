import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

interface BookingDoc {
  _id: string;
  customerId: string;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledPickupTime?: Date;
  completionTime?: Date;
  status: string;
  fare?: number;
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) {
      return NextResponse.json({ activity: [] }, { status: 200 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Defer MongoDB import and connection until after auth is verified
    const { getDb } = await import('@/lib/mongodb');

    const db = await getDb();
    const col = db.collection<BookingDoc>('bookings');

    // Fetch 3 most recent items (completed or cancelled) for this customer
    const recent = await col
      .find(
        {
          customerId: uid,
          status: { $in: ['completed', 'cancelled_by_customer', 'cancelled_by_driver'] },
        },
        {
          projection: {
            _id: 1,
            pickupAddress: 1,
            dropoffAddress: 1,
            completionTime: 1,
            scheduledPickupTime: 1,
            status: 1,
            fare: 1,
          },
          sort: { completionTime: -1 },
          limit: 3,
        }
      )
      .toArray();

    const activity = recent.map((doc) => ({
      id: String(doc._id),
      type:
        doc.status === 'completed'
          ? 'completed'
          : doc.status?.startsWith('cancelled')
          ? 'cancelled'
          : 'other',
      description:
        doc.status === 'completed'
          ? `Trip Completed: ${doc.pickupAddress} to ${doc.dropoffAddress}`
          : `Trip Cancelled: ${doc.pickupAddress} to ${doc.dropoffAddress}`,
      timestamp: (doc.completionTime ?? doc.scheduledPickupTime ?? new Date()).toISOString(),
      amount: typeof doc.fare === 'number' ? doc.fare : undefined,
    }));

    return NextResponse.json({ activity }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/dashboard/recent-activity:', error);
    return NextResponse.json({ error: 'Failed to fetch recent activity.' }, { status: 500 });
  }
}
