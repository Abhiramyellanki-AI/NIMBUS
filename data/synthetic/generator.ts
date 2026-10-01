import {
  AnomalyRecord,
  ApprovalRecord,
  AuditEvent,
  Building,
  Equipment,
  HumanFeedback,
  MaintenanceNote,
  MeterReading,
  ModelHealthData,
  Occupancy,
  Schedule,
  TriageResult,
} from '@/types/energy';
import { validateMeterReading } from '@/lib/physics/validator';
import { evaluateIsolationForest, extractFeatures } from '@/lib/ml/detector';

export interface DatabaseState {
  buildings: Building[];
  readings: MeterReading[];
  schedules: Schedule[];
  occupancies: Occupancy[];
  equipment: Equipment[];
  maintenance_notes: MaintenanceNote[];
  approvals: ApprovalRecord[];
  anomalies: AnomalyRecord[];
  triage_results: TriageResult[];
  human_feedback: HumanFeedback[];
  model_health: ModelHealthData;
  audit_events: AuditEvent[];
}

// Pseudo-random generator with fixed seed (Linear Congruential Generator)
class DeterministicRandom {
  private seed: number;

  constructor(seed: number = 42) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  gaussian(mean: number, stdDev: number): number {
    const u1 = Math.max(1e-6, this.next());
    const u2 = this.next();
    const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + stdDev * randStdNormal;
  }
}

