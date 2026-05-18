import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CoBuild — construction labour coordination',
  description: 'The operating system for construction execution.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
