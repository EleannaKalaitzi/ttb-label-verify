import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