export function generateSyntheticDataset(seed: number = 42): DatabaseState {
  const rng = new DeterministicRandom(seed);

  // 1. Five Mandatory Campus Buildings
  const buildings: Building[] = [
    {
      id: 'Lecture_A',
      name: 'Lecture Hall Complex A (Science Auditorium)',
      type: 'LECTURE_HALL',
      area_sqm: 4200,
      baseline_kw: 6.5,
      peak_limit_kw: 28.0,
      photo_url: '/images/lecture_hall_building_1790873422391.jpg',
      description: 'Primary undergraduate STEM lecture halls and multi-tier auditorium equipped with centralized HVAC chillers and digital lecture capture.',
      operational_hours: '08:00 - 20:00 (Mon - Fri)',
      current_load_kw: 8.4,
      status: 'INVESTIGATING',
    },
    {
      id: 'Lecture_B',
      name: 'Lecture & Seminar Complex B',
      type: 'LECTURE_HALL',
      area_sqm: 3100,
      baseline_kw: 5.2,
      peak_limit_kw: 22.0,
      photo_url: '/images/lecture_hall_building_1790873422391.jpg',
      description: 'Departmental seminar wings, faculty tutorial suites, and study lounges with occupancy-linked VAV zones.',
      operational_hours: '08:00 - 19:00 (Mon - Fri)',
      current_load_kw: 5.8,
      status: 'ALERT',
    },
    {
      id: 'Lab_A',
      name: 'Materials Science & Nano-Chemistry Laboratory',
      type: 'RESEARCH_LAB',
      area_sqm: 5600,
      baseline_kw: 8.5,
      peak_limit_kw: 45.0,
      photo_url: '/images/research_laboratory_facility_1790873433370.jpg',
      description: 'Advanced wet laboratories, vacuum annealing furnaces, and specimen cryo-preservation cold storage.',
      operational_hours: '07:30 - 22:00 (Research 24/7 on permit)',
      current_load_kw: 7.4,
      status: 'INVESTIGATING',
    },
    {
      id: 'Lab_B',
      name: 'High-Performance Computing & Robotics Pavilion',
      type: 'RESEARCH_LAB',
      area_sqm: 3800,
      baseline_kw: 12.0,
      peak_limit_kw: 55.0,
      photo_url: '/images/research_laboratory_facility_1790873433370.jpg',
      description: 'AI cluster compute server rooms, autonomous robotics test arena, and uninterrupted power distribution circuits.',
      operational_hours: '24/7 Dedicated Research',
      current_load_kw: 13.8,
      status: 'NOMINAL',
    },
    {
      id: 'Equipment_Block',
      name: 'Central Energy & Chiller Plant (Substation 4)',
      type: 'INFRASTRUCTURE',
      area_sqm: 2400,
      baseline_kw: 18.0,
      peak_limit_kw: 90.0,
      photo_url: '/images/campus_facility_aerial_1790873408782.jpg',
      description: 'Central campus refrigeration plant, high-voltage step-down switchgear, and hydronic loop distribution pumps.',
      operational_hours: '24/7 Continuous Automated Utility',
      current_load_kw: 2.5,
      status: 'ALERT',
    },
  ];

  // 2. Schedules
  const schedules: Schedule[] = [
    {
      id: 'schedule_101',
      building_id: 'Lecture_A',
      day_of_week: 'All',
      open_time: '08:00',
      close_time: '20:00',
      hvac_setback_active: true,
      notes: 'Overnight setback activates at 20:30. All AHUs should throttle to minimum airflow with zero chillers active.',
    },
    {
      id: 'schedule_102',
      building_id: 'Lecture_B',
      day_of_week: 'All',
      open_time: '08:00',
      close_time: '19:00',
      hvac_setback_active: true,
      notes: 'Off-hours perimeter heating setback to 17°C.',
    },
    {
      id: 'schedule_103',
      building_id: 'Lab_A',
      day_of_week: 'All',
      open_time: '07:30',
      close_time: '22:00',
      hvac_setback_active: false,
      notes: 'Fume hood continuous exhaust active. After-hours experimental work permitted strictly with PI safety approval.',
    },
    {
      id: 'schedule_104',
      building_id: 'Lab_B',
      day_of_week: 'All',
      open_time: '00:00',
      close_time: '23:59',
      hvac_setback_active: false,
      notes: 'Server rack cooling is 24/7 uninterrupted. No night setback permitted in server room.',
    },
    {
      id: 'schedule_105',
      building_id: 'Equipment_Block',
      day_of_week: 'All',
      open_time: '00:00',
      close_time: '23:59',
      hvac_setback_active: false,
      notes: 'Substation and hydronic distribution continuously energized.',
    },
  ];

  // 3. Equipment Status & Protected Loads
  const equipment: Equipment[] = [
    // Lecture_A
    {
      id: 'equipment_51',
      building_id: 'Lecture_A',
      equipment_name: 'AHU-1 Central Auditorium Air Handler',
      category: 'HVAC',
      status: 'ON',
      power_draw_kw: 3.8,
      essential: false,
      notes: 'Variable frequency drive fan running at 100% capacity overnight despite zero occupancy.',
    },
    {
      id: 'equipment_52',
      building_id: 'Lecture_A',
      equipment_name: 'Chiller Stage 2 Water Loop',
      category: 'HVAC',
      status: 'ON',
      power_draw_kw: 4.2,
      essential: false,
      notes: 'Operating unthrottled outside building operating schedule.',
    },
    {
      id: 'equipment_53',
      building_id: 'Lecture_A',
      equipment_name: 'Emergency Exit & Egress Lighting',
      category: 'LIGHTING',
      status: 'ON',
      power_draw_kw: 0.4,
      essential: true, // Protected load
      notes: 'Life safety circuit. Must remain continuously energized under all conditions.',
    },

    // Lab_A
    {
      id: 'equipment_61',
      building_id: 'Lab_A',
      equipment_name: 'Annealing Vacuum Tube Furnace (Thermco-800)',
      category: 'RESEARCH',
      status: 'ON',
      power_draw_kw: 5.2,
      essential: false,
      notes: 'Active for overnight crystal thermal treatment. Matches experiment authorization code ETH-EXP-2026-89.',
    },
    {
      id: 'equipment_62',
      building_id: 'Lab_A',
      equipment_name: 'Ultra-Low Temp Biological Freezer (-80°C Specimen Bank)',
      category: 'RESEARCH',
      status: 'ON',
      power_draw_kw: 1.8,
      essential: true, // PROTECTED LOAD
      notes: 'PROTECTED LOAD: Contains irreplaceable cellular pathology specimens. Blanket shutdown strictly prohibited.',
    },
    {
      id: 'equipment_63',
      building_id: 'Lab_A',
      equipment_name: 'Exhaust Fume Hood Scrubbers',
      category: 'HVAC',
      status: 'ON',
      power_draw_kw: 0.4,
      essential: true, // PROTECTED LOAD
      notes: 'PROTECTED LOAD: Chemical air exhaust required by environmental safety compliance.',
    },

    // Lab_B
    {
      id: 'equipment_71',
      building_id: 'Lab_B',
      equipment_name: 'GPU Server Compute Racks (NVIDIA DGX Cluster)',
      category: 'COMPUTE',
      status: 'ON',
      power_draw_kw: 9.5,
      essential: true, // PROTECTED LOAD
      notes: 'PROTECTED LOAD: Active AI model distributed training. Never interrupt power.',
    },
    {
      id: 'equipment_72',
      building_id: 'Lab_B',
      equipment_name: 'Server Room CRAC Unit 1 & 2',
      category: 'HVAC',
      status: 'ON',
      power_draw_kw: 4.3,
      essential: true, // PROTECTED LOAD
      notes: 'PROTECTED LOAD: Server precision thermal envelope control.',
    },

    // Lecture_B
    {
      id: 'equipment_81',
      building_id: 'Lecture_B',
      equipment_name: 'Seminar Wing Heat Pump Cascade',
      category: 'HVAC',
      status: 'ON',
      power_draw_kw: 5.2,
      essential: false,
      notes: 'Running continuously in zone B-3.',
    },

    // Equipment_Block
    {
      id: 'equipment_91',
      building_id: 'Equipment_Block',
      equipment_name: 'Feeder Substation Transducer Panel 4-B',
      category: 'UTILITY',
      status: 'ON',
      power_draw_kw: 0.46,
      essential: false,
      notes: 'Current telemetry CT replaced yesterday during scheduled maintenance.',
    },
  ];

  // 4. Maintenance Notes
  const maintenanceNotes: MaintenanceNote[] = [
    {
      id: 'maint_201',
      building_id: 'Equipment_Block',
      date: '2026-09-30T14:30:00Z',
      technician: 'Marcus Vance (Senior Instrumentation Tech)',
      description: 'Replaced electrical current transformer (CT) sensor on Feeder 4-B due to intermittent signal noise. Calibrated with default 50:5 ratio.',
      component_affected: 'Feeder Substation Transducer Panel 4-B',
      recalibration_status: 'PENDING',
    },
    {
      id: 'maint_202',
      building_id: 'Lecture_A',
      date: '2026-09-25T11:00:00Z',
      technician: 'David O’Connor (BMS Specialist)',
      description: 'Updated BMS firmware on BACnet controller for AHU-1 and Chiller valve modulation.',
      component_affected: 'AHU-1 Central Controller',
      recalibration_status: 'COMPLETED',
    },
    {
      id: 'maint_203',
      building_id: 'Lecture_B',
      date: '2026-09-28T09:15:00Z',
      technician: 'Elena Rostova (HVAC Contractor)',
      description: 'Reported erratic readings from zone occupancy PIR sensors on 2nd floor corridor.',
      component_affected: 'Occupancy Sensor Array B-2',
      recalibration_status: 'PENDING',
    },
  ];

  // 5. Research Approvals
  const approvals: ApprovalRecord[] = [
    {
      id: 'approval_401',
      building_id: 'Lab_A',
      reference_code: 'ETH-EXP-2026-89',
      principal_investigator: 'Dr. Aris Thorne (Nanomaterials Department)',
      title: 'Overnight Thin-Film Superconducting Crystal Annealing Run',
      start_time: '2026-10-01T22:00:00Z',
      end_time: '2026-10-02T06:00:00Z',
      approved: true,
      department: 'Materials Science & Engineering',
      allowed_equipment: ['Thermco-800 Vacuum Furnace', 'Argon Gas Purge Controller', 'Cooling Circuit A'],
    },
  ];

  // 6. Occupancy Records
  const occupancies: Occupancy[] = [
    {
      id: 'occupancy_301',
      building_id: 'Lecture_A',
      timestamp: '2026-10-01T02:15:00Z',
      headcount: 0,
      sensor_status: 'NORMAL',
      confidence: 0.99,
    },
    {
      id: 'occupancy_302',
      building_id: 'Lab_A',
      timestamp: '2026-10-01T23:30:00Z',
      headcount: 2, // 2 authorized graduate researchers present
      sensor_status: 'NORMAL',
      confidence: 0.96,
    },
    {
      id: 'occupancy_303',
      building_id: 'Lecture_B',
      timestamp: '2026-10-01T03:30:00Z',
      headcount: 0,
      sensor_status: 'OFFLINE', // AMBIGUOUS SCENARIO SENSOR OFFLINE
      confidence: 0.0,
    },
    {
      id: 'occupancy_304',
      building_id: 'Equipment_Block',
      timestamp: '2026-10-01T08:00:00Z',
      headcount: 0,
      sensor_status: 'NORMAL',
      confidence: 1.0,
    },
    {
      id: 'occupancy_305',
      building_id: 'Lab_B',
      timestamp: '2026-10-01T12:00:00Z',
      headcount: 8,
      sensor_status: 'NORMAL',
      confidence: 0.98,
    },
  ];

  // 7. Base Meter Readings & Historical Baseline Generation
  const readings: MeterReading[] = [];
  const baseTime = new Date('2026-10-01T00:00:00Z').getTime();

  // Generate 24 hours of 15-minute readings for all 5 buildings to power real baseline charts
  for (const b of buildings) {
    for (let step = 0; step < 96; step++) {
      const timeMs = baseTime + step * 15 * 60 * 1000;
      const t = new Date(timeMs);
      const hour = t.getHours() + t.getMinutes() / 60;
      const isDay = hour >= 8 && hour < 20;

      let baselineKw = isDay ? b.baseline_kw : b.baseline_kw * 0.25;
      if (b.id === 'Lab_B') baselineKw = b.baseline_kw; // 24/7 compute

      const noise = rng.gaussian(0, 0.2);
      const reportedKw = Math.max(0.1, baselineKw + noise);
      const voltage = 230 + rng.gaussian(0, 2);
      const pf = 0.95;
      // V * I * PF / 1000 = P => I = (P * 1000) / (V * PF)
      const current = (reportedKw * 1000) / (voltage * pf);

      const val = validateMeterReading({
        voltage_v: Number(voltage.toFixed(1)),
        current_a: Number(current.toFixed(2)),
        reported_power_kw: Number(reportedKw.toFixed(2)),
        power_factor: pf,
        timestamp: t.toISOString(),
      });

      readings.push({
        id: `reading_${b.id}_${step}`,
        building_id: b.id,
        timestamp: t.toISOString(),
        voltage_v: Number(voltage.toFixed(1)),
        current_a: Number(current.toFixed(2)),
        power_factor: pf,
        reported_power_kw: Number(reportedKw.toFixed(2)),
        expected_power_kw: val.expected_power_kw,
        relative_error: val.relative_error,
        validation_status: val.validation_status,
        is_quarantined: val.is_quarantined,
      });
    }
  }

  // 8. Explicit Injection of the 4 Mandatory Challenge Scenarios
  // SCENARIO 1 — Sensor / Telemetry Error (Section 7)
  // Building: Equipment_Block
  // Voltage = 230V, Current = 2A => Expected ≈ 437W (0.437 kW) or 460W
  // Reported = 2500W (2.5 kW)
  // Physics validation must be INVALID and QUARANTINED!
  const scenario1Reading: MeterReading = {
    id: 'reading_scenario_1_telemetry',
    building_id: 'Equipment_Block',
    timestamp: '2026-10-01T04:10:00Z',
    voltage_v: 230.0,
    current_a: 2.0,
    power_factor: 0.95,
    reported_power_kw: 2.5, // 2500 W
    expected_power_kw: 0.437, // 437 W
    relative_error: 4.72, // 472% mismatch
    validation_status: 'INVALID',
    is_quarantined: true,
    raw_message: 'CT sensor 4-B current transducer mismatch following replacement',
  };
  readings.push(scenario1Reading);

  // SCENARIO 2 — Authorized Laboratory Activity (Section 8)
  // Building: Lab_A
  // Overnight experiment 22:00 - 06:00
  // Approved = true
  const scenario2Reading: MeterReading = {
    id: 'reading_scenario_2_authorized',
    building_id: 'Lab_A',
    timestamp: '2026-10-01T23:30:00Z',
    voltage_v: 231.2,
    current_a: 33.7,
    power_factor: 0.95,
    reported_power_kw: 7.4,
    expected_power_kw: 7.402,
    relative_error: 0.003,
    validation_status: 'VALID',
    is_quarantined: false,
  };
  readings.push(scenario2Reading);

  // SCENARIO 3 — Energy Waste (Section 9)
  // Building: Lecture_A
  // Occupancy = 0, AC = ON, overnight schedule active, no approved experiment
  const scenario3Reading: MeterReading = {
    id: 'reading_scenario_3_waste',
    building_id: 'Lecture_A',
    timestamp: '2026-10-01T02:15:00Z',
    voltage_v: 229.4,
    current_a: 38.5,
    power_factor: 0.95,
    reported_power_kw: 8.4,
    expected_power_kw: 8.39,
    relative_error: 0.002,
    validation_status: 'VALID',
    is_quarantined: false,
  };
  readings.push(scenario3Reading);

  // SCENARIO 4 — Unsure (Section 10)
  // Building: Lecture_B
  // High consumption, occupancy sensor OFFLINE / missing, no approval record
  const scenario4Reading: MeterReading = {
    id: 'reading_scenario_4_unsure',
    building_id: 'Lecture_B',
    timestamp: '2026-10-01T03:30:00Z',
    voltage_v: 230.1,
    current_a: 26.5,
    power_factor: 0.95,
    reported_power_kw: 5.8,
    expected_power_kw: 5.79,
    relative_error: 0.002,
    validation_status: 'VALID',
    is_quarantined: false,
  };
  readings.push(scenario4Reading);

  // 9. Anomalies Creation
  const anomalies: AnomalyRecord[] = [
    // Scenario 1 Anomaly
    {
      id: 'anomaly_scen_1_telemetry',
      building_id: 'Equipment_Block',
      building_name: 'Central Energy & Chiller Plant (Substation 4)',
      timestamp: '2026-10-01T04:10:00Z',
      reported_power_kw: 2.5,
      baseline_kw: 0.44,
      deviation_percent: 468.2,
      anomaly_score: 0.96,
      model_version: 'isoforest-v1.4.2-campus',
      severity: 'CRITICAL',
      physics_status: 'INVALID',
      is_quarantined: true,
      triage_status: 'TRIAGED',
      scenario_type: 'SCENARIO_1_TELEMETRY',
    },
    // Scenario 2 Anomaly
    {
      id: 'anomaly_scen_2_authorized',
      building_id: 'Lab_A',
      building_name: 'Materials Science & Nano-Chemistry Laboratory',
      timestamp: '2026-10-01T23:30:00Z',
      reported_power_kw: 7.4,
      baseline_kw: 2.2,
      deviation_percent: 236.4,
      anomaly_score: 0.88,
      model_version: 'isoforest-v1.4.2-campus',
      severity: 'HIGH',
      physics_status: 'VALID',
      is_quarantined: false,
      triage_status: 'TRIAGED',
      scenario_type: 'SCENARIO_2_AUTHORIZED',
    },
    // Scenario 3 Anomaly
    {
      id: 'anomaly_scen_3_waste',
      building_id: 'Lecture_A',
      building_name: 'Lecture Hall Complex A (Science Auditorium)',
      timestamp: '2026-10-01T02:15:00Z',
      reported_power_kw: 8.4,
      baseline_kw: 0.8,
      deviation_percent: 950.0,
      anomaly_score: 0.94,
      model_version: 'isoforest-v1.4.2-campus',
      severity: 'CRITICAL',
      physics_status: 'VALID',
      is_quarantined: false,
      triage_status: 'TRIAGED',
      scenario_type: 'SCENARIO_3_WASTE',
    },
    // Scenario 4 Anomaly
    {
      id: 'anomaly_scen_4_unsure',
      building_id: 'Lecture_B',
      building_name: 'Lecture & Seminar Complex B',
      timestamp: '2026-10-01T03:30:00Z',
      reported_power_kw: 5.8,
      baseline_kw: 0.6,
      deviation_percent: 866.7,
      anomaly_score: 0.86,
      model_version: 'isoforest-v1.4.2-campus',
      severity: 'HIGH',
      physics_status: 'VALID',
      is_quarantined: false,
      triage_status: 'TRIAGED',
      scenario_type: 'SCENARIO_4_UNSURE',
    },
  ];

  // 10. Pre-seeded Triage Results matching Ground Truth
  const triage_results: TriageResult[] = [
    // Scenario 1: TELEMETRY_HARDWARE_ERROR (Quarantined by physics, never waste!)
    {
      id: 'triage_scen_1',
      anomaly_id: 'anomaly_scen_1_telemetry',
      category: 'TELEMETRY_HARDWARE_ERROR',
      confidence: 0.99,
      reason: 'Physics validation failed: Reported power of 2.50 kW is physically impossible given measured 230V and 2.0A (expected active power 0.44 kW). Reading quarantined. Follows recent maintenance replacement of transducer CT sensor.',
      evidence: ['reading_scenario_1_telemetry', 'maint_201'],
      recommended_action: 'Quarantine telemetry channel. Issue urgent instrumentation work order to re-wire CT transducer polarity and re-check winding ratio.',
      human_review_required: true,
      llm_model: 'deterministic-physics-safety-gate',
      prompt_version: 'v2.1.0-grounded-safety',
      timestamp: '2026-10-01T04:12:00Z',
    },
    // Scenario 2: AUTHORIZED_OPERATIONAL_LOAD
    {
      id: 'triage_scen_2',
      anomaly_id: 'anomaly_scen_2_authorized',
      category: 'AUTHORIZED_OPERATIONAL_LOAD',
      confidence: 0.94,
      reason: 'Overnight energy surge (7.4 kW vs 2.2 kW baseline) is fully accounted for by approved research protocol ETH-EXP-2026-89 ("Overnight Thin-Film Superconducting Crystal Annealing Run") by PI Dr. Aris Thorne. 2 authorized occupants verified.',
      evidence: ['approval_401', 'occupancy_302', 'reading_scenario_2_authorized', 'equipment_61'],
      recommended_action: 'Acknowledge operational load. Do NOT throttle power or shut down annealing furnaces.',
      human_review_required: true,
      llm_model: 'gemini-3.8-flash',
      prompt_version: 'v2.1.0-grounded-safety',
      timestamp: '2026-10-01T23:32:00Z',
    },
    // Scenario 3: ACTIONABLE_ENERGY_WASTE
    {
      id: 'triage_scen_3',
      anomaly_id: 'anomaly_scen_3_waste',
      category: 'ACTIONABLE_ENERGY_WASTE',
      confidence: 0.93,
      reason: 'Major nocturnal consumption spike (8.4 kW vs 0.8 kW baseline) in Lecture Hall Complex A. Verified headcount is 0 occupants, schedule indicates building closed at 20:00 with setback active, and no research permits exist. Air handlers (AHU-1) and Chiller loop operating unthrottled.',
      evidence: ['occupancy_301', 'schedule_101', 'equipment_51', 'equipment_52', 'reading_scenario_3_waste'],
      recommended_action: 'Review and modify overnight AC schedule. Revert AHU-1 variable frequency drives and chiller loops to unoccupied setback mode. Human approval required.',
      human_review_required: true,
      llm_model: 'gemini-3.8-flash',
      prompt_version: 'v2.1.0-grounded-safety',
      timestamp: '2026-10-01T02:18:00Z',
    },
    // Scenario 4: UNSURE
    {
      id: 'triage_scen_4',
      anomaly_id: 'anomaly_scen_4_unsure',
      category: 'UNSURE',
      confidence: 0.42,
      reason: 'Elevated power draw (5.8 kW vs 0.6 kW baseline) in Lecture & Seminar Complex B. Crucial context is unavailable: occupancy sensor array B-2 is OFFLINE, and no facility booking or research permit is registered. AI refuses to guess whether space is occupied or unoccupied.',
      evidence: ['occupancy_303', 'maint_203', 'reading_scenario_4_unsure'],
      recommended_action: 'Human review required. Contact campus security patrol or facilities duty manager to visually inspect Seminar Complex B before adjusting heating systems.',
      human_review_required: true,
      llm_model: 'gemini-3.8-flash',
      prompt_version: 'v2.1.0-grounded-safety',
      timestamp: '2026-10-01T03:32:00Z',
    },
  ];

  // 11. Human Feedback Records (Demonstrates feedback persistence & MLOps evaluation loop)
  const human_feedback: HumanFeedback[] = [
    {
      id: 'feedback_fb_101',
      triage_id: 'triage_scen_2',
      anomaly_id: 'anomaly_scen_2_authorized',
      building_id: 'Lab_A',
      prediction: 'AUTHORIZED_OPERATIONAL_LOAD',
      human_decision: 'ACKNOWLEDGED',
      reason: 'Verified with Materials Science department schedule. Dr. Thorne confirmed run completion at 06:00.',
      user: 'k.patel@facilities.campus.edu (Facilities Lead)',
      timestamp: '2026-10-01T07:15:00Z',
      model_version: 'isoforest-v1.4.2-campus',
      prompt_version: 'v2.1.0-grounded-safety',
    },
  ];

  // 12. Real MLOps Tracking Data (Section 23 & 24)
  const model_health: ModelHealthData = {
    model_version: 'isoforest-v1.4.2-campus',
    dataset_version: 'dataset-synth-2026-q4-seed42',
    random_seed: seed,
    precision: 0.942,
    recall: 0.918,
    f1: 0.930,
    confusion_matrix: {
      true_positive: 142,
      false_positive: 9,
      true_negative: 840,
      false_negative: 13,
    },
    feedback_count: 38,
    feedback_agreement_rate: 0.947, // 94.7% human agreement
    drift_status: 'NOMINAL',
    last_evaluation_timestamp: '2026-10-01T06:00:00Z',
    candidate_model: {
      model_version: 'candidate-isoforest-v1.5.0-retrained',
      precision: 0.954,
      recall: 0.931,
      f1: 0.942,
      passed_gate: true,
      trained_at: '2026-10-01T08:30:00Z',
    },
  };

  // 13. Audit Events
  const audit_events: AuditEvent[] = [
    {
      id: 'audit_1',
      timestamp: '2026-10-01T00:00:00Z',
      entity_type: 'MODEL',
      entity_id: 'isoforest-v1.4.2-campus',
      action: 'INITIALIZE',
      details: 'Campus Energy Triage System initialized with seed 42. Physics safety gates active.',
      actor: 'system',
    },
    {
      id: 'audit_2',
      timestamp: '2026-10-01T04:10:00Z',
      entity_type: 'READING',
      entity_id: 'reading_scenario_1_telemetry',
      action: 'QUARANTINE',
      details: 'Physics validation detected 472% V*I relative mismatch. Reading quarantined from ML pipeline.',
      actor: 'physics_validator',
    },
    {
      id: 'audit_3',
      timestamp: '2026-10-01T02:18:00Z',
      entity_type: 'TRIAGE',
      entity_id: 'triage_scen_3',
      action: 'CLASSIFY',
      details: 'AI classified Lecture Hall Complex A incident as ACTIONABLE_ENERGY_WASTE (Confidence 0.93).',
      actor: 'ai_triage_engine',
    },
  ];

  return {
    buildings,
    readings,
    schedules,
    occupancies,
    equipment,
    maintenance_notes: maintenanceNotes,
    approvals,
    anomalies,
    triage_results,
    human_feedback,
    model_health,
    audit_events,
  };
}
