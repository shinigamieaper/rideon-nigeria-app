import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface LocationValue { address: string; lat?: number; lng?: number; placeId?: string }
interface VehicleClassOption { id: string; name: string; capacity: number; price: number }

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) throw new Error('Missing Authorization Bearer token');

    const { adminAuth } = await import('@/lib/firebaseAdmin');
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const {
      pickup,
      dropoff,
      vehicle,
      schedule,
      notes,
      paymentMethodId,
      fare,
    } = (await req.json()) as {
      pickup: LocationValue;
      dropoff: LocationValue;
      vehicle: VehicleClassOption;
      schedule: { date: string; time: string };
      notes?: string;
      paymentMethodId: string;
      fare: { base: number; taxes: number; fees: number; total: number };
    };

    if (!pickup?.address || !dropoff?.address) throw new Error('Invalid route data');
    if (!vehicle?.id || !vehicle?.price) throw new Error('Invalid vehicle data');
    if (!schedule?.date || !schedule?.time) throw new Error('Invalid schedule');
    if (!paymentMethodId) throw new Error('Missing payment method');
    if (!fare?.total || fare.total <= 0) throw new Error('Invalid fare');

    const scheduledPickupTime = new Date(`${schedule.date}T${schedule.time}:00`);
    if (Number.isNaN(scheduledPickupTime.getTime()) || scheduledPickupTime.getTime() <= Date.now()) {
      throw new Error('Pickup time must be in the future');
    }

    const { getDb } = await import('@/lib/mongodb');
    const db = await getDb();

    // Decide payment mode first
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    const MOCK = process.env.PAYMENTS_MODE === 'mock' || !PAYSTACK_SECRET_KEY;

    // If not in mock mode, fetch payment method and ensure authorization code exists
    let authorizationCode: string | null = null;
    if (!MOCK) {
      const pmCol = db.collection<{ _id: string; userId: string; authorizationCode?: string }>('payment_methods');
      const pm = await pmCol.findOne(
        { _id: paymentMethodId, userId: uid },
        { projection: { authorizationCode: 1 } }
      );
      if (!pm?.authorizationCode) throw new Error('Payment method missing authorization');
      authorizationCode = pm.authorizationCode;
    }

    // Amount in kobo
    const amountKobo = fare.total * 100;

    // Ensure an email is available for Paystack
    let email = decoded.email || '';
    if (!email) {
      const rec = await adminAuth.getUser(uid);
      email = rec.email || '';
    }

    let transactionId = '';
    if (!MOCK) {
      const chargeRes = await fetch('https://api.paystack.co/transaction/charge_authorization', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          authorization_code: authorizationCode,
          amount: amountKobo,
          currency: 'NGN',
          metadata: { purpose: 'ride_booking', vehicleId: vehicle.id },
        }),
      });

      const chargeJson = await chargeRes.json();
      if (!chargeRes.ok || chargeJson?.status !== true || chargeJson?.data?.status !== 'success') {
        throw new Error('Payment failed');
      }
      transactionId = String(chargeJson?.data?.reference || chargeJson?.data?.id || '');
    } else {
      // Mock payment success for development
      transactionId = `mock_${crypto.randomUUID()}`;
    }

    // Insert booking document
    const bookings = db.collection('bookings');
    const bookingDoc = {
      customerId: uid,
      pickupAddress: pickup.address,
      dropoffAddress: dropoff.address,
      pickupLocation: pickup.lat && pickup.lng ? { type: 'Point', coordinates: [pickup.lng, pickup.lat] } : undefined,
      dropoffLocation: dropoff.lat && dropoff.lng ? { type: 'Point', coordinates: [dropoff.lng, dropoff.lat] } : undefined,
      scheduledPickupTime,
      status: 'confirmed',
      fare: {
        base: fare.base,
        taxes: fare.taxes,
        fees: fare.fees,
        total: fare.total,
        payment: {
          transactionId,
          status: 'succeeded',
        },
      },
      vehicleInfo: { name: vehicle.name },
      createdAt: new Date(),
    } as any;

    await bookings.insertOne(bookingDoc);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/bookings:', error);
    return NextResponse.json({ error: 'Failed to create booking.' }, { status: 500 });
  }
}
