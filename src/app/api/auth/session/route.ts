import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length)
      : '';

    if (!token) {
      throw new Error('Missing Authorization Bearer token');
    }

    // Verify token using Firebase Admin
    const decoded = await adminAuth.verifyIdToken(token);

    // Set HttpOnly session cookie
    const ck = await cookies();
    const isProd = process.env.NODE_ENV === 'production';
    const maxAge = decoded.exp && decoded.iat ? decoded.exp - decoded.iat : 60 * 60; // seconds
    const expires = decoded.exp ? new Date(decoded.exp * 1000) : undefined;

    ck.set('rideon_id_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge,
      expires,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/auth/session:', error);
    return NextResponse.json(
      { error: 'Failed to establish session.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const ck = await cookies();
    ck.set('rideon_id_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/auth/session:', error);
    return NextResponse.json(
      { error: 'Failed to clear session.' },
      { status: 500 }
    );
  }
}
