'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
  CheckCircle2,
  Cpu,
  Database,
  RotateCcw,
  Save,
  Shield,
  Sliders,
  Zap,
} from 'lucide-react';

export default function SettingsPage() {
  const [errorTolerance, setErrorTolerance] = useState('15');
  const [powerFactor, setPowerFactor] = useState('0.95');
  const [anomalyThreshold, setAnomalyThreshold] = useState('0.65');
  const [seed, setSeed] = useState('42');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const [activePrompt, setActivePrompt] = useState('v2.1.0-grounded-safety');

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.errorTolerance) setErrorTolerance(String(data.errorTolerance));
        if (data.powerFactor) setPowerFactor(String(data.powerFactor));
        if (data.anomalyThreshold) setAnomalyThreshold(String(data.anomalyThreshold));
        if (data.activePrompt) setActivePrompt(data.activePrompt);
      })
      .catch((e) => console.error(e));
  }, []);

  const handleSaveSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorTolerance: Number(errorTolerance),
          powerFactor: Number(powerFactor),
          anomalyThreshold: Number(anomalyThreshold),
          activePrompt
        }),
      });
      if (res.ok) {
        setSavedMsg('Settings saved successfully.');
        setTimeout(() => setSavedMsg(null), 3000);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleResetData = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/scenarios/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setSavedMsg(`Database successfully re-imported from CSV datasets.`);
        setTimeout(() => setSavedMsg(null), 4000);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>System Configuration</span>
            <span aria-hidden="true">·</span>
            <span>Safety Parameters</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            System & Physics Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic physics thresholds, protected equipment catalog, and synthetic dataset controls.
          </p>
        </div>

        {savedMsg && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{savedMsg}</span>
          </div>
        )}

        <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-xs font-semibold text-blue-900 flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-600" />
          <span>System settings are unlocked. You can now modify the physics and anomaly configurations.</span>
        </div>

        <div className="space-y-6">
          {/* Physics Validation Thresholds */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Zap className="h-4 w-4 text-slate-700" />
              <h2 className="text-base font-semibold text-slate-900">
                Physics Validation Parameters
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Relative Error Quarantine Tolerance (%):
                </label>
                <input
                  type="number"
                  value={errorTolerance}
                  onChange={(e) => setErrorTolerance(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 font-mono text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Relative error |Reported - Expected| / Expected &gt; 15% triggers safety quarantine.
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Default Prototype Power Factor (PF):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={powerFactor}
                  onChange={(e) => setPowerFactor(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 font-mono text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Used when power factor is not telemetry-supplied on legacy branch submeters.
                </span>
              </div>
            </div>
          </div>

          {/* ML & AI Thresholds */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders className="h-4 w-4 text-slate-700" />
              <h2 className="text-base font-semibold text-slate-900">
                ML Anomaly & Prompt Settings
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Isolation Forest Anomaly Threshold:
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={anomalyThreshold}
                  onChange={(e) => setAnomalyThreshold(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 font-mono text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Scores &gt; 0.65 are dispatched to context retrieval and LLM triage.
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Active LLM Triage Prompt:
                </label>
                <input
                  type="text"
                  value={activePrompt}
                  onChange={(e) => setActivePrompt(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Enforces evidence grounding, zero hallucination, and UNSURE fallback.
                </span>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Database className="h-4 w-4 text-slate-700" />
              <h2 className="text-base font-semibold text-slate-900">
                Database Import Configuration
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 text-xs">
              <div className="pt-2 sm:pt-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleResetData}
                  disabled={resetting}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${resetting ? 'animate-spin' : ''}`} />
                  <span>{resetting ? 'Importing Datasets...' : 'Re-import CSV Datasets'}</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Re-parses the 4 raw CSV files (schedules, equipment status, maintenance notes, meter readings) and overwrites the local database instance.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleSaveSettings}
              title="Save Configuration"
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
