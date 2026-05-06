"""
MemorIA Launcher — manages serveur_gps.py and simulateur_marche.py processes.
Serves the HTML dashboard on http://localhost:5000
"""

from flask import Flask, send_file, jsonify, request
from flask_cors import CORS
import subprocess
import sys
import os
import atexit

app = Flask(__name__)
CORS(app)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Process tracking ──────────────────────────────────────────────────────
gps_server_proc = None          # single instance of serveur_gps.py
simulation_procs: dict = {}     # patient_id -> Popen


def cleanup():
    """Kill all child processes on exit."""
    global gps_server_proc
    if gps_server_proc and gps_server_proc.poll() is None:
        gps_server_proc.terminate()
    for proc in simulation_procs.values():
        if proc.poll() is None:
            proc.terminate()


atexit.register(cleanup)


# ── Routes: HTML page ─────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_file(os.path.join(SCRIPT_DIR, "index.html"))


# ── Routes: GPS server management ─────────────────────────────────────────

@app.route("/api/gps-server/start", methods=["POST"])
def start_gps_server():
    global gps_server_proc
    if gps_server_proc and gps_server_proc.poll() is None:
        return jsonify({"status": "already_running", "pid": gps_server_proc.pid})

    gps_server_proc = subprocess.Popen(
        [sys.executable, os.path.join(SCRIPT_DIR, "serveur_gps.py")],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT
    )
    return jsonify({"status": "started", "pid": gps_server_proc.pid})


@app.route("/api/gps-server/stop", methods=["POST"])
def stop_gps_server():
    global gps_server_proc
    if gps_server_proc and gps_server_proc.poll() is None:
        gps_server_proc.terminate()
        gps_server_proc = None
        return jsonify({"status": "stopped"})
    return jsonify({"status": "not_running"})


# ── Routes: simulation management ─────────────────────────────────────────

@app.route("/api/simulation/start", methods=["POST"])
def start_simulation():
    data = request.get_json()
    patient_id = str(data.get("patient_id"))
    user_name = data.get("user_name", f"patient_{patient_id}")
    traitement_id = data.get("traitement_id", 1)

    # Stop existing simulation for this patient
    _stop_process(patient_id)

    proc = subprocess.Popen(
        [
            sys.executable,
            os.path.join(SCRIPT_DIR, "simulateur_marche.py"),
            "--user-id", str(user_name),
            "--traitement-id", str(traitement_id),
        ],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT
    )
    simulation_procs[patient_id] = proc
    return jsonify({"status": "started", "patient_id": patient_id, "pid": proc.pid})


@app.route("/api/simulation/stop", methods=["POST"])
def stop_simulation():
    data = request.get_json()
    patient_id = str(data.get("patient_id"))
    stopped = _stop_process(patient_id)
    return jsonify({"status": "stopped" if stopped else "not_running"})


@app.route("/api/simulation/stop-all", methods=["POST"])
def stop_all():
    for pid in list(simulation_procs.keys()):
        _stop_process(pid)
    return jsonify({"status": "all_stopped"})


@app.route("/api/simulation/status")
def simulation_status():
    status = {}
    for pid, proc in simulation_procs.items():
        status[pid] = "running" if proc.poll() is None else "stopped"
    return jsonify(status)


def _stop_process(patient_id):
    if patient_id in simulation_procs:
        proc = simulation_procs[patient_id]
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                proc.kill()
        del simulation_procs[patient_id]
        return True
    return False


# ── Main ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 55)
    print("  MemorIA Launcher")
    print("  Dashboard : http://localhost:5000")
    print("  Spring Boot backend must be running on :8080")
    print("=" * 55)
    app.run(host="127.0.0.1", port=5000, debug=False)
