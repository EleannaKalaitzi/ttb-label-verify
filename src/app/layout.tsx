import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Bundled in-repo (no CDN, no build/runtime network) — consistent with the
// firewall constraint. JetBrains Mono gives the technical, typewritten feel.
const mono = localFont({
  src: './fonts/jetbrains-mono.woff2',
  variable: '--font-mono',
  display: 'swap',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'TTB Label Verification',
  description:
    'Verify a distilled-spirits label against its application and the federal labeling regulations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={mono.variable}>
      <body>{children}</body>
    </html>
  );
}
