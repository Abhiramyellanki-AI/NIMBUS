# Campus Energy Triage System — Requirement Traceability Matrix

This document maps authoritative PRD, UX, and Architecture requirements directly to code implementations, automated verification tests, and interactive UI views.

| Requirement ID | Requirement Description | Implementation Component | Test Verification | UI Representation |
| :--- | :--- | :--- | :--- | :--- |
| **FR-001** | Multi-building Synthetic Telemetry Ingestion | `data/synthetic/generator.ts`, `services/api/services/anomaly.py` | `tests/test_scenarios_e2e.py` | `/` Campus Overview, `/buildings/[id]` |
| **FR-002** | Deterministic Physics Validation (V × I × PF) | `lib/physics/validator.ts`, `services/api/services/validation.py` | `tests/test_physics_validation.py` | `/anomalies/[id]` Physics Validation Card |
| **FR-003** | Telemetry Quarantine Mechanism | `lib/physics/validator.ts` (`is_quarantined: true`) | `tests/test_scenarios_e2e.py::test_scenario_1_telemetry_error` | Quarantine Banner, Hardware Route |
| **FR-004** | ML Anomaly Detection & Baseline Profiling | `lib/ml/detector.ts` (Isolation Forest, 6 Features) | `tests/test_scenarios_e2e.py` | Anomaly Score, Baseline vs Observed Charts |
| **FR-005** | Bounded Context Retrieval with Stable IDs | `lib/context/retriever.ts` (`evidence_catalog`) | `tests/test_scenarios_e2e.py` | `/anomalies/[id]` Evidence Ledger Tabs |
| **FR-006** | Server-Side LLM Triage with Gemini | `lib/llm/triage.ts`, `app/api/anomalies/[id]/triage/route.ts` | Integration verification | `/anomalies/[id]` AI Triage Verdict Card |
| **FR-007** | UNSURE Fallback for Ambiguous Cases | `lib/llm/triage.ts` (Missing occupancy / data) | `tests/test_scenarios_e2e.py::test_scenario_4_unsure_ambiguity` | `/anomalies/[id]` Unsure Resolution Controls |
| **FR-008** | Protected Load Invariant (No essential shutdowns) | `lib/context/retriever.ts`, `types/energy.ts` | Unit & System verification | Protected / Essential Load Badge |
| **FR-009** | Human-in-the-Loop Decision & Feedback Ledger | `lib/db/store.ts` (`recordHumanDecision`) | API POST `/api/triage/[id]/decision` | `/feedback`, Action Buttons on Triage Card |
| **FR-010** | MLOps Tracking & Retraining Performance Gate | `lib/db/store.ts` (`retrainCandidateModel`) | API POST `/api/model/retrain` | `/model-health` Console & Retrain Trigger |
| **FR-011** | Scenario 1: Sensor Error Demo Flow | `data/synthetic/generator.ts` (Feeder 4-B) | `tests/test_scenarios_e2e.py::test_scenario_1` | Quick Scenario Launcher, Triage #1 |
| **FR-012** | Scenario 2: Authorized Lab Experiment | `data/synthetic/generator.ts` (ETH-EXP-2026-89) | `tests/test_scenarios_e2e.py::test_scenario_2` | Quick Scenario Launcher, Triage #2 |
| **FR-013** | Scenario 3: Actionable Energy Waste | `data/synthetic/generator.ts` (Lecture_A overnight) | `tests/test_scenarios_e2e.py::test_scenario_3` | Quick Scenario Launcher, Triage #3 |
| **FR-014** | Scenario 4: Ambiguity & Human Escalation | `data/synthetic/generator.ts` (Lecture_B offline PIR) | `tests/test_scenarios_e2e.py::test_scenario_4` | Quick Scenario Launcher, Triage #4 |
