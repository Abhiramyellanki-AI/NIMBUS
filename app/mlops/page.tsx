'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  Database,
  LineChart,
  Play,
  RotateCcw,
  ShieldAlert,
  TerminalSquare
} from 'lucide-react';
import { ModelHealthData, AuditEvent } from '@/types/energy';

export default function MLOpsPage() {
  const [health, setHealth] = useState<ModelHealthData | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/mlops');
      if (res.ok) {
        const data = await res.json();
        setHealth(data.health);
        setAuditEvents(data.auditEvents);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRetrain = async () => {
    setRetraining(true);
    setResultMsg(null);
    try {
      const res = await fetch('/api/mlops/retrain', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setResultMsg({
          type: data.result.gate_passed ? 'success' : 'info',
          text: data.result.message
        });
        await fetchData();
      } else {
        setResultMsg({ type: 'error', text: data.error || 'Failed to retrain' });
      }
    } catch (e: any) {
      setResultMsg({ type: 'error', text: e.message || 'Error occurred' });
    } finally {
      setRetraining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <p className="text-slate-500 animate-pulse">Loading MLOps Telemetry...</p>
        </main>
      </div>
    );
  }

  if (!health) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>MLOps Lifecycle</span>
              <span aria-hidden="true">·</span>
              <span>Candidate Evaluation</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Continuous Training & Performance Gate
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Monitor active model performance, track human feedback divergence, and trigger candidate retraining pipelines.
            </p>
          </div>
          
          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="flex items-center gap-2 px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-lg shadow-xs font-semibold text-xs transition-colors"
          >
            {retraining ? (
              <RotateCcw className="h-4 w-4 animate-spin text-slate-400" />
            ) : (
              <Play className="h-4 w-4 text-emerald-400 fill-emerald-400" />
            )}
            {retraining ? 'Evaluating Candidate...' : 'Trigger Retraining Pipeline'}
          </button>
        </div>

        {resultMsg && (
          <div
            className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-3 ${
              resultMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : resultMsg.type === 'info'
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {resultMsg.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : resultMsg.type === 'info' ? (
              <ShieldAlert className="h-5 w-5 text-blue-600" />
            ) : (
              <Activity className="h-5 w-5 text-rose-600" />
            )}
            <span>{resultMsg.text}</span>
          </div>
        )}

        {/* Current Model Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1 md:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                  <BrainCircuit className="h-4 w-4" />
                  Active Production Model
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  Deployed
                </span>
              </div>
              
              <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 mb-1">
                {health.model_version}
              </div>
              <div className="text-xs text-slate-500 font-mono mb-6">
                Dataset: {health.dataset_version} | Seed: {health.random_seed}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">F1 Score</div>
                <div className="text-xl font-mono font-bold text-slate-800">{health.f1.toFixed(3)}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Precision</div>
                <div className="text-lg font-mono font-bold text-slate-600">{health.precision.toFixed(3)}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Recall</div>
                <div className="text-lg font-mono font-bold text-slate-600">{health.recall.toFixed(3)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm mb-4">
                <Database className="h-4 w-4" />
                Human Feedback Divergence
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tracks the agreement rate between model predictions and human supervisory reviews. Low agreement triggers automated drift status.
              </p>
            </div>
            
            <div className="mt-6">
              <div className="flex items-end justify-between mb-2">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Agreement Rate</div>
                <div className="text-xl font-mono font-bold text-slate-800">
                  {(health.feedback_agreement_rate * 100).toFixed(1)}%
                </div>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${health.feedback_agreement_rate > 0.8 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                  style={{ width: `${health.feedback_agreement_rate * 100}%` }}
                />
              </div>
              <div className="mt-3 text-xs font-mono text-slate-400">
                Based on {health.feedback_count || 0} reviews
              </div>
            </div>
          </div>
        </div>

        {/* Audit Log / Candidate history */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex items-center gap-2">
            <TerminalSquare className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">MLOps Event Log</h2>
          </div>
          <div className="p-0">
            {auditEvents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No model retraining events recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {auditEvents.map(event => (
                  <div key={event.id} className="p-4 flex gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="w-32 flex-shrink-0 text-[11px] font-mono text-slate-400 pt-0.5">
                      {new Date(event.timestamp).toLocaleString([], {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                          event.action === 'MODEL_PROMOTED' ? 'bg-emerald-100 text-emerald-800' : 
                          event.action === 'MODEL_REJECTED' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {event.action}
                        </span>
                        <span className="text-[11px] font-mono font-medium text-slate-700">
                          {event.entity_id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {event.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
