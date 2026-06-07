import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aura — Agentic Family Mirror',
  description: 'Smart mirror dashboard for the Mehta family',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
