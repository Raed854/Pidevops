import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';

const BACKEND = 'http://localhost:9090';
const GPS_API  = `${BACKEND}/api/positions`;

interface GpsPosition {
  user_id: string;
  lat: number;
  lon: number;
  timestamp?: string;
}

interface SavedZone {
  idZoneAutorisee: number;
  nom: string;
  latitude: number;
  longitude: number;
  rayon: number;
  actif: boolean;
}

interface GpsPositionsResponse {
  positions: GpsPosition[];
  total: number;
}

// Fix default marker icons (Leaflet webpack issue)
const iconDefault = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

const AUTHORIZED_ZONES: { lat: number; lng: number; radius: number; label: string }[] = [
  { lat: 36.8065, lng: 10.1815, radius: 500, label: 'Zone A — Tunis Centre' },
  { lat: 36.8200, lng: 10.1650, radius: 300, label: 'Zone B — Lac' }
];

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface TileStyle {
  id: string;
  label: string;
  url: string;
  attribution: string;
}

const TILE_STYLES: TileStyle[] = [
  {
    id: 'standard',
    label: 'Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  {
    id: 'light',
    label: 'Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>'
  },
  {
    id: 'dark',
    label: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>'
  },
  {
    id: 'topo',
    label: 'Topo',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://opentopomap.org">OpenTopoMap</a>'
  }
];

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent implements OnInit, OnDestroy {
  private map!: L.Map;
  private positionMarker: L.Marker | null = null;
  private positionCircle: L.Circle | null = null;
  private zoneCircles: L.Circle[] = [];
  private searchMarker: L.Marker | null = null;
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;
  private tileLayer!: L.TileLayer;

  // Custom zone drawing
  private tempMarker: L.Marker | null = null;
  private savedMarkers: L.Marker[] = [];
  private pathLayer: L.Polyline | null = null;
  private drawnZone: L.Polygon | null = null;
  savedPoints: L.LatLng[] = [];
  zoneDrawn = false;

  zonesVisible = false;
  loadingPosition = false;
  positionError = '';

  // Tile styles
  readonly tileStyles = TILE_STYLES;
  activeStyleId = 'standard';

  // Search
  searchQuery = '';
  searchResults: NominatimResult[] = [];
  searching = false;
  searchError = '';
  showSuggestions = false;

  // ── Saved zones display ───────────────────────────────────────────────────────
  savedZonesVisible = false;
  private savedZoneCircles  = new Map<number, L.Circle>();
  private savedZoneLabels   = new Map<number, L.Marker>();

  // ── Save Zone feature ────────────────────────────────────────────────────────
  zoneSaveMode   = false;
  zoneSavePoint: { lat: number; lng: number } | null = null;
  zoneSaveStatus: 'idle' | 'saving' | 'success' | 'error' = 'idle';
  zoneSaveError  = '';
  zoneForm = { nom: '', rayon: 100, actif: true, idTraitement: 0 };
  traitements: { idTraitement: number; titre: string }[] = [];
  traitementsLoading = false;
  private zoneSaveMarker: L.Marker | null = null;
  private zoneSaveCircle: L.Circle | null = null;

  // GPS tracking
  trackedVisible = false;
  autoMode = false;
  followMode = false;
  trackingError = '';
  trackedUsers: { id: string; distance: number; speed: number; lastSeen: string }[] = [];

  private userPaths        = new Map<string, L.LatLng[]>();
  private userTimestamps   = new Map<string, string[]>();
  private startMarkers     = new Map<string, L.Marker>();
  private currentMarkers   = new Map<string, L.Marker>();
  private pathPolylines    = new Map<string, L.Polyline>();
  private shadowPolylines  = new Map<string, L.Polyline>();
  private waypointMarkers  = new Map<string, L.CircleMarker[]>();
  private waypointCounts   = new Map<string, number>();
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private firstPositionReceived = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  private initMap(): void {
    this.map = L.map('map', { center: [36.8065, 10.1815], zoom: 13 });

    const style = TILE_STYLES[0];
    this.tileLayer = L.tileLayer(style.url, { attribution: style.attribution }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.showSuggestions = false;
      this.onMapClick(e);
    });
  }

  // ── Save Zone feature ────────────────────────────────────────────────────────

  toggleZoneSaveMode(): void {
    this.zoneSaveMode = !this.zoneSaveMode;
    if (this.zoneSaveMode) {
      this.loadTraitements();
    } else {
      this.cancelZoneSave();
    }
  }

  private loadTraitements(): void {
    this.traitementsLoading = true;
    this.http.get<{ idTraitement: number; titre: string }[]>(
      `${BACKEND}/api/treatments`
    ).subscribe({
      next: (data) => {
        this.traitements = data;
        this.zoneForm.idTraitement = data.length > 0 ? data[0].idTraitement : 0;
        this.traitementsLoading = false;
      },
      error: () => { this.traitementsLoading = false; }
    });
  }

  cancelZoneSave(): void {
    this.zoneSavePoint  = null;
    this.zoneSaveStatus = 'idle';
    this.zoneSaveError  = '';
    this.zoneForm       = { nom: '', rayon: 100, actif: true, idTraitement: 0 };
    if (this.zoneSaveMarker) { this.map.removeLayer(this.zoneSaveMarker); this.zoneSaveMarker = null; }
    if (this.zoneSaveCircle) { this.map.removeLayer(this.zoneSaveCircle); this.zoneSaveCircle = null; }
  }

  onZoneRadiusChange(): void {
    if (this.zoneSaveCircle) this.zoneSaveCircle.setRadius(this.zoneForm.rayon);
  }

  saveZone(): void {
    if (!this.zoneSavePoint || !this.zoneForm.nom.trim()) return;
    this.zoneSaveStatus = 'saving';
    this.zoneSaveError  = '';

    const payload = {
      nom:       this.zoneForm.nom.trim(),
      latitude:  this.zoneSavePoint.lat,
      longitude: this.zoneSavePoint.lng,
      rayon:     Number(this.zoneForm.rayon),
      actif:     this.zoneForm.actif,
      traitements: { idTraitement: Number(this.zoneForm.idTraitement) }
    };

    console.log('[SaveZone] Payload envoyé →', JSON.stringify(payload, null, 2));

    this.http.post(`${BACKEND}/api/authorized-zones`, payload).subscribe({
      next: (res) => {
        console.log('[SaveZone] Succès →', res);
        this.zoneSaveStatus = 'success';
        if (this.savedZonesVisible) this.fetchAndDrawSavedZones();
        setTimeout(() => { this.zoneSaveMode = false; this.cancelZoneSave(); }, 2000);
      },
      error: (err) => {
        console.error('[SaveZone] status  →', err.status);
        console.error('[SaveZone] err.error (body) →', err.error);
        console.error('[SaveZone] err.error JSON →', JSON.stringify(err.error));
        const validationErrors: string = err?.error?.errors
          ?.map((e: { field: string; defaultMessage: string }) => `${e.field}: ${e.defaultMessage}`)
          ?.join(' | ') ?? '';
        const message: string =
          validationErrors ||
          err?.error?.message ||
          err?.error?.error ||
          (typeof err?.error === 'string' ? err.error : '') ||
          err?.message ||
          'Erreur serveur, réessayez.';
        this.zoneSaveStatus = 'error';
        this.zoneSaveError  = message;
      }
    });
  }

  private onZoneSaveMapClick(latlng: L.LatLng): void {
    const { lat, lng } = latlng;
    this.zoneSavePoint  = { lat, lng };
    this.zoneSaveStatus = 'idle';

    if (this.zoneSaveMarker) this.map.removeLayer(this.zoneSaveMarker);
    if (this.zoneSaveCircle) this.map.removeLayer(this.zoneSaveCircle);

    const pinIcon = L.divIcon({
      className: '',
      html: `<div class="zone-save-pin">📌</div>`,
      iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -34]
    });

    this.zoneSaveMarker = L.marker([lat, lng], { icon: pinIcon })
      .addTo(this.map)
      .bindPopup(`<b>Point sélectionné</b><br>${lat.toFixed(5)}, ${lng.toFixed(5)}`);

    this.zoneSaveCircle = L.circle([lat, lng], {
      radius:      this.zoneForm.rayon,
      color:       '#7c3aed',
      fillColor:   '#c4b5fd',
      fillOpacity: 0.3,
      weight:      2.5,
      dashArray:   '6 4'
    }).addTo(this.map);

    this.map.flyTo([lat, lng], this.map.getZoom(), { animate: true, duration: 0.6 });
  }

  // ── Saved zones display ──────────────────────────────────────────────────────

  toggleSavedZones(): void {
    if (this.savedZonesVisible) {
      this.clearSavedZones();
      this.savedZonesVisible = false;
    } else {
      this.savedZonesVisible = true;
      this.fetchAndDrawSavedZones();
    }
  }

  private fetchAndDrawSavedZones(): void {
    this.http.get<SavedZone[]>(`${BACKEND}/api/authorized-zones`).subscribe({
      next: (zones) => {
        this.clearSavedZones();
        if (zones.length === 0) return;

        zones.forEach(z => {
          const color  = z.actif ? '#16a34a' : '#9ca3af';
          const fill   = z.actif ? '#86efac' : '#e5e7eb';

          const circle = L.circle([z.latitude, z.longitude], {
            radius: z.rayon, color, fillColor: fill,
            fillOpacity: 0.3, weight: 2
          }).addTo(this.map).bindPopup(
            `<div class="track-popup">
               <div class="track-popup__name" style="color:${color}">
                 ${z.actif ? '✅' : '⛔'} ${z.nom}
               </div>
               <div class="track-popup__row"><span>Rayon</span><b>${z.rayon} m</b></div>
               <div class="track-popup__row"><span>Statut</span><b>${z.actif ? 'Active' : 'Inactive'}</b></div>
               <div class="track-popup__row"><span>Lat</span><b>${z.latitude.toFixed(5)}</b></div>
               <div class="track-popup__row"><span>Lon</span><b>${z.longitude.toFixed(5)}</b></div>
             </div>`
          );
          this.savedZoneCircles.set(z.idZoneAutorisee, circle);

          const labelIcon = L.divIcon({
            className: '',
            html: `<div class="saved-zone-label ${z.actif ? '' : 'saved-zone-label--inactive'}">${z.nom}</div>`,
            iconSize: [120, 24], iconAnchor: [60, 12]
          });
          const label = L.marker([z.latitude, z.longitude], { icon: labelIcon, zIndexOffset: 10 })
            .addTo(this.map);
          this.savedZoneLabels.set(z.idZoneAutorisee, label);
        });

        const group = L.featureGroup([...this.savedZoneCircles.values()]);
        this.map.flyToBounds(group.getBounds().pad(0.3), { animate: true, duration: 1.2 });
      },
      error: () => {}
    });
  }

  private clearSavedZones(): void {
    this.savedZoneCircles.forEach(c => this.map.removeLayer(c));
    this.savedZoneLabels.forEach(m => this.map.removeLayer(m));
    this.savedZoneCircles.clear();
    this.savedZoneLabels.clear();
  }

  // ── Custom zone drawing ──────────────────────────────────────────────────────

  onMapClick(e: L.LeafletMouseEvent): void {
    // Route to zone-save mode when active
    if (this.zoneSaveMode) {
      this.onZoneSaveMapClick(e.latlng);
      return;
    }

    if (this.tempMarker) {
      this.map.removeLayer(this.tempMarker);
      this.tempMarker = null;
    }

    const { lat, lng } = e.latlng;
    const nextIdx = this.savedPoints.length + 1;

    const plusIcon = L.divIcon({
      className: '',
      html: `<div class="plus-marker">+</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -20]
    });

    this.tempMarker = L.marker([lat, lng], { icon: plusIcon }).addTo(this.map);
    const popupId = `add-btn-${Date.now()}`;
    this.tempMarker.bindPopup(
      `<div class="click-popup">
         <div class="popup-coords">📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
         <button class="popup-add-btn" id="${popupId}">+ Add to zone (Point ${nextIdx})</button>
       </div>`,
      { closeButton: true, minWidth: 200 }
    ).openPopup();

    this.tempMarker.on('popupopen', () => {
      const btn = document.getElementById(popupId);
      if (btn) btn.onclick = () => this.addPoint(e.latlng);
    });
  }

  addPoint(latlng: L.LatLng): void {
    this.savedPoints.push(latlng);
    const idx = this.savedPoints.length;

    if (this.tempMarker) {
      this.map.removeLayer(this.tempMarker);
      this.tempMarker = null;
    }

    const numIcon = L.divIcon({
      className: '',
      html: `<div class="zone-point-marker">${idx}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -16]
    });

    const marker = L.marker([latlng.lat, latlng.lng], { icon: numIcon })
      .addTo(this.map)
      .bindPopup(`<b>Point ${idx}</b><br>${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
    this.savedMarkers.push(marker);

    this.updatePathPreview();
  }

  private updatePathPreview(): void {
    if (this.pathLayer) { this.map.removeLayer(this.pathLayer); this.pathLayer = null; }
    if (this.drawnZone) { this.map.removeLayer(this.drawnZone); this.drawnZone = null; this.zoneDrawn = false; }

    if (this.savedPoints.length >= 2) {
      this.pathLayer = L.polyline(this.savedPoints, {
        color: '#6366f1',
        weight: 2.5,
        dashArray: '7 5',
        opacity: 0.85
      }).addTo(this.map);
    }
  }

  drawZone(): void {
    if (this.savedPoints.length < 3) return;
    if (this.pathLayer) { this.map.removeLayer(this.pathLayer); this.pathLayer = null; }
    if (this.drawnZone) { this.map.removeLayer(this.drawnZone); }

    this.drawnZone = L.polygon(this.savedPoints, {
      color: '#7c3aed',
      fillColor: '#c4b5fd',
      fillOpacity: 0.3,
      weight: 2.5
    }).addTo(this.map)
      .bindPopup(`<b>Custom Zone</b><br>${this.savedPoints.length} points`).openPopup();

    this.zoneDrawn = true;
    this.map.flyToBounds(this.drawnZone.getBounds().pad(0.25), { animate: true, duration: 1 });
  }

  clearZonePoints(): void {
    if (this.tempMarker) { this.map.removeLayer(this.tempMarker); this.tempMarker = null; }
    this.savedMarkers.forEach(m => this.map.removeLayer(m));
    this.savedMarkers = [];
    this.savedPoints = [];
    if (this.pathLayer) { this.map.removeLayer(this.pathLayer); this.pathLayer = null; }
    if (this.drawnZone) { this.map.removeLayer(this.drawnZone); this.drawnZone = null; }
    this.zoneDrawn = false;
  }

  switchStyle(styleId: string): void {
    const style = TILE_STYLES.find(s => s.id === styleId);
    if (!style || styleId === this.activeStyleId) return;

    this.map.removeLayer(this.tileLayer);
    this.tileLayer = L.tileLayer(style.url, { attribution: style.attribution }).addTo(this.map);
    this.tileLayer.bringToBack();
    this.activeStyleId = styleId;
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  onSearchInput(): void {
    this.searchError = '';
    if (this.searchDebounce) clearTimeout(this.searchDebounce);

    if (this.searchQuery.trim().length < 3) {
      this.searchResults = [];
      this.showSuggestions = false;
      return;
    }

    this.searchDebounce = setTimeout(() => this.fetchSuggestions(), 350);
  }

  private async fetchSuggestions(): Promise<void> {
    this.searching = true;
    this.showSuggestions = false;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(this.searchQuery)}`;
      const response = await fetch(url, {
        headers: { 'Accept-Language': 'fr,en' }
      });
      this.searchResults = await response.json() as NominatimResult[];
      this.showSuggestions = this.searchResults.length > 0;
      if (this.searchResults.length === 0) {
        this.searchError = 'No results found.';
      }
    } catch {
      this.searchError = 'Search failed. Check your connection.';
    } finally {
      this.searching = false;
    }
  }

  selectResult(result: NominatimResult): void {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    // Remove previous search marker
    if (this.searchMarker) this.map.removeLayer(this.searchMarker);

    this.searchMarker = L.marker([lat, lng])
      .addTo(this.map)
      .bindPopup(`<b>${result.display_name.split(',')[0]}</b><br><small>${result.display_name}</small>`)
      .openPopup();

    this.map.flyTo([lat, lng], 15, { animate: true, duration: 1.2 });

    this.searchQuery = result.display_name.split(',')[0];
    this.showSuggestions = false;
    this.searchResults = [];
  }

  onSearchSubmit(): void {
    if (this.searchResults.length > 0) {
      this.selectResult(this.searchResults[0]);
    } else if (this.searchQuery.trim().length >= 3) {
      this.fetchSuggestions();
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.showSuggestions = false;
    this.searchError = '';
    if (this.searchMarker) {
      this.map.removeLayer(this.searchMarker);
      this.searchMarker = null;
    }
  }

  // ── Position ─────────────────────────────────────────────────────────────────

  showCurrentPosition(): void {
    this.positionError = '';
    if (!navigator.geolocation) {
      this.positionError = 'Geolocation is not supported by your browser.';
      return;
    }
    this.loadingPosition = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.loadingPosition = false;
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        if (this.positionMarker) this.map.removeLayer(this.positionMarker);
        if (this.positionCircle) this.map.removeLayer(this.positionCircle);

        this.positionMarker = L.marker([lat, lng])
          .addTo(this.map)
          .bindPopup(`<b>Your position</b><br>Lat: ${lat.toFixed(5)}<br>Lng: ${lng.toFixed(5)}<br>Accuracy: ±${Math.round(accuracy)} m`)
          .openPopup();

        this.positionCircle = L.circle([lat, lng], {
          radius: accuracy,
          color: '#3b82f6',
          fillColor: '#93c5fd',
          fillOpacity: 0.25,
          weight: 2
        }).addTo(this.map);

        this.map.flyTo([lat, lng], 15, { animate: true, duration: 1.5 });
      },
      (error) => {
        this.loadingPosition = false;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.positionError = 'Location access denied. Please allow location in your browser.'; break;
          case error.POSITION_UNAVAILABLE:
            this.positionError = 'Position unavailable. Try again.'; break;
          default:
            this.positionError = 'Could not retrieve your location.';
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // ── GPS Tracking ─────────────────────────────────────────────────────────────

  toggleTrackedPersons(): void {
    if (this.trackedVisible) {
      this.clearAllTracking();
      this.trackedVisible = false;
      this.autoMode = false;
      this.followMode = false;
      this.trackingError = '';
      this.firstPositionReceived = false;
    } else {
      this.trackedVisible = true;
      this.firstPositionReceived = false;
      this.loadTrackedPersons();
      this.pollInterval = setInterval(() => this.loadTrackedPersons(), 5000);
    }
  }

  toggleAutoMode(): void {
    this.autoMode = !this.autoMode;
    if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
    const ms = this.autoMode ? 1000 : 5000;
    this.pollInterval = setInterval(() => this.loadTrackedPersons(), ms);
  }

  toggleFollowMode(): void {
    this.followMode = !this.followMode;
  }

  private clearAllTracking(): void {
    this.startMarkers.forEach(m => this.map.removeLayer(m));
    this.currentMarkers.forEach(m => this.map.removeLayer(m));
    this.pathPolylines.forEach(p => this.map.removeLayer(p));
    this.shadowPolylines.forEach(p => this.map.removeLayer(p));
    this.waypointMarkers.forEach(wps => wps.forEach(w => this.map.removeLayer(w)));
    this.startMarkers.clear();
    this.currentMarkers.clear();
    this.pathPolylines.clear();
    this.shadowPolylines.clear();
    this.waypointMarkers.clear();
    this.waypointCounts.clear();
    this.userPaths.clear();
    this.userTimestamps.clear();
    this.trackedUsers = [];
    if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
  }

  private loadTrackedPersons(): void {
    this.http.get<GpsPositionsResponse>(GPS_API).subscribe({
      next: ({ positions }) => {
        this.trackingError = '';
        if (positions.length === 0) return;

        // First time we receive data → fly to the first person
        if (!this.firstPositionReceived) {
          this.firstPositionReceived = true;
          this.map.flyTo([positions[0].lat, positions[0].lon], 16, { animate: true, duration: 1.5 });
        }

        const activeIds = new Set(positions.map(p => p.user_id));

        // Remove layers for users no longer active
        this.startMarkers.forEach((_, id) => {
          if (!activeIds.has(id)) {
            this.map.removeLayer(this.startMarkers.get(id)!);
            this.map.removeLayer(this.currentMarkers.get(id)!);
            this.map.removeLayer(this.pathPolylines.get(id)!);
            this.startMarkers.delete(id);
            this.currentMarkers.delete(id);
            this.pathPolylines.delete(id);
            this.userPaths.delete(id);
          }
        });

        positions.forEach(p => {
          const latlng = L.latLng(p.lat, p.lon);
          const path = this.userPaths.get(p.user_id) ?? [];

          // Only append if position changed
          const last = path[path.length - 1];
          if (!last || last.lat !== latlng.lat || last.lng !== latlng.lng) {
            path.push(latlng);
            this.userPaths.set(p.user_id, path);
          }

          // Store timestamps per point
          const timestamps = this.userTimestamps.get(p.user_id) ?? [];
          const ts = p.timestamp ? new Date(p.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
          if (path.length > (this.waypointCounts.get(p.user_id) ?? 0)) {
            timestamps.push(ts);
            this.userTimestamps.set(p.user_id, timestamps);
          }

          const dist = this.calcDistance(path);
          const speed = this.calcSpeed(path, timestamps);

          // ── Current (walker) marker ──
          const walkerIcon = L.divIcon({
            className: '',
            html: `
              <div class="walker-pin">
                <div class="walker-pin__ring"></div>
                <div class="walker-pin__bubble">🚶</div>
                <div class="walker-pin__tail"></div>
                <div class="walker-pin__name">${p.user_id}</div>
              </div>`,
            iconSize: [64, 72], iconAnchor: [32, 54], popupAnchor: [0, -56]
          });
          const popup = `
            <div class="track-popup">
              <div class="track-popup__name">🚶 ${p.user_id}</div>
              <div class="track-popup__row"><span>Lat</span><b>${p.lat.toFixed(5)}</b></div>
              <div class="track-popup__row"><span>Lon</span><b>${p.lon.toFixed(5)}</b></div>
              <div class="track-popup__row"><span>Distance</span><b>${dist} m</b></div>
              <div class="track-popup__row"><span>Vitesse</span><b>${speed} km/h</b></div>
              <div class="track-popup__time">${ts}</div>
            </div>`;

          if (this.currentMarkers.has(p.user_id)) {
            const m = this.currentMarkers.get(p.user_id)!;
            m.setLatLng(latlng);
            m.setPopupContent(popup);
          } else {
            const m = L.marker(latlng, { icon: walkerIcon, zIndexOffset: 100 })
              .addTo(this.map).bindPopup(popup);
            this.currentMarkers.set(p.user_id, m);
          }

          // Follow mode: pan the map to keep the person in view
          if (this.followMode) {
            this.map.panTo(latlng, { animate: true, duration: 0.5 });
          }

          // ── Start (flag) marker — created once ──
          if (!this.startMarkers.has(p.user_id)) {
            const startIcon = L.divIcon({
              className: '',
              html: `
                <div class="start-pin">
                  <div class="start-pin__flag">🏁</div>
                  <div class="start-pin__label">Départ</div>
                  <div class="start-pin__stem"></div>
                  <div class="start-pin__dot"></div>
                </div>`,
              iconSize: [56, 64], iconAnchor: [10, 60], popupAnchor: [18, -60]
            });
            const sm = L.marker(latlng, { icon: startIcon })
              .addTo(this.map)
              .bindPopup(`
                <div class="track-popup">
                  <div class="track-popup__name" style="color:#16a34a">🏁 Point de départ</div>
                  <div class="track-popup__row"><span>Personne</span><b>${p.user_id}</b></div>
                  <div class="track-popup__row"><span>Lat</span><b>${p.lat.toFixed(5)}</b></div>
                  <div class="track-popup__row"><span>Lon</span><b>${p.lon.toFixed(5)}</b></div>
                </div>`);
            this.startMarkers.set(p.user_id, sm);
          }

          // ── Waypoint dots for new points ──
          const prevCount = this.waypointCounts.get(p.user_id) ?? 0;
          for (let i = prevCount; i < path.length; i++) {
            if (i === 0) continue; // skip start point (already has flag marker)
            const wpTs = (this.userTimestamps.get(p.user_id) ?? [])[i] ?? ts;
            const wp = L.circleMarker(path[i], {
              radius: 5, color: '#fff', fillColor: '#2563eb',
              fillOpacity: 1, weight: 2, className: 'waypoint-dot'
            }).addTo(this.map).bindPopup(
              `<div class="track-popup">
                <div class="track-popup__name" style="color:#2563eb">📍 Point ${i}</div>
                <div class="track-popup__row"><span>Lat</span><b>${path[i].lat.toFixed(5)}</b></div>
                <div class="track-popup__row"><span>Lon</span><b>${path[i].lng.toFixed(5)}</b></div>
                <div class="track-popup__time">${wpTs}</div>
              </div>`
            );
            const wps = this.waypointMarkers.get(p.user_id) ?? [];
            wps.push(wp);
            this.waypointMarkers.set(p.user_id, wps);
          }
          this.waypointCounts.set(p.user_id, path.length);

          // ── Path polyline (shadow + main) ──
          if (path.length >= 2) {
            if (this.shadowPolylines.has(p.user_id)) {
              this.shadowPolylines.get(p.user_id)!.setLatLngs(path);
              this.pathPolylines.get(p.user_id)!.setLatLngs(path);
            } else {
              // Shadow (glow underneath)
              const shadow = L.polyline(path, {
                color: '#93c5fd', weight: 12, opacity: 0.25
              }).addTo(this.map);
              this.shadowPolylines.set(p.user_id, shadow);
              // Main animated line
              const line = L.polyline(path, {
                color: '#2563eb', weight: 4, opacity: 0.95,
                className: 'track-path'
              }).addTo(this.map);
              this.pathPolylines.set(p.user_id, line);
            }
          }
        });

        // Update the sidebar list
        this.trackedUsers = positions.map(p => {
          const path = this.userPaths.get(p.user_id) ?? [];
          const ts = p.timestamp ? new Date(p.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
          return {
            id: p.user_id,
            distance: this.calcDistance(path),
            speed: this.calcSpeed(path, this.userTimestamps.get(p.user_id) ?? []),
            lastSeen: ts
          };
        });
      },
      error: () => {
        this.trackingError = 'Cannot reach GPS server. Vérifiez que le backend tourne sur le port 8080.';
      }
    });
  }

  private calcDistance(path: L.LatLng[]): number {
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      total += path[i - 1].distanceTo(path[i]);
    }
    return Math.round(total);
  }

  private calcSpeed(path: L.LatLng[], timestamps: string[]): number {
    if (path.length < 2 || timestamps.length < 2) return 0;
    const last = timestamps[timestamps.length - 1];
    const prev = timestamps[timestamps.length - 2];
    const dtMs = new Date(`1970/01/01 ${last}`).getTime() - new Date(`1970/01/01 ${prev}`).getTime();
    if (dtMs <= 0) return 0;
    const distM = path[path.length - 2].distanceTo(path[path.length - 1]);
    return Math.round((distM / (dtMs / 1000)) * 3.6 * 10) / 10; // km/h, 1 decimal
  }

  // ── Zones ────────────────────────────────────────────────────────────────────

  toggleZones(): void {
    if (this.zonesVisible) {
      this.zoneCircles.forEach(c => this.map.removeLayer(c));
      this.zoneCircles = [];
      this.zonesVisible = false;
    } else {
      AUTHORIZED_ZONES.forEach(zone => {
        const circle = L.circle([zone.lat, zone.lng], {
          radius: zone.radius,
          color: '#16a34a',
          fillColor: '#86efac',
          fillOpacity: 0.35,
          weight: 2
        }).addTo(this.map).bindPopup(`<b>${zone.label}</b><br>Radius: ${zone.radius} m`);
        this.zoneCircles.push(circle);
      });
      const group = L.featureGroup(this.zoneCircles);
      this.map.flyToBounds(group.getBounds().pad(0.3), { animate: true, duration: 1.2 });
      this.zonesVisible = true;
    }
  }
}
