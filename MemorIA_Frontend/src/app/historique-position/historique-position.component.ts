import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';

const BACKEND = 'http://localhost:9090';

// Fix default marker icons (Leaflet webpack issue)
const iconDefault = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

interface LocationHistory {
  idHistoriquePosition: number;
  latitude: number;
  longitude: number;
  dureeArretMinute?: number;
  heureArrive?: string;
  heureDepart?: string;
  distancePointPrecedent?: number;
  distancePointSuivant?: number;
  dateEnregistrement: string;
  traitements?: { idTraitement: number; titre: string };
}

interface Traitement { idTraitement: number; titre: string; }

interface DayGroup {
  dateKey: string;          // 'YYYY-MM-DD'
  label: string;            // formatted display
  records: LocationHistory[];
  expanded: boolean;
}

@Component({
  selector: 'app-historique-position',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historique-position.component.html',
  styleUrl: './historique-position.component.css'
})
export class HistoriquePositionComponent implements OnInit, OnDestroy {

  records: LocationHistory[] = [];
  traitements: Traitement[] = [];
  loading = false;
  error = '';
  filterTraitementId = 0;

  // Live auto-refresh
  liveMode = false;
  liveCount = 0;
  private liveInterval: ReturnType<typeof setInterval> | null = null;

  // Day grouping
  expandedDays = new Set<string>();

  // Map panel
  showMapPanel = false;
  mapDayGroup: DayGroup | null = null;
  private mapInstance: L.Map | null = null;

