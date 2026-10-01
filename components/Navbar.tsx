'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldAlert, Zap, RotateCcw } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/scenarios/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: 42 }),
      });
      if (res.ok) {
        setResetMsg('Scenarios reset to seed 42');
        setTimeout(() => setResetMsg(null), 3000);
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setResetting(false);
    }
  };

  const navLinks = [
    { href: '/', label: 'Campus Overview' },
    { href: '/anomalies', label: 'Anomaly Queue' },
    { href: '/buildings/Building_A_Lecture', label: 'Facilities' },
    { href: '/feedback', label: 'Feedback Ledger' },
    { href: '/mlops', label: 'MLOps Pipeline' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand title, single line */}
        <Link href="/" className="flex items-center gap-2.5 text-slate-900 hover:text-emerald-700 transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
            <Zap className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight text-base sm:text-lg">
            Campus Energy Triage
          </span>
        </Link>

        {/* Zone 2: 4-6 clean text navigation links with subtle underline/active state */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          {navLinks.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors py-1 ${
                  isActive
                    ? 'text-slate-950 font-semibold border-b-2 border-emerald-600'
                    : 'hover:text-slate-900'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          {resetMsg && (
            <span className="text-xs text-emerald-700 font-medium hidden sm:inline">
              {resetMsg}
            </span>
          )}
          <button
            onClick={handleReset}
            disabled={resetting}
            title="Reset dataset & 4 demonstration scenarios to seed 42"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200/60"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reset Scenarios</span>
          </button>
          <Link
            href="/anomalies"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-950 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-emerald-400" />
            <span>Triage Queue</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
