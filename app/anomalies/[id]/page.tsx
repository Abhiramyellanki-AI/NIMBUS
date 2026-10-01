'use client';

import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Cpu,
  FileCheck,
  Flame,
  HelpCircle,
  Info,
  Layers,
  RotateCcw,
  Send,
  Shield,
  ShieldAlert,
  Sparkles,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  AnomalyRecord,
  AuditEvent,
  BoundedContextPacket,
  HumanDecision,
  HumanFeedback,
  TriageResult,
  ValidationStatus,
} from '@/types/energy';

interface AnomalyDetailResponse {
  anomaly: AnomalyRecord;
  context: BoundedContextPacket;
  triage: TriageResult | null;
  feedback: HumanFeedback[];
  audit_events: AuditEvent[];
  physics_evaluation: {
    expected_power_kw: number;
    relative_error: number;
    validation_status: ValidationStatus;
    is_quarantined: boolean;
    explanation: string;
  };
}

export default function AnomalyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const anomalyId = resolvedParams.id;

  const [data, setData] = useState<AnomalyDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active evidence tab
  const [activeTab, setActiveTab] = useState<'all' | 'meter' | 'schedule' | 'occupancy' | 'equipment' | 'maintenance' | 'approvals'>('all');

  // Human decision state
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionSuccess, setDecisionSuccess] = useState<string | null>(null);

  // Retriage loading
  const [retriaging, setRetriaging] = useState(false);

  const loadData = useCallback(() => {
    fetch(`/api/anomalies/${anomalyId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load incident ${anomalyId}`);
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
  }, [anomalyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Execute Human Decision
  const handleDecision = async (decision: HumanDecision) => {
    if (!data?.triage) return;
    setSubmittingDecision(true);
    try {
      const res = await fetch(`/api/triage/${data.triage.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          reason: decisionReason || `Operator recorded ${decision}`,
          user: 'facilities.lead@campus.edu',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to submit decision');
      }

      setDecisionSuccess(`Decision "${decision}" recorded successfully.`);
      setTimeout(() => setDecisionSuccess(null), 4000);
      setDecisionReason('');
      loadData(); // Refresh audit log & status
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Re-run AI Triage
  const handleRunTriage = async () => {
    setRetriaging(true);
    try {
      const res = await fetch(`/api/anomalies/${anomalyId}/triage`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to run triage');
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRetriaging(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 text-center text-slate-500">
          <p>Loading incident telemetry & context packet...</p>
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
            <p className="font-semibold">Incident Not Found</p>
            <p className="text-sm mt-1">{error}</p>
            <Link href="/anomalies" className="mt-4 inline-block text-xs font-semibold text-rose-900 underline">
              Return to queue
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { anomaly, context, triage, feedback, audit_events, physics_evaluation } = data;
  const isQuarantined = physics_evaluation.is_quarantined || anomaly.is_quarantined;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/anomalies"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Facilities Incident</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{anomaly.id}</span>
                <span aria-hidden="true">·</span>
                <span>{new Date(anomaly.timestamp).toLocaleString()}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {anomaly.building_name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunTriage}
              disabled={retriaging}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${retriaging ? 'animate-spin' : ''}`} />
              <span>{retriaging ? 'Triaging...' : 'Re-run AI Triage'}</span>
            </button>
          </div>
        </div>

        {/* Success toast banner */}
        {decisionSuccess && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{decisionSuccess}</span>
          </div>
        )}

        {/* 1. Incident Header Bar */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Reported Power</p>
            <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
              {anomaly.reported_power_kw} kW
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Dynamic Baseline</p>
            <p className="text-lg font-bold font-mono tabular-nums text-slate-500">
              {anomaly.baseline_kw} kW
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Deviation</p>
            <p className="text-lg font-bold font-mono tabular-nums text-rose-600">
              +{anomaly.deviation_percent}%
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Anomaly Score</p>
            <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
              {anomaly.anomaly_score}{' '}
              <span className="text-xs text-slate-400 font-sans">({anomaly.severity})</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Physics Gate</p>
            <p className="text-lg font-bold">
              {physics_evaluation.validation_status === 'VALID' ? (
                <span className="text-emerald-700">VALID</span>
              ) : (
                <span className="text-rose-700">QUARANTINED</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Triage Status</p>
            <p className="text-lg font-bold text-slate-900">
              {anomaly.triage_status}
            </p>
          </div>
        </section>

        {/* 2. Physics Validation Card with Quarantine Banner */}
        <section
          className={`rounded-2xl border p-6 shadow-xs ${
            isQuarantined
              ? 'border-rose-300 bg-rose-50/60'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200/60 pb-4">
            <div className="flex items-center gap-2">
              <Zap className={`h-5 w-5 ${isQuarantined ? 'text-rose-600' : 'text-emerald-600'}`} />
              <h2 className="text-base font-semibold text-slate-900">
                Physics Validation Engine (First Line of Defense)
              </h2>
            </div>
            <div className="text-xs font-mono text-slate-500">
              Law: P(kW) = (V x I x Power Factor) / 1000
            </div>
          </div>

          {isQuarantined && (
            <div className="mt-4 rounded-xl border border-rose-300 bg-rose-100/70 p-4 text-xs text-rose-950 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-900">
                  CRITICAL SAFETY QUARANTINE: Inconsistent Electrical Telemetry
                </p>
                <p className="leading-relaxed">
                  This reading has been quarantined and prohibited from entering the ML energy-waste pipeline.
                  Reported power deviates from fundamental circuit measurements by{' '}
                  <span className="font-bold font-mono">
                    {(physics_evaluation.relative_error * 100).toFixed(1)}%
                  </span>
                  . This indicates a physical transducer or current transformer fault, not building waste.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-4 text-xs">
            <div className="rounded-lg bg-white/80 border border-slate-200/80 p-3">
              <span className="text-slate-500 block">Voltage (V)</span>
              <span className="font-bold font-mono text-sm text-slate-900">
                {context.meter.voltage_v.toFixed(1)} V
              </span>
            </div>
            <div className="rounded-lg bg-white/80 border border-slate-200/80 p-3">
              <span className="text-slate-500 block">Current (I)</span>
              <span className="font-bold font-mono text-sm text-slate-900">
                {context.meter.current_a.toFixed(1)} A
              </span>
            </div>
            <div className="rounded-lg bg-white/80 border border-slate-200/80 p-3">
              <span className="text-slate-500 block">Power Factor</span>
              <span className="font-bold font-mono text-sm text-slate-900">
                {context.meter.power_factor}
              </span>
            </div>
            <div className="rounded-lg bg-white/80 border border-slate-200/80 p-3">
              <span className="text-slate-500 block">Reported Power</span>
              <span className="font-bold font-mono text-sm text-slate-900">
                {context.meter.reported_power_kw.toFixed(2)} kW
              </span>
            </div>
            <div className="rounded-lg bg-white/80 border border-slate-200/80 p-3">
              <span className="text-slate-500 block">Expected Power</span>
              <span className="font-bold font-mono text-sm text-slate-900">
                {physics_evaluation.expected_power_kw.toFixed(3)} kW
              </span>
            </div>
            <div className="rounded-lg bg-white/80 border border-slate-200/80 p-3">
              <span className="text-slate-500 block">Relative Error</span>
              <span
                className={`font-bold font-mono text-sm ${
                  isQuarantined ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {(physics_evaluation.relative_error * 100).toFixed(1)}%
              </span>
            </div>
            <div className="rounded-lg bg-white/80 border border-slate-200/80 p-3">
              <span className="text-slate-500 block">Status</span>
              <span
                className={`font-bold text-sm ${
                  isQuarantined ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {physics_evaluation.validation_status}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 mt-3 italic">
            Explanation: {physics_evaluation.explanation}
          </p>
        </section>

        {/* Protected Load Warning Card */}
        {context.essential_equipment_present && (
          <section className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-xs text-sky-950 flex items-start gap-3">
            <Shield className="h-5 w-5 text-sky-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sky-900">
                PROTECTED / ESSENTIAL LOADS IDENTIFIED IN FACILITY
              </p>
              <p className="mt-0.5 leading-relaxed">
                The following equipment is classified as essential and must NEVER be subject to automated curtailment, blanket overnight shutoffs, or breaker tripping:
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {context.protected_loads.map((load, idx) => (
                  <span
                    key={idx}
                    className="font-mono font-semibold bg-white border border-sky-300 text-sky-900 px-2 py-0.5 rounded text-[11px]"
                  >
                    {load}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 3. AI Verdict & Reason Card */}
        {triage && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-semibold text-slate-900">
                  AI Contextual Reasoning Verdict
                </h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="font-mono">Engine: {triage.llm_model}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">Prompt {triage.prompt_version}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-8 space-y-4">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Classification
                  </span>
                  <div className="mt-1 flex items-center gap-3">
                    <span
                      className={`text-xl font-bold ${
                        triage.category === 'ACTIONABLE_ENERGY_WASTE'
                          ? 'text-rose-700'
                          : triage.category === 'AUTHORIZED_OPERATIONAL_LOAD'
                          ? 'text-emerald-700'
                          : triage.category === 'TELEMETRY_HARDWARE_ERROR'
                          ? 'text-amber-700'
                          : 'text-purple-700'
                      }`}
                    >
                      {triage.category.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      Confidence: {Math.round(triage.confidence * 100)}%
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Contextual Justification
                  </span>
                  <p className="mt-1 text-sm text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {triage.reason}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Recommended Operational Action
                  </span>
                  <div className="mt-1 flex items-start gap-2 text-sm text-slate-900 font-medium bg-emerald-50/50 p-3 rounded-lg border border-emerald-200/60">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{triage.recommended_action}</span>
                  </div>
                </div>

                {/* Evidence Grounding Badges */}
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Grounded Evidence References ({triage.evidence.length})
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {triage.evidence.map((evId) => (
                      <span
                        key={evId}
                        className="font-mono text-xs text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs"
                      >
                        {evId}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Human-in-the-Loop Decision Box */}
              <div className="md:col-span-4 rounded-xl border border-slate-200 bg-slate-50/80 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-slate-900" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Human Review Gate
                  </h3>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Per the Campus Energy Triage Constitution, no automated action is taken.
                  Select the appropriate supervisory decision:
                </p>

                <div className="space-y-2">
                  {triage.category === 'ACTIONABLE_ENERGY_WASTE' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleDecision('APPROVED')}
                        disabled={submittingDecision}
                        className="py-2 px-3 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-lg transition-colors text-center shadow-xs"
                      >
                        Approve Schedule Change
                      </button>
                      <button
                        onClick={() => handleDecision('DISAPPROVED')}
                        disabled={submittingDecision}
                        className="py-2 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors text-center"
                      >
                        Disapprove / Overrule
                      </button>
                    </div>
                  )}

                  {triage.category === 'AUTHORIZED_OPERATIONAL_LOAD' && (
                    <button
                      onClick={() => handleDecision('ACKNOWLEDGED')}
                      disabled={submittingDecision}
                      className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs"
                    >
                      Acknowledge Authorized Run
                    </button>
                  )}

                  {triage.category === 'TELEMETRY_HARDWARE_ERROR' && (
                    <button
                      onClick={() => handleDecision('MAINTENANCE_DISPATCHED')}
                      disabled={submittingDecision}
                      className="w-full py-2 px-3 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors shadow-xs"
                    >
                      Dispatch Instrumentation Work Order
                    </button>
                  )}

                  {triage.category === 'UNSURE' && (
                    <button
                      onClick={() => handleDecision('RESOLVED_CUSTOM')}
                      disabled={submittingDecision}
                      className="w-full py-2 px-3 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-lg transition-colors shadow-xs"
                    >
                      Resolve Case (Manual Inspection)
                    </button>
                  )}
                </div>

                <div className="pt-2">
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Supervisory Operator Reason / Notes:
                  </label>
                  <textarea
                    rows={2}
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    placeholder="Enter supervisory confirmation or override rationale..."
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 5. Evidence Ledger Tabs */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-200 px-6 pt-4 bg-slate-50/50">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Contextual Evidence Ledger
            </h2>

            {/* Segmented Filter Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-950 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Evidence ({context.evidence_catalog.length})
              </button>
              <button
                onClick={() => setActiveTab('meter')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'meter'
                    ? 'bg-white text-slate-950 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Meter Reading
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'schedule'
                    ? 'bg-white text-slate-950 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Facility Schedule
              </button>
              <button
                onClick={() => setActiveTab('occupancy')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'occupancy'
                    ? 'bg-white text-slate-950 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Occupancy Sensor
              </button>
              <button
                onClick={() => setActiveTab('equipment')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'equipment'
                    ? 'bg-white text-slate-950 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Equipment ({context.equipment.length})
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'approvals'
                    ? 'bg-white text-slate-950 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Approvals ({context.approvals.length})
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'maintenance'
                    ? 'bg-white text-slate-950 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Maintenance ({context.maintenance_notes.length})
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Meter view */}
            {(activeTab === 'all' || activeTab === 'meter') && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700">Submeter Telemetry</span>
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reading ID:</span>
                    <span className="text-slate-900 font-bold">{context.meter.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reported Power:</span>
                    <span className="text-slate-900">{context.meter.reported_power_kw} kW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Electrical Parameters:</span>
                    <span>{context.meter.voltage_v} V · {context.meter.current_a} A · PF {context.meter.power_factor}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Schedule view */}
            {(activeTab === 'all' || activeTab === 'schedule') && context.schedule && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700">BMS Facility Schedule</span>
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Schedule ID:</span>
                    <span className="font-mono">{context.schedule.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Operating Window:</span>
                    <span className="font-bold">{context.schedule.open_time} - {context.schedule.close_time} ({context.schedule.day_of_week})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Night Setback Active:</span>
                    <span className="font-semibold text-emerald-700">{context.schedule.hvac_setback_active ? 'YES' : 'NO'}</span>
                  </div>
                  <p className="text-slate-600 text-[11px] pt-1">{context.schedule.notes}</p>
                </div>
              </div>
            )}

            {/* Occupancy view */}
            {(activeTab === 'all' || activeTab === 'occupancy') && context.occupancy && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700">Zone Occupancy Sensing</span>
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sensor ID:</span>
                    <span className="font-mono">{context.occupancy.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Detected Headcount:</span>
                    <span className="font-bold font-mono text-slate-900">{context.occupancy.headcount} occupants</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sensor Status:</span>
                    <span className={`font-semibold ${context.occupancy.sensor_status === 'NORMAL' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {context.occupancy.sensor_status}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Equipment view */}
            {(activeTab === 'all' || activeTab === 'equipment') && context.equipment.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700">Sub-Equipment Status</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {context.equipment.map((eq) => (
                    <div key={eq.id} className="rounded-lg border border-slate-200/80 bg-white p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{eq.equipment_name}</span>
                        {eq.essential && (
                          <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                            ESSENTIAL
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>Draw: {eq.power_draw_kw} kW</span>
                        <span className="font-mono">Status: {eq.status}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">{eq.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approvals view */}
            {(activeTab === 'all' || activeTab === 'approvals') && context.approvals.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700">Registered Experimental Approvals</span>
                {context.approvals.map((ap) => (
                  <div key={ap.id} className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-bold text-emerald-900">{ap.title}</span>
                      <span className="font-mono text-emerald-800 font-semibold">{ap.reference_code}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>PI: {ap.principal_investigator}</span>
                      <span>Dept: {ap.department}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Window: {ap.start_time} - {ap.end_time} · Approved: {ap.approved ? 'YES' : 'NO'}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Maintenance view */}
            {(activeTab === 'all' || activeTab === 'maintenance') && context.maintenance_notes.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700">Facilities Maintenance Notes (7-Day Window)</span>
                {context.maintenance_notes.map((mn) => (
                  <div key={mn.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-900">{mn.component_affected}</span>
                      <span className="text-slate-400 font-mono">{new Date(mn.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-700">{mn.description}</p>
                    <div className="flex justify-between text-slate-500 text-[11px] pt-1">
                      <span>Tech: {mn.technician}</span>
                      <span className="font-mono">Recalibration: {mn.recalibration_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 6. Incident Audit History */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Clock className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">
              Audit Event Log & Decision Provenance
            </h2>
          </div>

          <div className="space-y-3">
            {audit_events.map((event) => (
              <div key={event.id} className="flex items-start gap-3 text-xs border-l-2 border-slate-200 pl-3 py-1">
                <span className="font-mono text-slate-400 tabular-nums">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="font-semibold text-slate-900 uppercase tracking-wider text-[10px]">
                  [{event.action}]
                </span>
                <span className="text-slate-700 flex-1">{event.details}</span>
                <span className="text-slate-400 font-mono text-[11px]">{event.actor}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
