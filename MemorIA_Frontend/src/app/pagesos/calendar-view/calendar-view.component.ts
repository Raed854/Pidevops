import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AssignationService } from '../../services/assignation.service';
import { LucideAngularModule, ChevronLeft, ChevronRight, Plus, Calendar, Clock, MapPin, MoreHorizontal } from 'lucide-angular';
import { catchError, of, switchMap } from 'rxjs';

interface CalendarEvent {
  id: number;
  title: string;
  time: string;
  description: string;
  location: string;
  date: Date;
  status: 'PENDING' | 'DONE';
}

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './calendar-view.component.html',
  styleUrl: './calendar-view.component.css'
})
export class CalendarViewComponent {
  readonly icons = {
    ChevronLeft,
    ChevronRight,
    Plus,
    Calendar,
    Clock,
    MapPin,
    MoreHorizontal
  };

  currentDate = signal(new Date());
  selectedDay = signal(new Date());

  daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  mockEvents = signal<CalendarEvent[]>([]);
  pageTitle = signal('Calendrier Médical');

  constructor(
    private route: ActivatedRoute,
    private assignationService: AssignationService
  ) { }

  ngOnInit() {
    this.selectedDay.set(new Date());
    this.route.queryParams.pipe(
      switchMap(params => {
        const patientId = params['patientId'];
        const medecinId = params['medecinId'];
        const aidantId = params['aidantId'];

        if (aidantId) {
          this.pageTitle.set('Calendrier Aidant');
          return this.assignationService.getPlanningByAidant(Number(aidantId)).pipe(
            catchError(() => of([]))
          );
        } else if (patientId) {
          this.pageTitle.set('Calendrier Patient');
          return this.assignationService.getAssignationsByPatient(patientId).pipe(
            catchError(() => {
              // Fallback for Demo Mode (Patient 36)
              if (patientId == '36') {
                const localMocks = JSON.parse(localStorage.getItem('mockAssignments') || '[]');
                return of([...localMocks]); // Return local mocks
              }
              return of([]);
            })
          );
        } else if (medecinId) {
          this.pageTitle.set('Calendrier Médecin');
          return this.assignationService.getAssignationsByMedecin(medecinId).pipe(catchError(() => of([])));
        }

        return of([]);
      })
    ).subscribe(assignments => {
      this.mapAssignmentsToEvents(assignments);
    });
  }

  mapAssignmentsToEvents(assignments: any[]) {
    const events: CalendarEvent[] = assignments.map(a => ({
      id: a.id || Math.floor(Math.random() * 1000),
      title: a.patient
        ? `${a.test?.titre || a.testTitre || 'Test'} - ${a.patient?.nom}`
        : (a.test?.titre || a.testTitre || 'Test Cognitif'),
      time: '09:00', // Default time
      description: a.test?.description || 'Test à réaliser',
      location: 'En ligne / Domicile',
      // Prefer dateLimite as the "Event Date" (normalize date-only strings to local date)
      date: this.getAssignmentLocalDate(a),
      status: a.status === 'COMPLETED' ? 'DONE' : 'PENDING'
    }));

    // Add some static events for demo if empty? 
    // No, keep it clean. But if it's "Robert" (Demo), maybe add the static mock events from before?
    // Let's keep the user's request "charger avec des données réelles".

    this.mockEvents.set(events);
  }

  private getAssignmentLocalDate(a: any): Date {
    // Backend typically sends:
    // - dateLimite: LocalDate => 'YYYY-MM-DD'
    // - dateAssignation: LocalDateTime => ISO string
    const d = this.toLocalDateOnly(a?.dateLimite) || this.toLocalDateTime(a?.dateAssignation);
    return d || new Date();
  }

  private toLocalDateOnly(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    if (typeof value === 'string') {
      // 'YYYY-MM-DD'
      const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        const year = Number(m[1]);
        const month = Number(m[2]) - 1;
        const day = Number(m[3]);
        return new Date(year, month, day);
      }
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  private toLocalDateTime(value: any): Date | null {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  calendarDays = computed(() => {
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const prevMonthDays = new Date(year, month, 0).getDate();
    const days = [];

    // Previous month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        month: 'prev',
        date: new Date(year, month - 1, prevMonthDays - i)
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month: 'current',
        date: new Date(year, month, i)
      });
    }

    // Next month padding
    const remainingSlots = 42 - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      days.push({
        day: i,
        month: 'next',
        date: new Date(year, month + 1, i)
      });
    }

    return days;
  });

  monthName = computed(() => {
    return this.currentDate().toLocaleString('default', { month: 'long', year: 'numeric' });
  });

  prevMonth() {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth() {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  goToToday() {
    const today = new Date();
    this.currentDate.set(today);
    this.selectedDay.set(today);
  }

  selectDay(date: Date) {
    this.selectedDay.set(date);
  }

  getEventsForDay(date: Date) {
    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();
    return this.mockEvents().filter(e =>
      e.date.getFullYear() === y &&
      e.date.getMonth() === m &&
      e.date.getDate() === d
    );
  }

  isToday(date: Date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }
}
