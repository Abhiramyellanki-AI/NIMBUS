# Campus Energy Triage System — Full-Stack AI + MLOps Platform

A context-aware campus facilities energy anomaly triage platform designed to answer the core operational question:
> **"Is this energy anomaly actually waste, legitimate operational activity, or a telemetry problem?"**

---

## 1. System Architecture

The pipeline strictly enforces the deterministic safety chain:

```text
CAMPUS DATA (Submeters & BMS)
      ↓
DATA QUALITY & COMPLETENESS
      ↓
PHYSICS VALIDATION (V × I × PF)
   ┌──┴─────────────────────────┐
   ↓ (FAIL)                     ↓ (PASS)
QUARANTINE                 ML ANOMALY DETECTION (Isolation Forest)
(Hardware Fault Route)          ↓
                           CONTEXT RETRIEVAL (Schedules, Occupancy, Approvals, Protected Loads)
                                ↓
                           LLM TRIAGE (Server-side Gemini 3.8 Flash)
                                ↓
                           HUMAN-IN-THE-LOOP REVIEW GATE
                                ↓
                           SUPERVISORY FEEDBACK LEDGER
                                ↓
                           MLOPS CANDIDATE RETRAINING & PERFORMANCE GATE
```

---

## 2. Four Core Hackathon Scenarios

1. **Scenario 1 — Sensor / Telemetry Error (`Equipment_Block`)**:
   - Recent CT replacement on Feeder 4-B.
   - Electrical reading: $V = 230\text{ V}$, $I = 2.0\text{ A}$, reported power $= 2.50\text{ kW}$ (expected $\approx 0.44\text{ kW}$).
   - **Physics validation:** $472\%$ deviation triggers automatic **QUARANTINE**.
   - Bypasses ML waste detection and directly dispatches an instrumentation work order.

2. **Scenario 2 — Authorized Laboratory Activity (`Lab_A`)**:
   - Overnight surge ($7.4\text{ kW}$ vs $2.2\text{ kW}$ baseline) during 22:00–06:00.
   - Context retrieval discovers approved research permit `ETH-EXP-2026-89` by Dr. Aris Thorne.
   - AI classifies: `AUTHORIZED_OPERATIONAL_LOAD` (Confidence: 94%).
   - Operator clicks **[ ACKNOWLEDGE ]**. No blanket shutdown permitted.

3. **Scenario 3 — Actionable Energy Waste (`Lecture_A`)**:
   - Overnight spike ($8.4\text{ kW}$ vs $0.8\text{ kW}$ baseline) at 02:15 AM.
   - Context retrieval discovers: Occupancy $= 0$, Schedule indicates closed at 20:00, AHU-1 & chillers running unthrottled.
   - AI classifies: `ACTIONABLE_ENERGY_WASTE` (Confidence: 93%).
   - Operator clicks **[ APPROVE ]** to modify schedule.

4. **Scenario 4 — Ambiguity / UNSURE (`Lecture_B`)**:
   - Elevated consumption ($5.8\text{ kW}$ vs $0.6\text{ kW}$ baseline) at 03:30 AM.
   - Occupancy sensor array is **OFFLINE**; no approval permit exists.
   - AI refuses to hallucinate: classifies `UNSURE` (Confidence: 42%).
   - System safely routes case to human facilities duty manager.

---

## 3. Technology Stack

- **Frontend:** Next.js 15+ (App Router), TypeScript, Tailwind CSS, Recharts, Lucide React
- **Backend & Persistence:** Next.js API Routes + Python FastAPI services (`services/api/`)
- **ML & Physics:** scikit-learn Isolation Forest (`lib/ml/`), deterministic conservation of energy validator (`lib/physics/`)
- **AI Triage:** `@google/genai` (Server-side Gemini 3.8 Flash) with strict JSON schema validation
- **MLOps:** Automated candidate model retraining, confusion matrix, drift tracking (PSI), performance gating (`candidate F1 >= active F1`)

---

## 4. Running the Tests

To verify physics validation:
```bash
python3 tests/test_physics_validation.py
```

To run end-to-end verification of all four scenarios:
```bash
python3 tests/test_scenarios_e2e.py
```
