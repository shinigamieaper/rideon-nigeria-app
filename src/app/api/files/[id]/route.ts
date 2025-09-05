import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { GridFSBucket, ObjectId } from 'mongodb';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing file id.' }, { status: 400 });
    }

    const _id = new ObjectId(id);

    const db = await getDb();
    const filesCol = db.collection('uploads.files');

    // Minimal projection per rule
    const fileDoc = await filesCol.findOne(
      { _id },
      { projection: { filename: 1, metadata: 1 } }
    );

    if (!fileDoc) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    const contentType = fileDoc.metadata?.contentType || 'application/octet-stream';
    const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
    const stream = bucket.openDownloadStream(_id);

    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        stream.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
        stream.on('error', (err) => controller.error(err));
        stream.on('end', () => controller.close());
      },
      cancel() {
        stream.destroy();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error in files/[id]:', error);
    return NextResponse.json({ error: 'Failed to fetch file.' }, { status: 500 });
  }
}
