import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface PaymentMethodDoc {
  _id: string; // string id
  userId: string;
  brand: string;
  last4: string;
  authorizationCode?: string; // sensitive - do not return to client
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) {
      // Anonymous users get empty list
      return NextResponse.json({ methods: [] }, { status: 200 });
    }

    const { adminAuth } = await import('@/lib/firebaseAdmin');
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const { getDb } = await import('@/lib/mongodb');
    const db = await getDb();
    const col = db.collection<PaymentMethodDoc>('payment_methods');

    const methods = await col
      .find({ userId: uid }, {
        projection: { _id: 1, brand: 1, last4: 1, isDefault: 1 },
        sort: { isDefault: -1, createdAt: -1 },
      })
      .toArray();

    return NextResponse.json({
      methods: methods.map((m) => ({ id: String(m._id), brand: m.brand, last4: m.last4, isDefault: !!m.isDefault })),
    });
  } catch (error) {
    console.error('Error in GET /api/users/me/payment-methods:', error);
    return NextResponse.json({ error: 'Failed to fetch payment methods.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) throw new Error('Missing Authorization Bearer token');

    const { adminAuth } = await import('@/lib/firebaseAdmin');
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const body = (await req.json()) as {
      brand: string;
      last4: string;
      authorizationCode?: string;
      makeDefault?: boolean;
    };

    if (!body.brand || !body.last4) throw new Error('Missing brand or last4');

    const { getDb } = await import('@/lib/mongodb');
    const db = await getDb();
    const col = db.collection<PaymentMethodDoc>('payment_methods');

    const id = crypto.randomUUID();
    const doc: PaymentMethodDoc = {
      _id: id,
      userId: uid,
      brand: body.brand,
      last4: body.last4,
      authorizationCode: body.authorizationCode,
      isDefault: !!body.makeDefault,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (body.makeDefault) {
      await col.updateMany({ userId: uid, isDefault: true }, { $set: { isDefault: false } });
    }

    await col.insertOne(doc);

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/users/me/payment-methods:', error);
    return NextResponse.json({ error: 'Failed to save payment method.' }, { status: 500 });
  }
}
