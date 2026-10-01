'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  HelpCircle,
  Radio,
  Sparkles,
  ArrowRight,
  Activity,
  Layers,
  Flame,
  Search,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { AnomalyRecord, Building, TriageResult } from '@/types/energy';

interface OverviewData {
  campus_name: string;
  monitoring_status: string;
  last_data_refresh: string;
  current_model_version: string;
  kpis: {
    buildings_monitored: number;
    open_anomalies: number;
    unsure_cases: number;
    telemetry_issues: number;
    potential_energy_waste: number;
  };
  campus_load_trend: {
    hour: number;
    timeLabel: string;
    observed_kw: number;
    baseline_kw: number;
  }[];
  buildings: Building[];
  recent_anomalies: AnomalyRecord[];
  recent_triage: TriageResult[];
}

export default function CampusDashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buildingFilter, setBuildingFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/overview')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load overview data');
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const demoScenarios = [
    {
      id: 'anomaly_scen_1_telemetry',
      label: 'Demo 1: Sensor Error',
      tag: 'Physics Quarantine',
      desc: '230V x 2A mismatch vs 2500W reported power. Quarantined.',
      color: 'border-amber-300 bg-amber-50/50 hover:bg-amber-100/50',
    },
    {
      id: 'anomaly_scen_2_authorized',
      label: 'Demo 2: Lab Activity',
      tag: 'Authorized Load',
      desc: 'Lab A overnight run justified by active research approval.',
      color: 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/50',
    },
    {
      id: 'anomaly_scen_3_waste',
      label: 'Demo 3: Energy Waste',
      tag: 'Actionable Waste',
      desc: 'Lecture Hall A empty overnight with AC chiller unthrottled.',
      color: 'border-rose-300 bg-rose-50/50 hover:bg-rose-100/50',
    },
    {
      id: 'anomaly_scen_4_unsure',
      label: 'Demo 4: Ambiguous Unsure',
      tag: 'Human Review',
      desc: 'Lecture B spike with occupancy sensor offline. Refuses to guess.',
      color: 'border-purple-300 bg-purple-50/50 hover:bg-purple-100/50',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="h-64 rounded-xl border border-slate-200 bg-white p-8 flex items-center justify-center text-slate-500">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 animate-spin text-emerald-600" />
              <span>Loading campus facilities telemetry & physics models...</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
            <p className="font-semibold">Unable to load campus energy telemetry</p>
            <p className="text-sm mt-1">{error || 'Unknown error occurred'}</p>
          </div>
        </main>
      </div>
    );
  }

  // Filter anomalies for queue table
  const filteredAnomalies = data.recent_anomalies.filter((anomaly) => {
    const triage = data.recent_triage.find((t) => t.anomaly_id === anomaly.id);
    if (buildingFilter !== 'ALL' && anomaly.building_id !== buildingFilter) return false;
    if (categoryFilter !== 'ALL' && triage?.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = anomaly.id.toLowerCase().includes(q);
      const matchName = (anomaly.building_name || '').toLowerCase().includes(q);
      const matchReason = triage?.reason.toLowerCase().includes(q);
      if (!matchId && !matchName && !matchReason) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Hero Section */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium tracking-wide">
                <span>{data.campus_name}</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700 font-semibold">Active Continuous Protection</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">Model {data.current_model_version}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 text-balance">
                Campus Energy Anomaly Triage
              </h1>

              <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
                Physics-bounded intelligence distinguishing genuine operational waste from pre-approved research loads and instrumentation faults. Deterministic safety gates protect critical campus facilities.
              </p>

              {/* Demo Scenario Quick Access */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Launch Authoritative Hackathon Demonstrations:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {demoScenarios.map((scen) => (
                    <Link
                      key={scen.id}
                      href={`/anomalies/${scen.id}`}
                      className={`block rounded-lg border p-2.5 transition-all text-left ${scen.color}`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                        <span>{scen.label}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {scen.desc}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Campus Architectural Banner */}
            <div className="lg:col-span-4 relative h-48 sm:h-56 rounded-xl overflow-hidden border border-slate-200">
              <Image
                src="/images/campus_facility_aerial_1790873408782.jpg"
                alt="Campus Facilities Overview"
                fill
                priority
                referrerPolicy="no-referrer"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent flex items-end p-4">
                <div className="text-white text-xs">
                  <p className="font-medium">Substation 4 & Main Engineering Core</p>
                  <p className="text-slate-300 font-mono tabular-nums">5 Sub-metered Facilities</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Five Mandatory KPI Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Monitored Buildings</span>
              <Building2 className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {data.kpis.buildings_monitored}
            </p>
            <p className="text-xs text-slate-500 mt-1">100% telemetry online</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Open Anomalies</span>
              <Radio className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-amber-700 font-mono tabular-nums">
              {data.kpis.open_anomalies}
            </p>
            <p className="text-xs text-slate-500 mt-1">Awaiting review or triage</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Unsure Cases</span>
              <HelpCircle className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-purple-700 font-mono tabular-nums">
              {data.kpis.unsure_cases}
            </p>
            <p className="text-xs text-slate-500 mt-1">Routed to human supervisor</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Telemetry Faults</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-rose-700 font-mono tabular-nums">
              {data.kpis.telemetry_issues}
            </p>
            <p className="text-xs text-slate-500 mt-1">Quarantined by physics</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Potential Waste</span>
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold tracking-tight text-orange-700 font-mono tabular-nums">
              {data.kpis.potential_energy_waste}
            </p>
            <p className="text-xs text-slate-500 mt-1">Requires human approval</p>
          </div>
        </section>

        {/* Energy Chart: Observed vs Expected Baseline */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Campus-Wide Energy Load vs. Building Baseline
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Aggregated 24-hour electrical demand (kW) compared against dynamic operating baseline.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-900 inline-block" />
                <span className="text-slate-700">Observed Load (kW)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                <span className="text-slate-700">Expected Baseline (kW)</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.campus_load_trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="observedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="timeLabel" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fontSize: 11, fill: '#64748b' }} unit=" kW" />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-md text-xs space-y-1">
                          <p className="font-semibold text-slate-900">{label}</p>
                          <p className="text-slate-700 font-mono tabular-nums">
                            Observed: <span className="font-bold">{payload[0]?.value} kW</span>
                          </p>
                          <p className="text-emerald-700 font-mono tabular-nums">
                            Baseline: <span className="font-bold">{payload[1]?.value} kW</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="observed_kw" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#observedGrad)" />
                <Area type="monotone" dataKey="baseline_kw" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#baselineGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Building Health Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Building Operating Status & Protected Loads
              </h2>
              <p className="text-xs text-slate-500">
                Real-time submetering status across university facilities
              </p>
            </div>
            <Link
              href="/buildings/Building_A_Lecture"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>View Facilities Deep Dive</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {data.buildings.map((building) => (
              <Link
                key={building.id}
                href={`/buildings/${building.id}`}
                className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-mono text-slate-400">{building.id}</span>
                  <span
                    className={`font-semibold text-xs ${
                      building.status === 'NOMINAL'
                        ? 'text-emerald-600'
                        : building.status === 'INVESTIGATING'
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {building.status}
                  </span>
                </div>

                <h3 className="font-semibold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                  {building.name}
                </h3>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">Current Load:</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                    {building.current_load_kw} kW
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs text-slate-400 mt-1">
                  <span>Baseline:</span>
                  <span className="font-mono tabular-nums">{building.baseline_kw} kW</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Anomaly Triage Queue Table */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden space-y-4 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Incident Triage Queue
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Incidents evaluated by physics validation and contextual AI reasoning.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search incidents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50"
                />
              </div>

              {/* Building filter */}
              <select
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="ALL">All Buildings</option>
                {data.buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.id}
                  </option>
                ))}
              </select>

              {/* Category filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="ALL">All Categories</option>
                <option value="ACTIONABLE_ENERGY_WASTE">Energy Waste</option>
                <option value="AUTHORIZED_OPERATIONAL_LOAD">Authorized Load</option>
                <option value="TELEMETRY_HARDWARE_ERROR">Telemetry Fault</option>
                <option value="UNSURE">Unsure (Human)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Incident ID</th>
                  <th className="py-3 px-4">Building</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Reported / Baseline</th>
                  <th className="py-3 px-4 text-center">Physics</th>
                  <th className="py-3 px-4">Triage Category</th>
                  <th className="py-3 px-4 text-right">Confidence</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAnomalies.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No incidents match current filters.
                    </td>
                  </tr>
                ) : (
                  filteredAnomalies.map((anomaly) => {
                    const triage = data.recent_triage.find((t) => t.anomaly_id === anomaly.id);
                    return (
                      <tr key={anomaly.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">
                          {anomaly.id}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {(anomaly.building_name || anomaly.building_id || '').split('(')[0]}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono tabular-nums">
                          {new Date(anomaly.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                          <span className="font-bold">{anomaly.reported_power_kw} kW</span>
                          <span className="text-slate-400 text-[11px] ml-1">/ {anomaly.baseline_kw} kW</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {anomaly.physics_status === 'VALID' ? (
                            <span className="text-emerald-700 font-semibold text-[11px]">VALID</span>
                          ) : (
                            <span className="text-rose-700 font-semibold text-[11px] bg-rose-50 px-1.5 py-0.5 rounded">
                              QUARANTINED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {triage?.category === 'ACTIONABLE_ENERGY_WASTE' && (
                            <span className="text-rose-700 font-semibold">Actionable Waste</span>
                          )}
                          {triage?.category === 'AUTHORIZED_OPERATIONAL_LOAD' && (
                            <span className="text-emerald-700 font-semibold">Authorized Load</span>
                          )}
                          {triage?.category === 'TELEMETRY_HARDWARE_ERROR' && (
                            <span className="text-amber-700 font-semibold">Hardware Error</span>
                          )}
                          {triage?.category === 'UNSURE' && (
                            <span className="text-purple-700 font-semibold">Unsure (Human Required)</span>
                          )}
                          {!triage && <span className="text-slate-400">Pending Triage</span>}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-700">
                          {triage ? `${Math.round(triage.confidence * 100)}%` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/anomalies/${anomaly.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-emerald-700 transition-colors"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
