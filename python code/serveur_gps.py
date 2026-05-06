from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Allow requests from Angular (localhost:4200)

# In-memory store: user_id -> latest position
positions: dict = {}


@app.route("/api/position", methods=["POST"])
def receive_position():
    """Called by simulateur_marche.py to push a new position."""
    data = request.get_json(silent=True)
    if not data or "user_id" not in data or "lat" not in data or "lon" not in data:
        return jsonify({"error": "Missing fields: user_id, lat, lon"}), 400

    positions[data["user_id"]] = {
        "user_id": data["user_id"],
        "lat": float(data["lat"]),
        "lon": float(data["lon"]),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    print(f"[GPS] {data['user_id']}  lat={data['lat']:.6f}  lon={data['lon']:.6f}")
    return jsonify({"status": "ok"}), 200


@app.route("/api/positions", methods=["GET"])
def get_positions():
    """Called by the Angular map to fetch all latest positions."""
    all_positions = list(positions.values())
    return jsonify({"positions": all_positions, "total": len(all_positions)}), 200


if __name__ == "__main__":
    print("GPS server running on http://localhost:8086")
    print("  POST /api/position   <- simulateur_marche.py")
    print("  GET  /api/positions  <- Angular map")

    try:
        app.run(host="127.0.0.1", port=8086, debug=True)
    except OSError as e:
        print(f"Error: {e}")
        print("Port 8086 is already in use. Try: netstat -ano | findstr :8086")
        print("Or kill the process and try again")
