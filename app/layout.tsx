import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Campus Energy Triage System | Facilities AI & MLOps',
  description: 'Context-aware campus energy anomaly triage and facilities MLOps platform distinguishing actionable waste, authorized operational loads, and telemetry faults.',
  openGraph: {
    title: 'Campus Energy Triage System',
    description: 'Context-aware campus energy anomaly triage and facilities MLOps platform distinguishing actionable waste, authorized operational loads, and telemetry faults.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Campus Energy Triage System',
    description: 'Context-aware campus energy anomaly triage and facilities MLOps platform distinguishing actionable waste, authorized operational loads, and telemetry faults.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
