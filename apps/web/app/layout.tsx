import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SunMail — Email Receiving & SMTP Relay SaaS',
  description: 'Connect custom domains, receive inbound emails on high-availability VPS, and relay to customer SMTP endpoints with zero friction.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#09090b] text-[#fafafa] antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
