import requests
import math
import time
import random
import argparse
import sys

API_BASE     = "http://localhost:8081/api"
API_POSITION = f"{API_BASE}/positions"

# ── Arguments CLI ─────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="Simulateur de marche GPS")
parser.add_argument("--user-id",       default="marcheur1",  help="Nom / identifiant de la personne")
parser.add_argument("--traitement-id", type=int, default=2,  help="ID du traitement en base")
parser.add_argument("--vitesse",       type=float, default=1.4, help="Vitesse en m/s (1.4 = normal)")
parser.add_argument("--intervalle",    type=float, default=1.0, help="Intervalle entre positions (s)")
args = parser.parse_args()

# ── Configuration ──────────────────────────────────────────────────────────
USER_ID       = args.user_id
TRAITEMENT_ID = args.traitement_id
VITESSE_MS    = args.vitesse
INTERVALLE    = args.intervalle

# ── Recuperer la zone autorisee via le traitement ─────────────────────────
print(f"Recuperation des zones autorisees actives (traitement={TRAITEMENT_ID})...")

zone = None
for attempt in range(5):
    try:
        r = requests.get(f"{API_BASE}/authorized-zones/traitement/{TRAITEMENT_ID}/active", timeout=5)
        r.raise_for_status()
        zones = r.json()
        if zones and len(zones) > 0:
            zone = zones[0]
            break
        else:
            print(f"  Tentative {attempt+1}/5 : aucune zone active trouvee.")
    except Exception as e:
        print(f"  Tentative {attempt+1}/5 : erreur ({e})")
    time.sleep(2)

if zone is None:
    print("ERREUR : impossible de recuperer une zone active pour ce traitement.")
    print("Verifiez que le backend Spring Boot tourne sur :8081 et qu'une zone active existe.")
    sys.exit(1)

LAT_DEPART = float(zone["latitude"])
LON_DEPART = float(zone["longitude"])
RAYON_ZONE = int(zone.get("rayon", 100))
print(f"Zone : {zone.get('nom', '?')}  |  centre : {LAT_DEPART}, {LON_DEPART}  |  rayon : {RAYON_ZONE} m")

# ── Simulation ─────────────────────────────────────────────────────────────
lat   = LAT_DEPART
lon   = LON_DEPART
angle = random.uniform(0, 360)

PAS_LAT = VITESSE_MS / 11000
PAS_LON = VITESSE_MS / (11000 * math.cos(math.radians(LAT_DEPART)))

print(f"Simulation demarree : {USER_ID}")
print(f"Depart : {lat}, {lon}")
print(f"Vitesse : {VITESSE_MS} m/s  |  Intervalle : {INTERVALLE}s")
print(f"API : {API_POSITION}")
print("-" * 50)

pas = 0
try:
    while True:
        angle += random.uniform(-20, 20)

        rad = math.radians(angle)
        lat += PAS_LAT * math.cos(rad)
        lon += PAS_LON * math.sin(rad)

        try:
            res = requests.post(API_POSITION, json={
                "user_id":       USER_ID,
                "lat":           lat,
                "lon":           lon,
                "traitement_id": TRAITEMENT_ID
            }, timeout=5)

            pas += 1
            statut = "OK" if res.status_code == 200 else f"ERREUR {res.status_code}"
            print(f"[Pas {pas:04d}] lat={lat:.6f}  lon={lon:.6f}  dir={angle % 360:.1f}  -> {statut}")

        except requests.exceptions.ConnectionError:
            print(f"[Pas {pas+1:04d}] Serveur inaccessible — reessai dans {INTERVALLE}s")
        except requests.exceptions.ReadTimeout:
            print(f"[Pas {pas+1:04d}] Timeout — reessai dans {INTERVALLE}s")

        time.sleep(INTERVALLE)

except KeyboardInterrupt:
    print(f"\nSimulation arretee apres {pas} pas.")
