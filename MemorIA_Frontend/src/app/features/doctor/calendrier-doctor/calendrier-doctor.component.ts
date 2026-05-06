import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventApi } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { SeanceService } from '../../../services/seance.service';
import { Seance, StatutSeance } from '../../../models/seance.model';
import { ActiviteService } from '../../../services/activite.service';
import { Activite } from '../../../models/activite.model';
import { WebsocketService } from '../../../services/websocket.service';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-calendrier-doctor',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, FormsModule],
  template: `
    <div class="calendar-layout animate-fadeIn">
      <div class="calendar-sidebar glass-card">
        <h3 class="sidebar-title"><i class="fas fa-magic mr-2"></i>Nouveau Créneau</h3>
        <p class="sidebar-desc">Planifiez une nouvelle session thérapeutique pour vos patients.</p>
        
        <form (ngSubmit)="ajouterSeance()" class="modern-form">
          <div class="form-group">
            <label>Activité</label>
            <select [(ngModel)]="newSeance.activite" name="activite" class="form-control" required>
              <option *ngFor="let act of activites" [ngValue]="act">{{ act.titre }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Date de la session</label>
            <input type="date" [(ngModel)]="newSeance.date" name="date" class="form-control" required>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Début</label>
              <input type="time" [(ngModel)]="newSeance.heureDebut" name="heureDebut" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Fin</label>
              <input type="time" [(ngModel)]="newSeance.heureFin" name="heureFin" class="form-control" required>
            </div>
          </div>
          <button type="submit" class="btn-create-seance">
            <i class="fas fa-plus-circle mr-2"></i>Enregistrer
          </button>
        </form>
        
        <div class="legend-panel">
          <h4>Récapitulatif Statuts</h4>
          <div class="legend-list">
            <div class="legend-item"><span class="dot disponible"></span> Libre</div>
            <div class="legend-item"><span class="dot reserve"></span> Réservé</div>
            <div class="legend-item"><span class="dot annule"></span> Annulé</div>
          </div>
        </div>
      </div>
      
      <div class="calendar-main glass-card">
        <full-calendar [options]="calendarOptions"></full-calendar>
      </div>
    </div>
  `,
  styles: [`
    .calendar-layout { 
      display: flex; 
      gap: 32px; 
      padding: 20px;
      animation: fadeIn 0.6s ease-out;
    }
    
    .calendar-sidebar { 
      width: 320px; 
      padding: 30px;
      display: flex;
      flex-direction: column;
      height: fit-content;
      position: sticky;
      top: 20px;
    }
    
    .calendar-main { 
      flex: 1; 
      padding: 30px;
      min-height: 700px;
    }

    .sidebar-title { 
      font-size: 1.4rem; 
      font-weight: 800; 
      color: #1e1b4b; 
      margin-bottom: 8px;
    }
    
    .sidebar-desc {
      font-size: 0.85rem;
      color: #64748b;
      margin-bottom: 30px;
      line-height: 1.5;
    }

    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .form-group { margin-bottom: 20px; }
    .form-group label { 
      display: block; 
      margin-bottom: 8px; 
      color: #1e293b; 
      font-weight: 700; 
      font-size: 0.85rem; 
    }

    .form-control { 
      width: 100%; 
      padding: 12px 16px; 
      background: white;
      border: 1.5px solid #edf2f7; 
      border-radius: 14px; 
      outline: none;
      transition: all 0.3s;
      font-family: inherit;
    }

    .form-control:focus { 
      border-color: #541A75; 
      box-shadow: 0 0 0 4px rgba(84, 26, 117, 0.08); 
    }

    .btn-create-seance { 
      width: 100%; 
      background: linear-gradient(135deg, #541A75, #7c3aed); 
      color: white; 
      border: none; 
      padding: 16px; 
      border-radius: 16px; 
      cursor: pointer; 
      font-weight: 800; 
      margin-top: 10px;
      transition: all 0.3s;
      box-shadow: 0 10px 20px rgba(84, 26, 117, 0.2);
    }

    .btn-create-seance:hover {
      transform: translateY(-3px);
      box-shadow: 0 15px 30px rgba(84, 26, 117, 0.3);
    }
    
    .legend-panel { 
      margin-top: 40px; 
      padding-top: 25px; 
      border-top: 1.5px dashed #e2e8f0; 
    }

    .legend-panel h4 { font-size: 0.9rem; font-weight: 800; color: #1e1b4b; margin-bottom: 15px; }
    
    .legend-list { display: flex; flex-direction: column; gap: 12px; }
    
    .legend-item { 
      display: flex; 
      align-items: center; 
      color: #64748b; 
      font-weight: 600; 
      font-size: 0.85rem; 
    }

    .dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 12px; }
    .dot.disponible { background: #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.4); }
    .dot.reserve { background: #541A75; box-shadow: 0 0 10px rgba(84, 26, 117, 0.4); }
    .dot.annule { background: #ef4444; box-shadow: 0 0 10px rgba(239, 68, 68, 0.4); }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 1024px) {
      .calendar-layout { flex-direction: column; }
      .calendar-sidebar { width: 100%; position: static; }
    }
  `]
})
export class CalendrierDoctorComponent implements OnInit, OnDestroy {
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin],
    initialView: 'timeGridWeek',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    events: [],
    slotMinTime: '08:00:00',
    slotMaxTime: '20:00:00',
    editable: true,
    selectable: true
  };

  activites: Activite[] = [];
  newSeance: Seance = { date: '', heureDebut: '', heureFin: '' };
  private wsSubscription!: Subscription;

  constructor(
    private seanceService: SeanceService,
    private activiteService: ActiviteService,
    private wsService: WebsocketService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    const doctorId = user?.id ?? 1;
    this.activiteService.getActivitesByDoctor(doctorId).subscribe(data => this.activites = data);
    this.loadSeances();

    // Abonnement temps réel
    this.wsSubscription = this.wsService.messages$.subscribe(msg => {
      console.log("Mise à jour WS:", msg);
      this.loadSeances(); // Recharger le calendrier
    });
  }

  ngOnDestroy() {
    if(this.wsSubscription) this.wsSubscription.unsubscribe();
  }

  loadSeances() {
    this.seanceService.getAllSeances().subscribe(data => {
      const events = data.map(s => {
        let bgColor = '#10b981'; // DISPONIBLE
        if(s.statut === StatutSeance.RESERVE) bgColor = '#541A75'; // MemorIA Purple
        if(s.statut === StatutSeance.ANNULE) bgColor = '#ef4444'; // Rose Red

        return {
          id: s.id?.toString(),
          title: s.activite?.titre,
          start: `${s.date}T${s.heureDebut}`,
          end: `${s.date}T${s.heureFin}`,
          backgroundColor: bgColor,
          borderColor: bgColor
        };
      });
      this.calendarOptions = { ...this.calendarOptions, events };
    });
  }

  ajouterSeance() {
    // Il faudrait convertir newSeance avec un format de temps correct s'il n'y a pas les secondes
    if (this.newSeance.heureDebut.length === 5) this.newSeance.heureDebut += ':00';
    if (this.newSeance.heureFin.length === 5) this.newSeance.heureFin += ':00';

    this.seanceService.createSeance(this.newSeance).subscribe(() => {
      this.loadSeances();
      this.newSeance = { date: '', heureDebut: '', heureFin: '' };
    });
  }
}
