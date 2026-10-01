from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import math
import requests
from schemas.models import LLMTriageOutput, TriageCategory
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = FastAPI(title="NIMBUS ML & AI Services")

class DetectRequest(BaseModel):
    history_kw: List[float]
    current_kw: float
    threshold: float = 0.65

class DetectResponse(BaseModel):
    is_anomaly: bool
    anomaly_score: float
    severity: str

@app.post("/detect", response_model=DetectResponse)
def detect_anomaly(req: DetectRequest):
    if len(req.history_kw) < 2:
        return DetectResponse(is_anomaly=False, anomaly_score=0.0, severity="LOW")
        
    # Statistical Anomaly Detection (Z-Score) per architecture
    mean_kw = sum(req.history_kw) / len(req.history_kw)
    variance = sum((x - mean_kw) ** 2 for x in req.history_kw) / len(req.history_kw)
    std_dev = math.sqrt(variance)
    
    # Prevent division by zero and hyper-sensitivity on stable sensors
    min_std_dev = max(0.01, 0.05 * mean_kw)
    if std_dev < min_std_dev:
        std_dev = min_std_dev
        
    z_score = abs(req.current_kw - mean_kw) / std_dev
    
    # Sigmoid normalization: mapped such that Z=2.5 is ~0.5
    raw_score = 1.0 / (1.0 + math.exp(-0.8 * (z_score - 2.5)))
    normalized = min(0.99, max(0.01, raw_score))
    
    is_anomaly = normalized >= req.threshold
    
    severity = "LOW"
    if normalized >= 0.88:
        severity = "CRITICAL"
    elif normalized >= 0.78:
        severity = "HIGH"
    elif normalized >= 0.68:
        severity = "MEDIUM"
        
    return DetectResponse(is_anomaly=is_anomaly, anomaly_score=normalized, severity=severity)

class TriageRequest(BaseModel):
    context: str

@app.post("/triage", response_model=LLMTriageOutput)
def triage_anomaly(req: TriageRequest):
    api_key = os.environ.get("GROQ_API_KEY", "")
    
    # We always use local inference now, so we bypass the Groq check
    if False:
        ctx = req.context.lower()
        if "approved" in ctx or "override" in ctx or "maintenance" in ctx or "active ai model" in ctx:
            cat = TriageCategory.AUTHORIZED_OPERATIONAL_LOAD
        elif "occupancy: 0" in ctx or "empty" in ctx or "offline" in ctx:
            cat = TriageCategory.ACTIONABLE_ENERGY_WASTE
        elif "telemetry" in ctx or "error" in ctx or "out of bounds" in ctx or "impossible" in ctx:
            cat = TriageCategory.TELEMETRY_HARDWARE_ERROR
        else:
            cat = TriageCategory.AUTHORIZED_OPERATIONAL_LOAD
            
        return LLMTriageOutput(
            category=cat,
            confidence=0.95,
            reason="Deterministic Python Rule Engine: Processed context keywords. Groq API key missing. Assuming you want local inference, passing...",
            evidence=["sys_log"],
            recommended_action="Review rules",
            human_review_required=True
        )

    # Use Local Ollama API
    try:
        # Truncate context heavily to ensure super fast execution
        context_str = req.context
        if len(context_str) > 1000:
            context_str = context_str[:1000] + "... (truncated)"
            
        prompt = f"""
        You are an elite Campus Energy Facilities AI Assistant.
        An underlying Machine Learning model has already flagged an anomaly (Z-score deviation).
        Your job is NOT to determine IF it's an anomaly, but to act as a forensic investigator to determine WHY it happened, WHERE the root cause lies, and HOW to fix it.
        
        Analyze the following context packet (which contains telemetry, schedules, equipment status, and maintenance records).
        
        Context: {context_str}
        
        Provide a highly detailed root-cause analysis. Correlate data points.
        
        CRITICAL RULES:
        - NEVER classify as UNSURE unless the data is literally corrupted. You MUST make a decisive classification between ACTIONABLE_ENERGY_WASTE, AUTHORIZED_OPERATIONAL_LOAD, or TELEMETRY_HARDWARE_ERROR.
        - If power is high and it is outside of normal operating hours (e.g. late night), it is ACTIONABLE_ENERGY_WASTE.
        - Be decisive.
        
        Respond with exactly this JSON format:
        {{
            "category": "ACTIONABLE_ENERGY_WASTE" | "AUTHORIZED_OPERATIONAL_LOAD" | "TELEMETRY_HARDWARE_ERROR",
            "confidence": 0.95,
            "reason": "Provide a comprehensive paragraph explaining the root cause...",
            "evidence": ["sensor_id_1", "equipment_id_2"],
            "recommended_action": "Provide detailed, step-by-step suggestions...",
            "human_review_required": true
        }}
        """
        
        # We detected qwen2.5-coder:7b and phi3 on the system
        # qwen2.5-coder is excellent for JSON formatting and adherence.
        selected_model = "qwen2.5-coder:7b" 

        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": selected_model,
                "prompt": prompt,
                "format": "json",
                "stream": False,
                "options": {
                    "temperature": 0.1
                }
            },
            timeout=30
        )
        
        if response.status_code == 200:
            response_text = response.json().get("response", "{}")
            data = json.loads(response_text)
            return LLMTriageOutput(**data)
        else:
            raise Exception(f"Ollama returned {response.status_code}")

    except Exception as e:
        return LLMTriageOutput(
            category=TriageCategory.AUTHORIZED_OPERATIONAL_LOAD,
            confidence=0.1,
            reason=f"LLM Error: {str(e)}",
            evidence=["error"],
            recommended_action="Verify system",
            human_review_required=True
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
