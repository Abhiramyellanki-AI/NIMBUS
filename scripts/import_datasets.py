import csv
import json
import os
import uuid
import math
from datetime import datetime

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_FILE = os.path.join(BASE_DIR, 'data', 'database.json')

READINGS_CSV = os.path.join(BASE_DIR, 'meter_readings.csv')
SCHEDULES_CSV = os.path.join(BASE_DIR, 'class_schedule_expanded_1000.csv')
EQUIPMENT_CSV = os.path.join(BASE_DIR, 'equipment_status_expanded_1000.csv')
MAINTENANCE_CSV = os.path.join(BASE_DIR, 'maintenance_notes_expanded_1000.csv')

def parse_csv(filepath):
    if not os.path.exists(filepath):
        print(f"Warning: {filepath} not found.")
        return []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

def infer_building_type(b_id):
    b_id_lower = b_id.lower()
    if 'lecture' in b_id_lower: return 'LECTURE_HALL'
    if 'lab' in b_id_lower: return 'RESEARCH_LAB'
    if 'admin' in b_id_lower: return 'ADMIN'
    return 'INFRASTRUCTURE'

def import_datasets():
    print("Reading CSVs...")
    readings = parse_csv(READINGS_CSV)
    schedules = parse_csv(SCHEDULES_CSV)
    equipment = parse_csv(EQUIPMENT_CSV)
    maintenance = parse_csv(MAINTENANCE_CSV)

    building_ids = set([r['building_id'] for r in readings])
    
    db = {
        "buildings": [],
        "readings": [],
        "schedules": [],
        "occupancies": [],
        "equipment": [],
        "maintenance_notes": [],
        "approvals": [],
        "anomalies": [],
        "triage_results": [],
        "audit_events": [],
        "human_feedback": [],
        "model_health": {
          "model_version": "real-python-backend",
          "dataset_version": "csv-import",
          "random_seed": 0,
          "trained_at": datetime.now().isoformat(),
          "precision": 1.0,
          "recall": 1.0,
          "f1": 1.0,
          "confusion_matrix": { "true_positive": 0, "false_positive": 0, "true_negative": 0, "false_negative": 0 },
          "drift_status": "NOMINAL"
        }
    }

    # Generate buildings
    for b_id in building_ids:
        b_type = infer_building_type(b_id)
        db["buildings"].append({
            "id": b_id,
            "name": b_id.replace("_", " "),
            "type": b_type,
            "area_sqm": 5000,
            "baseline_kw": 10.0,
            "peak_limit_kw": 500.0,
            "photo_url": f"https://source.unsplash.com/800x600/?{b_type.lower()}",
            "description": f"Imported building: {b_id}",
            "operational_hours": "08:00-18:00",
            "current_load_kw": 0,
            "status": "NOMINAL"
        })

    # Read readings (limit to a subset or keep all)
    # The UI gets slow if there are 1M readings in JSON, let's keep all in JSON for now.
    print(f"Processing {len(readings)} readings...")
    for r in readings:
        try:
            power = float(r['power_kw'])
            expected_power = power  # Fallback
            # simple V*I check
            v = float(r['voltage_v'])
            i = float(r['current_a'])
            pf = float(r['power_factor'])
            calc_power = (v * i * pf) / 1000
            error = abs(power - calc_power) / max(0.01, calc_power)
            
            db["readings"].append({
                "id": str(uuid.uuid4()),
                "building_id": r['building_id'],
                "timestamp": r['timestamp'].replace(' ', 'T') + 'Z',
                "voltage_v": v,
                "current_a": i,
                "power_factor": pf,
                "reported_power_kw": power,
                "expected_power_kw": calc_power,
                "relative_error": error,
                "validation_status": "VALID" if error < 0.1 else "INVALID",
                "is_quarantined": error >= 0.1,
                "raw_message": str(r)
            })
        except Exception as e:
            pass

    # Read schedules
    print(f"Processing {len(schedules)} schedules...")
    for s in schedules:
        db["schedules"].append({
            "id": str(uuid.uuid4()),
            "building_id": s['building_id'],
            "day_of_week": s['date'],
            "open_time": s['start_time'],
            "close_time": s['end_time'],
            "hvac_setback_active": False,
            "expected_occupants": int(s['expected_occupancy']) if s['expected_occupancy'].isdigit() else 0,
            "notes": f"{s['course_code']}: {s['course_name']} in {s['room_number']}"
        })

    # Read equipment
    print(f"Processing {len(equipment)} equipments...")
    for e in equipment:
        try:
            p_str = e['est_power_draw_kw'].split(' ')[0]
            p_val = float(p_str)
        except:
            p_val = 0.0
            
        db["equipment"].append({
            "id": e['approval_id'],
            "building_id": e['building_id'],
            "equipment_name": e['equipment_type'],
            "category": "RESEARCH",
            "status": "ON" if e['status'] == "APPROVED" else "OFF",
            "power_draw_kw": p_val,
            "essential": ("essential" in str(e.get('purpose', '')).lower() or "continuous" in str(e.get('purpose', '')).lower()),
            "notes": f"Location: {e['room_number']} | Maintenance due: {e['end_time']}"
        })

    # Read maintenance notes
    print(f"Processing {len(maintenance)} maintenance notes...")
    for m in maintenance:
        db["maintenance_notes"].append({
            "id": m['log_id'],
            "building_id": m['building_id'],
            "date": m['timestamp'].replace(' ', 'T') + 'Z',
            "technician": m['technician'],
            "description": f"{m['action']}: {m['notes']} (Urgency: {m['urgency']})",
            "component_affected": m['component'],
            "recalibration_status": "COMPLETED"
        })

    print("Writing database.json...")
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2)
    print("Done!")

if __name__ == "__main__":
    import_datasets()
