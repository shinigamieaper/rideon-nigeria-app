import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface Point { lat: number; lng: number }

function haversineKm(a: Point, b: Point): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

export async function POST(req: Request) {
  try {
    const { pickup, dropoff } = (await req.json()) as {
      pickup?: Partial<Point>;
      dropoff?: Partial<Point>;
    };

    if (!pickup?.lat || !pickup?.lng || !dropoff?.lat || !dropoff?.lng) {
      throw new Error('Missing pickup/dropoff coordinates');
    }

    const distanceKm = Math.max(1, haversineKm(pickup as Point, dropoff as Point));

    // Simple fixed-fare model (can be replaced by a more sophisticated distance/zone pricing later)
    const classes = [
      {
        id: 'saloon',
        name: 'Professional Saloon',
        capacity: 3,
        imageUrl: '',
        price: Math.round((1500 + 550 * distanceKm) / 100) * 100,
      },
      {
        id: 'suv',
        name: 'Executive SUV',
        capacity: 4,
        imageUrl: '',
        price: Math.round((2500 + 800 * distanceKm) / 100) * 100,
      },
      {
        id: 'van',
        name: 'Group Van',
        capacity: 7,
        imageUrl: '',
        price: Math.round((3000 + 1000 * distanceKm) / 100) * 100,
      },
    ];

    return NextResponse.json(
      {
        distanceKm: Number(distanceKm.toFixed(1)),
        vehicleClasses: classes,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/fares/calculate:', error);
    return NextResponse.json({ error: 'Failed to calculate fares.' }, { status: 500 });
  }
}
