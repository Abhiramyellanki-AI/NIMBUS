import urllib.request
import json
import time

def process_all_pending():
    print("Fetching anomalies...", flush=True)
    req = urllib.request.Request("http://127.0.0.1:3000/api/anomalies")
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
    except Exception as e:
        print("Error fetching anomalies:", e, flush=True)
        return

    anomalies = data.get("anomalies", [])
    pending = [a for a in anomalies if a.get("triage_status") == "PENDING"]
    
    print(f"Found {len(pending)} pending anomalies.")
    
    for idx, anomaly in enumerate(pending):
        a_id = anomaly['id']
        print(f"[{idx+1}/{len(pending)}] Triaging anomaly {a_id}...")
        
        triage_req = urllib.request.Request(f"http://127.0.0.1:3000/api/anomalies/{a_id}/triage", method="POST")
        try:
            with urllib.request.urlopen(triage_req) as t_res:
                t_data = json.loads(t_res.read().decode())
                t_cat = t_data.get("triage", {}).get("category", "UNKNOWN")
                print(f"  -> Result: {t_cat}")
        except Exception as e:
            print(f"  -> Failed: {e}")
            
        time.sleep(1.5) # Prevent rate limits

if __name__ == "__main__":
    process_all_pending()