  // Form
  showForm = false;
  saving = false;
  saveError = '';
  saveSuccess = false;
  form = this.emptyForm();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadTraitements();
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.stopLive();
    this.destroyMap();
  }

  // ── Grouping ──────────────────────────────────────────────

  get groupedDays(): DayGroup[] {
    const map = new Map<string, LocationHistory[]>();
    for (const r of this.records) {
      const dateKey = r.dateEnregistrement ? r.dateEnregistrement.slice(0, 10) : 'inconnu';
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(r);
    }
    const sorted = [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    return sorted.map(([dateKey, recs]) => ({
      dateKey,
      label: this.fmtDay(dateKey),
      records: [...recs].sort((a, b) =>
        (a.heureDepart ?? a.dateEnregistrement ?? '').localeCompare(
          b.heureDepart ?? b.dateEnregistrement ?? ''
        )
      ),
      expanded: this.expandedDays.has(dateKey)
    }));
  }

  toggleDay(group: DayGroup): void {
    if (this.expandedDays.has(group.dateKey)) {
      this.expandedDays.delete(group.dateKey);
    } else {
      this.expandedDays.add(group.dateKey);
    }
  }

  private fmtDay(dateKey: string): string {
    if (dateKey === 'inconnu') return 'Date inconnue';
    const d = new Date(dateKey + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  // ── Map panel ────────────────────────────────────────────

  openMapPanel(group: DayGroup): void {
    this.mapDayGroup = group;
    this.showMapPanel = true;
    setTimeout(() => this.renderMap(group.records), 150);
  }

  closeMapPanel(): void {
    this.showMapPanel = false;
    this.mapDayGroup = null;
    this.destroyMap();
  }

  private renderMap(records: LocationHistory[]): void {
    this.destroyMap();
    const container = document.getElementById('hp-map-container');
    if (!container) return;

    const sorted = [...records]
      .filter(r => r.latitude && r.longitude)
      .sort((a, b) =>
        (a.heureDepart ?? a.dateEnregistrement ?? '').localeCompare(
          b.heureDepart ?? b.dateEnregistrement ?? ''
        )
      );

    if (sorted.length === 0) return;

    const coords: [number, number][] = sorted.map(r => [r.latitude, r.longitude]);

    this.mapInstance = L.map(container).setView(coords[0], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.mapInstance);

    // Polyline path
    L.polyline(coords, { color: '#6366f1', weight: 4, opacity: 0.85 }).addTo(this.mapInstance);

    // Markers
    sorted.forEach((r, i) => {
      const isFirst = i === 0;
      const isLast  = i === sorted.length - 1;
      const color   = isFirst ? '#16a34a' : isLast ? '#dc2626' : '#6366f1';
      const icon    = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
        iconAnchor: [7, 7]
      });
      const m = L.marker([r.latitude, r.longitude], { icon }).addTo(this.mapInstance!);
      m.bindPopup(
        `<b>Point ${i + 1}${isFirst ? ' — Départ' : isLast ? ' — Arrivée' : ''}</b><br>` +
        `Heure départ: ${this.fmt(r.heureDepart)}<br>` +
        `Durée arrêt: ${r.dureeArretMinute != null ? r.dureeArretMinute + ' min' : '—'}<br>` +
        `Dist. préc.: ${r.distancePointPrecedent != null ? r.distancePointPrecedent + ' m' : '—'}<br>` +
        `Traitement: ${r.traitements?.titre ?? '—'}`
      );
    });

    if (coords.length > 1) {
      this.mapInstance.fitBounds(L.polyline(coords).getBounds(), { padding: [30, 30] });
    }
  }

  private destroyMap(): void {
    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }
  }

  // ── Live ─────────────────────────────────────────────────

  toggleLive(): void {
    this.liveMode = !this.liveMode;
    if (this.liveMode) {
      this.liveCount = 0;
      this.loadAll();
      this.liveInterval = setInterval(() => { this.liveCount++; this.loadAll(); }, 3000);
    } else {
      this.stopLive();
    }
  }

  private stopLive(): void {
    if (this.liveInterval) { clearInterval(this.liveInterval); this.liveInterval = null; }
    this.liveMode = false;
  }

  // ── Data ─────────────────────────────────────────────────

  private emptyForm() {
    const now = new Date().toISOString().slice(0, 16);
    return { latitude: 0, longitude: 0, dureeArretMinute: 0,
      heureArrive: now, heureDepart: now, distancePointPrecedent: 0,
      distancePointSuivant: 0, dateEnregistrement: now, idTraitement: 0 };
  }

  loadTraitements(): void {
    this.http.get<Traitement[]>(`${BACKEND}/api/treatments`).subscribe({
      next: (data) => {
        this.traitements = data;
        if (data.length > 0) this.form.idTraitement = data[0].idTraitement;
      }
    });
  }

  loadAll(): void {
    this.loading = true;
    this.error = '';
    const url = this.filterTraitementId > 0
      ? `${BACKEND}/api/location-history/traitement/${this.filterTraitementId}`
      : `${BACKEND}/api/location-history`;
    this.http.get<LocationHistory[]>(url).subscribe({
      next: (data) => { this.records = data; this.loading = false; },
      error: () => { this.error = 'Impossible de charger l\'historique.'; this.loading = false; }
    });
  }

  openForm(): void {
    this.form = this.emptyForm();
    if (this.traitements.length > 0) this.form.idTraitement = this.traitements[0].idTraitement;
    this.saveError = ''; this.saveSuccess = false; this.showForm = true;
  }

  closeForm(): void { this.showForm = false; }

  save(): void {
    if (!this.form.latitude || !this.form.longitude) {
      this.saveError = 'Latitude et longitude sont obligatoires.'; return;
    }
    this.saving = true; this.saveError = '';
    const payload = {
      latitude: this.form.latitude, longitude: this.form.longitude,
      dureeArretMinute: this.form.dureeArretMinute,
      heureArrive: this.form.heureArrive, heureDepart: this.form.heureDepart,
      distancePointPrecedent: this.form.distancePointPrecedent,
      distancePointSuivant: this.form.distancePointSuivant,
      dateEnregistrement: this.form.dateEnregistrement,
      traitements: { idTraitement: Number(this.form.idTraitement) }
    };
    this.http.post(`${BACKEND}/api/location-history`, payload).subscribe({
      next: () => {
        this.saving = false; this.saveSuccess = true; this.loadAll();
        setTimeout(() => { this.showForm = false; this.saveSuccess = false; }, 1500);
      },
      error: (err) => { this.saving = false; this.saveError = err?.error?.message ?? 'Erreur serveur.'; }
    });
  }

  delete(id: number): void {
    if (!confirm('Supprimer cet enregistrement ?')) return;
    this.http.delete(`${BACKEND}/api/location-history/${id}`).subscribe({
      next: () => this.loadAll(),
      error: () => this.error = 'Impossible de supprimer.'
    });
  }

  fmt(dt?: string): string {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  }
}
