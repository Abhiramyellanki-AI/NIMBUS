'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Filter,
  Flame,
  HelpCircle,
  Radio,
  Search,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { AnomalyRecord, AnomalySeverity, TriageResult } from '@/types/energy';

interface AnomalyItem extends AnomalyRecord {
  triage?: TriageResult;
}

export default function AnomaliesQueuePage() {
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [buildingFilter, setBuildingFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/anomalies')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load anomalies');
        return res.json();
      })
      .then((data) => {
        setAnomalies(data.anomalies || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filtered = anomalies.filter((a) => {
    if (buildingFilter !== 'ALL' && a.building_id !== buildingFilter) return false;
    if (categoryFilter !== 'ALL' && a.triage?.category !== categoryFilter) return false;
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && a.triage_status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = a.id.toLowerCase().includes(q);
      const matchBldg = (a.building_name || '').toLowerCase().includes(q);
      const matchReason = a.triage?.reason?.toLowerCase().includes(q);
      if (!matchId && !matchBldg && !matchReason) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Facilities Operations</span>
              <span aria-hidden="true">·</span>
              <span>Triage Queue</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{filtered.length} Incidents</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Campus Energy Anomaly Queue
            </h1>
          </div>
        </div>

        {/* Filter bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, building, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Buildings</option>
            <option value="Lecture_A">Lecture_A</option>
            <option value="Lecture_B">Lecture_B</option>
            <option value="Lab_A">Lab_A</option>
            <option value="Lab_B">Lab_B</option>
            <option value="Equipment_Block">Equipment_Block</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Triage Categories</option>
            <option value="ACTIONABLE_ENERGY_WASTE">Actionable Waste</option>
            <option value="AUTHORIZED_OPERATIONAL_LOAD">Authorized Load</option>
            <option value="TELEMETRY_HARDWARE_ERROR">Hardware / Telemetry Error</option>
            <option value="UNSURE">Unsure (Human Required)</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="TRIAGED">Triaged</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        {/* Incidents Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Incident ID</th>
                  <th className="py-3 px-4">Building</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Reported (kW)</th>
                  <th className="py-3 px-4 text-right">Baseline (kW)</th>
                  <th className="py-3 px-4 text-center">Physics</th>
                  <th className="py-3 px-4">Triage Category</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Loading queue...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No incidents match current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                        {item.id}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {(item.building_name || item.building_id || '').split('(')[0]}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono tabular-nums">
                        {new Date(item.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums text-slate-900">
                        {item.reported_power_kw} kW
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-500">
                        {item.baseline_kw} kW
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {item.physics_status === 'VALID' ? (
                          <span className="text-emerald-700 font-semibold text-[11px]">VALID</span>
                        ) : (
                          <span className="text-rose-700 font-semibold text-[11px] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            QUARANTINED
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.triage?.category === 'ACTIONABLE_ENERGY_WASTE' && (
                          <span className="font-semibold text-rose-700">Actionable Waste</span>
                        )}
                        {item.triage?.category === 'AUTHORIZED_OPERATIONAL_LOAD' && (
                          <span className="font-semibold text-emerald-700">Authorized Load</span>
                        )}
                        {item.triage?.category === 'TELEMETRY_HARDWARE_ERROR' && (
                          <span className="font-semibold text-amber-700">Hardware Error</span>
                        )}
                        {item.triage?.category === 'UNSURE' && (
                          <span className="font-semibold text-purple-700">Unsure (Human Required)</span>
                        )}
                        {!item.triage && <span className="text-slate-400">Unprocessed</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-semibold text-[11px] px-2 py-0.5 rounded ${
                            item.triage_status === 'RESOLVED'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : item.triage_status === 'TRIAGED'
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {item.triage_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/anomalies/${item.id}`}
                          className="inline-flex items-center gap-1 font-semibold text-xs text-slate-900 hover:text-emerald-700"
                        >
                          <span>Review</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
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
