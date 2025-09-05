import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { getDb } from '@/lib/mongodb';
import { GridFSBucket } from 'mongodb';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length)
      : '';

    if (!token) {
      throw new Error('Missing Authorization Bearer token.');
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const form = await req.formData();

    const toFile = (v: FormDataEntryValue | null, name: string): File => {
      if (!(v instanceof File) || v.size === 0) {
        throw new Error(`Missing or invalid ${name} file`);
      }
      return v;
    };

    const driversLicense = toFile(form.get('driversLicense'), 'driversLicense');
    const lasdriCard = toFile(form.get('lasdriCard'), 'lasdriCard');
    const vehicleRegistration = toFile(form.get('vehicleRegistration'), 'vehicleRegistration');

    const db = await getDb();
    const bucket = new GridFSBucket(db, { bucketName: 'uploads' });

    const save = async (file: File, key: string) => {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const filename = `drivers/${uid}/${key}-${Date.now()}.${ext}`;
      const contentType = file.type || 'application/octet-stream';

      const buffer = Buffer.from(await file.arrayBuffer());

      return await new Promise<{ id: string; url: string }>((resolve, reject) => {
        const upload = bucket.openUploadStream(filename, {
          metadata: { contentType, uid, key },
        });
        upload.once('finish', () => {
          const id = String(upload.id);
          resolve({ id, url: `/api/files/${id}` });
        });
        upload.once('error', reject);
        upload.end(buffer);
      });
    };

    const [dl, lc, vr] = await Promise.all([
      save(driversLicense, 'drivers-license'),
      save(lasdriCard, 'lasdri-card'),
      save(vehicleRegistration, 'vehicle-registration'),
    ]);

    return NextResponse.json(
      {
        driversLicenseUrl: dl.url,
        lasdriCardUrl: lc.url,
        vehicleRegistrationUrl: vr.url,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in uploads/driver-docs:', error);
    return NextResponse.json({ error: 'Failed to upload documents.' }, { status: 500 });
  }
}
