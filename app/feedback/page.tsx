'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import {
  CheckCircle2,
  FileCheck,
  Filter,
  Layers,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import { HumanFeedback } from '@/types/energy';

interface FeedbackStats {
  total: number;
  agreement_rate: number;
  approved: number;
  disapproved: number;
  acknowledged: number;
  maintenance_dispatched: number;
  resolved_custom: number;
}

export default function FeedbackLedgerPage() {
  const [feedback, setFeedback] = useState<HumanFeedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterDecision, setFilterDecision] = useState('ALL');

  useEffect(() => {
    fetch('/api/feedback')
      .then((res) => res.json())
      .then((data) => {
        setFeedback(data.feedback || []);
        setStats(data.stats || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filtered = feedback.filter((f) => {
    if (filterDecision !== 'ALL' && f.human_decision !== filterDecision) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Human-in-the-Loop Governance</span>
            <span aria-hidden="true">·</span>
            <span>Audit Ledger</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Supervisory Feedback & Decision Records
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Every operational decision made by facility managers is persisted with model version provenance, feeding automated drift detection and candidate retraining gates.
          </p>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs text-slate-500">Total Decisions</span>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {stats.total}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs text-slate-500">Agreement Rate</span>
              <p className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                {(stats.agreement_rate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs text-slate-500">Approved</span>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {stats.approved}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs text-slate-500">Disapproved</span>
              <p className="text-xl font-bold font-mono tabular-nums text-rose-700 mt-1">
                {stats.disapproved}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs text-slate-500">Acknowledged</span>
              <p className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                {stats.acknowledged}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs text-slate-500">Maintenance</span>
              <p className="text-xl font-bold font-mono tabular-nums text-amber-700 mt-1">
                {stats.maintenance_dispatched}
              </p>
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex items-center gap-2 p-1 bg-slate-200/50 rounded-lg w-fit">
          <button
            onClick={() => setFilterDecision('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterDecision === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Decisions
          </button>
          <button
            onClick={() => setFilterDecision('APPROVED')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterDecision === 'APPROVED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilterDecision('DISAPPROVED')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterDecision === 'DISAPPROVED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Disapproved
          </button>
          <button
            onClick={() => setFilterDecision('ACKNOWLEDGED')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterDecision === 'ACKNOWLEDGED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Acknowledged
          </button>
          <button
            onClick={() => setFilterDecision('MAINTENANCE_DISPATCHED')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterDecision === 'MAINTENANCE_DISPATCHED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Maintenance Dispatched
          </button>
        </div>

        {/* Ledger Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Building</th>
                  <th className="py-3 px-4">AI Prediction</th>
                  <th className="py-3 px-4">Human Decision</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Model Provenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Loading feedback ledger...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No feedback entries recorded. Submit supervisory reviews on incident pages to build feedback data.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500 tabular-nums">
                        {new Date(item.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {item.building_id}
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        <span
                          className={
                            item.prediction === 'ACTIONABLE_ENERGY_WASTE'
                              ? 'text-rose-700'
                              : item.prediction === 'AUTHORIZED_OPERATIONAL_LOAD'
                              ? 'text-emerald-700'
                              : item.prediction === 'TELEMETRY_HARDWARE_ERROR'
                              ? 'text-amber-700'
                              : 'text-purple-700'
                          }
                        >
                          {item.prediction.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            item.human_decision === 'APPROVED'
                              ? 'bg-slate-900 text-white'
                              : item.human_decision === 'ACKNOWLEDGED'
                              ? 'bg-emerald-100 text-emerald-900'
                              : item.human_decision === 'MAINTENANCE_DISPATCHED'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-rose-100 text-rose-900'
                          }`}
                        >
                          {item.human_decision}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-xs">
                        {item.reason}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                        {item.user.split('@')[0]}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                        {item.model_version}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
