import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Reminder } from '../../../../models/reminder.model';
import { CalendarDay, CalendarWeek, DayEvent } from '../../../../models/doctor-planning.model';
import { DoctorPlanningService } from '../../../../services/doctor-planning.service';

@Component({
  selector: 'app-planning-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './planning-calendar.component.html',
  styleUrls: ['./planning-calendar.component.css']
})
export class PlanningCalendarComponent implements OnInit, OnChanges {

  @Input() viewType: 'month' | 'week' | 'day' = 'month';
  @Input() currentDate: Date = new Date();
  @Input() reminders: Reminder[] = [];
  @Input() selectedDate: Date | null = null;
  @Output() daySelected = new EventEmitter<Date>();

  /**
   * Vue mois
   */
  monthWeeks: CalendarDay[][] = [];

  /**
   * Vue semaine
   */
  weekView: CalendarWeek | null = null;

  /**
   * Vue jour
   */
  dayView: CalendarDay | null = null;

  /**
   * Jours de la semaine
   */
  weekDays = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  private planningService = inject(DoctorPlanningService);

  ngOnInit(): void {
    this.generateCalendar();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentDate'] || changes['reminders']) {
      this.generateCalendar();
    }
  }

  /**
   * Génère le calendrier en fonction de la vue
   */
  private generateCalendar(): void {
    if (this.viewType === 'month') {
      // Generate month calendar locally without service
      this.monthWeeks = this.generateMonthCalendarLocal(this.currentDate);
      this.enrichCalendarDays(this.monthWeeks.flat());
    } else if (this.viewType === 'week') {
      // Generate week calendar locally without service
      this.weekView = this.generateWeekCalendarLocal(new Date(this.currentDate));
      if (this.weekView) {
        this.enrichCalendarDays(this.weekView.days);
      }
    } else {
      this.dayView = this.createDayView();
      if (this.dayView) {
        this.enrichCalendarDays([this.dayView]);
      }
    }
  }

  /**
   * Generates a month calendar locally
   */
  private generateMonthCalendarLocal(date: Date): CalendarDay[][] {
    const weeks: CalendarDay[][] = [];
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    let currentWeek: CalendarDay[] = [];
    const current = new Date(startDate);

    while (current <= lastDay || currentWeek.length > 0) {
      currentWeek.push({
        date: new Date(current),
        dayNumber: current.getDate(),
        isCurrentMonth: current.getMonth() === month,
        isToday: this.isTodayDate(current),
        events: [],
        completionRate: 0,
        hasAlert: false
      });

      current.setDate(current.getDate() + 1);

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    return weeks;
  }

  /**
   * Generates a week calendar locally
   */
  private generateWeekCalendarLocal(date: Date): CalendarWeek | null {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    
    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const current = new Date(start);
      current.setDate(current.getDate() + i);
      days.push({
        date: new Date(current),
        dayNumber: current.getDate(),
        isCurrentMonth: current.getMonth() === date.getMonth(),
        isToday: this.isTodayDate(current),
        events: [],
        completionRate: 0,
        hasAlert: false
      });
    }

    return { 
      days, 
      startDate: new Date(start), 
      endDate: new Date(days[6].date),
      weekNumber: this.getWeekNumber(start)
    };
  }

  /**
   * Checks if a date is today
   */
  private isTodayDate(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  /**
   * Gets week number for a given date
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Enrichit les jours du calendrier avec les événements et statuts
   */
  private enrichCalendarDays(days: CalendarDay[]): void {
    days.forEach(day => {
      const dayReminders = this.getRemindersByDate(day.date);

      // Calcule le taux de complétude et alerte
      const completed = dayReminders.filter(r =>
        r.status === 'CONFIRMED' || r.status === 'CONFIRMED_LATE'
      ).length;

      day.completionRate = dayReminders.length > 0
        ? Math.round((completed / dayReminders.length) * 100)
        : 0;

      day.hasAlert = dayReminders.some(r =>
        r.status === 'MISSED' || r.status === 'PENDING'
      );
    });
  }

  /**
   * Crée la vue journée
   */
  private createDayView(): CalendarDay {
    return {
      date: new Date(this.currentDate),
      dayNumber: this.currentDate.getDate(),
      isCurrentMonth: true,
      isToday: this.isTodayDate(this.currentDate),
      events: [],
      hasAlert: false,
      completionRate: 0
    };
  }

  /**
   * Récupère les rappels d'une date
   */
  private getRemindersByDate(date: Date): Reminder[] {
    const dateStr = this.formatDate(date);
    return this.reminders.filter(r => r.reminderDate === dateStr);
  }

  /**
   * Formate une date en string YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  /**
   * Gère le clic sur un jour
   */
  onDayClick(date: Date): void {
    this.selectedDate = date;
    this.daySelected.emit(date);
  }

  /**
   * Obtient la couleur d'une pastille événement
   */
  getEventColor(event: DayEvent): string {
    // Return a default color since service method doesn't exist
    return '#541A75';
  }

  /**
   * Obtient la couleur du statut
   */
  getStatusColor(event: DayEvent): { background: string; border: string } {
    // Return default colors since service method doesn't exist
    return {
      background: '#C0E0DE20',
      border: '#00635D'
    };
  }

  /**
   * Récupère le label du mois
   */
  getMonthLabel(date: Date): string {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  /**
   * Récupère le label du jour de la semaine
   */
  getDayLabel(index: number): string {
    return this.weekDays[index];
  }
}
