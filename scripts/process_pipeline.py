import json
import os
import sys
import uuid
import datetime
import requests

# Set up paths to import services
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.api.services.validation import PhysicsValidator, ValidationStatus

DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'database.json')
SETTINGS_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'settings.json')

def load_db():
    with open(DATA_FILE, 'r') as f:
        return json.load(f)

def save_db(db):
    with open(DATA_FILE, 'w') as f:
        json.dump(db, f, indent=2)

def process_pipeline():
    print("Starting pipeline processing over historical readings...")
    db = load_db()
    
    # Sort readings by time
    db['readings'].sort(key=lambda x: x['timestamp'])
    
    # Create building name lookup
    building_names = {b['id']: b['name'] for b in db['buildings']}
    
    threshold = 0.65
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, 'r') as f:
                settings_data = json.load(f)
                if 'anomalyThreshold' in settings_data:
                    threshold = float(settings_data['anomalyThreshold'])
        except:
            pass

    history_by_building = {}
    new_anomalies = []

    for idx, reading in enumerate(db['readings']):
        if idx % 1000 == 0:
            print(f"Processed {idx} / {len(db['readings'])} readings...")
            
        b_id = reading['building_id']
        b_name = building_names.get(b_id, b_id)
        current_kw = reading['reported_power_kw']
        
        if b_id not in history_by_building:
            history_by_building[b_id] = []
            
        history = history_by_building[b_id][-24:] # Keep last 24 readings
        
        # 1. Physics Validation
        val_res = PhysicsValidator.validate_reading(
            voltage_v=reading['voltage_v'],
            current_a=reading['current_a'],
            reported_power_kw=reading['reported_power_kw'],
            power_factor=reading.get('power_factor')
        )
        
        is_physics_anomaly = val_res["validation_status"] != ValidationStatus.VALID
        
        if is_physics_anomaly:
            # Create physics anomaly
            anomaly = {
                "id": str(uuid.uuid4())[:8],
                "building_id": b_id,
                "building_name": b_name,
                "timestamp": reading['timestamp'],
                "reported_power_kw": current_kw,
                "baseline_kw": reading['expected_power_kw'],
                "deviation_percent": val_res.get("relative_error", 1.0) * 100,
                "anomaly_score": 1.0,
                "model_version": "physics-v1",
                "severity": "CRITICAL",
                "physics_status": val_res["validation_status"].value if hasattr(val_res["validation_status"], "value") else str(val_res["validation_status"]).split('.')[-1],
                "is_quarantined": val_res.get("is_quarantined", True),
                "triage_status": "PENDING",
                "ai_triage": {
                    "category": "TELEMETRY_HARDWARE_ERROR",
                    "confidence": 0.99,
                    "reason": f"Physics mismatch: V={reading['voltage_v']} I={reading['current_a']} P={current_kw}. Error: {val_res.get('relative_error', 0)*100:.1f}%",
                    "recommended_action": "Quarantine sensor data and dispatch technician for calibration check.",
                    "human_review_required": True
                }
            }
            new_anomalies.append(anomaly)
            continue # Skip ML for bad physics data
            
        # 2. ML Anomaly Detection (via API to match architecture, or local)
        # Calling API for every reading takes too long. Let's do it directly.
        if len(history) < 2:
            history_by_building[b_id].append(current_kw)
            continue
            
        mean_kw = sum(history) / len(history)
        variance = sum((x - mean_kw) ** 2 for x in history) / len(history)
        import math
        std_dev = math.sqrt(variance)
        
        min_std_dev = max(0.01, 0.05 * mean_kw)
        if std_dev < min_std_dev:
            std_dev = min_std_dev
            
        z_score = abs(current_kw - mean_kw) / std_dev
        raw_score = 1.0 / (1.0 + math.exp(-0.8 * (z_score - 2.5)))
        normalized = min(0.99, max(0.01, raw_score))
        
        if normalized >= threshold:
            severity = "LOW"
            if normalized >= 0.88: severity = "CRITICAL"
            elif normalized >= 0.78: severity = "HIGH"
            elif normalized >= 0.68: severity = "MEDIUM"
            
            # Since LLM api key might not be set, we will simulate the Context-Aware Resolver LLM 
            # with deterministic logic for now, or just leave it OPEN. 
            # In real system, this would call /triage
            
            anomaly = {
                "id": str(uuid.uuid4())[:8],
                "building_id": b_id,
                "building_name": b_name,
                "timestamp": reading['timestamp'],
                "reported_power_kw": current_kw,
                "baseline_kw": reading['expected_power_kw'],
                "deviation_percent": ((current_kw - reading['expected_power_kw']) / reading['expected_power_kw']) * 100 if reading['expected_power_kw'] else 0,
                "anomaly_score": normalized,
                "model_version": "z-score-v1",
                "severity": severity,
                "physics_status": "VALID",
                "is_quarantined": False,
                "triage_status": "PENDING",
                "ai_triage": {
                    "category": "UNSURE",
                    "confidence": 0.5,
                    "reason": "Z-score threshold exceeded. Pending full LLM context resolution.",
                    "recommended_action": "Review contextual timeline for schedule or equipment overrides.",
                    "human_review_required": True
                }
            }
            new_anomalies.append(anomaly)
            
        history_by_building[b_id].append(current_kw)
        
    db['anomalies'] = new_anomalies
    print(f"Generated {len(new_anomalies)} anomalies.")
    save_db(db)
    print("Database updated!")

if __name__ == "__main__":
    process_pipeline()
