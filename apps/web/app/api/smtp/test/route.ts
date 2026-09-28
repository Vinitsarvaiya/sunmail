import { NextResponse, type NextRequest } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { host, port, encryption, username, password } = body;

    if (!host || !username || !password) {
      return NextResponse.json(
        { success: false, message: 'Host, username, and password are required' },
        { status: 400 }
      );
    }

    const portNum = parseInt(port, 10) || 587;
    const isSecure = encryption === 'TLS' || portNum === 465;
    const requireTls = encryption === 'STARTTLS';
    const ignoreTls = encryption === 'None';

    const transporter = nodemailer.createTransport({
      host,
      port: portNum,
      secure: isSecure,
      requireTLS: requireTls,
      ignoreTLS: ignoreTls,
      auth: {
        user: username,
        pass: password,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
      connectionTimeout: 10000,
      greetingTimeout: 8000,
    } as any);

    await transporter.verify();

    return NextResponse.json({
      success: true,
      message: 'SMTP connection and authentication verified successfully!',
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err.message || 'Failed to authenticate with target SMTP server',
    });
  }
}
