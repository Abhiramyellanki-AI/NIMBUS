'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  FileText,
  Radio,
  Shield,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  ApprovalRecord,
  Building,
  Equipment,
  MaintenanceNote,
  MeterReading,
  Occupancy,
  Schedule,
} from '@/types/energy';

interface BuildingDetailResponse {
  building: Building;
  readings: MeterReading[];
  equipment: Equipment[];
  schedules: Schedule[];
  occupancy: Occupancy[];
  maintenance_notes: MaintenanceNote[];
  approvals: ApprovalRecord[];
  anomalies: any[];
}

export default function BuildingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const buildingId = resolvedParams.id;

  const [data, setData] = useState<BuildingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campusBuildings, setCampusBuildings] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    fetch('/api/buildings')
      .then(res => res.json())
      .then(json => {
        setCampusBuildings(json.buildings || []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch(`/api/buildings/${buildingId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Building ${buildingId} not found`);
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
  }, [buildingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 text-center text-slate-500">
          Loading building facilities telemetry...
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
            <p className="font-semibold">{error || 'Building not found'}</p>
          </div>
        </main>
      </div>
    );
  }

  const { building, readings, equipment, schedules, occupancy, maintenance_notes, approvals, anomalies } = data;

  // Chart data
  const chartData = readings.map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    observed: r.reported_power_kw,
    expected: r.expected_power_kw,
  }));

  const essentialEquipment = equipment.filter((e) => e.essential);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb & Building Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>Campus Facilities</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{building.id}</span>
                <span aria-hidden="true">·</span>
                <span>{building.type.replace(/_/g, ' ')}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {building.name}
              </h1>
            </div>
          </div>

          {/* Building Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-lg">
            {campusBuildings.map((b) => (
              <Link
                key={b.id}
                href={`/buildings/${b.id}`}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  b.id === building.id
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {b.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Building Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Telemetry Load Profile (Past 12 Hours)
                </h2>
                <p className="text-xs text-slate-500">
                  15-minute interval submeter readings compared against expected physical draw
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                Live Load: {building.current_load_kw} kW
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} unit=" kW" />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs shadow-md space-y-1">
                            <p className="font-semibold text-slate-900">{label}</p>
                            <p className="font-mono text-slate-700">Observed: {payload[0]?.value} kW</p>
                            <p className="font-mono text-emerald-700">Expected: {payload[1]?.value} kW</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="observed" stroke="#0f172a" strokeWidth={2} fill="#0f172a" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="expected" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Building Metadata Panel */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="relative h-32 rounded-xl overflow-hidden border border-slate-200">
              <Image
                src={building.photo_url}
                alt={building.name}
                fill
                referrerPolicy="no-referrer"
                className="object-cover"
              />
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block">Facility Area:</span>
                <span className="font-semibold font-mono text-slate-900">{building.area_sqm} m²</span>
              </div>
              <div>
                <span className="text-slate-400 block">Operating Hours:</span>
                <span className="font-medium text-slate-800">{building.operational_hours}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Nominal Baseline:</span>
                <span className="font-mono text-slate-800">{building.baseline_kw} kW (Peak Limit: {building.peak_limit_kw} kW)</span>
              </div>
              <div>
                <span className="text-slate-400 block">Description:</span>
                <p className="text-slate-600 mt-0.5 leading-relaxed">{building.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Equipment & Protected Loads Matrix */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-slate-700" />
              <h2 className="text-base font-semibold text-slate-900">
                Connected Electrical Loads & Equipment
              </h2>
            </div>
            <span className="text-xs text-sky-800 font-semibold bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
              {essentialEquipment.length} Protected Critical Circuits
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {equipment.map((eq) => (
              <div
                key={eq.id}
                className={`rounded-xl border p-4 text-xs space-y-2 ${
                  eq.essential
                    ? 'border-sky-300 bg-sky-50/40'
                    : 'border-slate-200 bg-slate-50/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-slate-900">{eq.equipment_name}</span>
                  {eq.essential && (
                    <span className="text-[10px] font-bold text-sky-800 bg-white border border-sky-300 px-1.5 py-0.5 rounded shrink-0">
                      PROTECTED
                    </span>
                  )}
                </div>

                <div className="flex justify-between text-slate-500 font-mono text-[11px]">
                  <span>Category: {eq.category}</span>
                  <span>Draw: {eq.power_draw_kw} kW</span>
                </div>

                <p className="text-slate-600 text-[11px] leading-relaxed">{eq.notes}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Facilities Schedule & Maintenance Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Schedules */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Calendar className="h-4 w-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-900">BMS Schedules</h3>
            </div>
            {schedules.map((s) => (
              <div key={s.id} className="text-xs space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex justify-between font-medium text-slate-900">
                  <span>{s.day_of_week}</span>
                  <span>{s.open_time} - {s.close_time}</span>
                </div>
                <p className="text-slate-500 text-[11px]">{s.notes}</p>
              </div>
            ))}
          </div>

          {/* Maintenance Records */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Wrench className="h-4 w-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-900">Maintenance Logs</h3>
            </div>
            {maintenance_notes.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No recent maintenance recorded in past 7 days.</p>
            ) : (
              maintenance_notes.map((m) => (
                <div key={m.id} className="text-xs space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex justify-between text-slate-900 font-semibold">
                    <span>{m.component_affected}</span>
                    <span className="text-slate-400 font-mono text-[10px]">{new Date(m.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-600">{m.description}</p>
                  <p className="text-slate-400 text-[10px]">Technician: {m.technician}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
