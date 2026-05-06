import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Reminder } from '../../../../models/reminder.model';
import { Patient } from '../../../../models/patient.model';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  events: Reminder[];
  hasCompleted: boolean;
  hasPending: boolean;
  hasCritical: boolean;
}

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar_view.component.html',
  styleUrls: ['./calendar_view.component.css']
})
export class CalendarViewComponent implements OnChanges {

  @Input() events: Reminder[] = [];
  @Input() currentMonth!: Date;
  @Input() view: 'month' | 'week' | 'day' = 'month';
  @Input() selectedPatient!: Patient;

  @Output() dayClicked = new EventEmitter<Date>();
  @Output() monthChanged = new EventEmitter<Date>();
  @Output() viewChanged = new EventEmitter<'month' | 'week' | 'day'>();

  calendarDays: CalendarDay[] = [];
  monthName: string = '';
  year: number = 0;

  weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentMonth'] || changes['events']) {
      this.generateCalendar();
    }
  }

  generateCalendar(): void {
    if (!this.currentMonth) return;

    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    this.year = year;
    this.monthName = new Date(year, month).toLocaleDateString('fr-FR', {
      month: 'long'
    });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDay = new Date(firstDay);
    const dayOfWeek = startDay.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDay.setDate(startDay.getDate() + diff);

    this.calendarDays = [];
    const currentDate = new Date(startDay);

    for (let i = 0; i < 42; i++) {
      const isCurrentMonth = currentDate.getMonth() === month;
      const dayEvents = this.getEventsForDay(currentDate);

      this.calendarDays.push({
        date: new Date(currentDate),
        isCurrentMonth,
        events: dayEvents,
        hasCompleted: dayEvents.some(e => e.status === 'CONFIRMED'),
        hasPending: dayEvents.some(e => e.status === 'PENDING'),
        hasCritical: dayEvents.some(e => e.status === 'MISSED')
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  getEventsForDay(date: Date): Reminder[] {
    const dateStr = this.formatDate(date);
    return this.events.filter(e => {
      if (!e.reminderDate) return false;
      // reminderDate peut être string "yyyy-MM-dd" ou objet Date
      const rDate = e.reminderDate;
      if (typeof rDate === 'string') {
        // Prendre seulement les 10 premiers caractères (yyyy-MM-dd)
        return rDate.substring(0, 10) === dateStr;
      } else {
        // C'est un objet Date
        return this.formatDate(new Date(rDate as any)) === dateStr;
      }
    });
  }

  onDayClick(day: CalendarDay): void {
    if (day.isCurrentMonth) {
      this.dayClicked.emit(day.date);
    }
  }

  previousMonth(): void {
    const newMonth = new Date(this.currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    this.monthChanged.emit(newMonth);
  }

  nextMonth(): void {
    const newMonth = new Date(this.currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    this.monthChanged.emit(newMonth);
  }

  goToToday(): void {
    this.monthChanged.emit(new Date());
  }

  changeView(view: 'month' | 'week' | 'day'): void {
    this.viewChanged.emit(view);
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getEventTypeIcon(type: string): string {
    const icons: any = {
      'MEDICATION': 'fas fa-pills',
      'MEDICAL_APPOINTMENT': 'fas fa-hospital',
      'HYDRATION': 'fas fa-tint',
      'COGNITIVE_TEST': 'fas fa-brain',
      'HYGIENE': 'fas fa-soap',
      'OTHER': 'fas fa-clipboard'
    };
    return icons[type] || 'fas fa-clipboard';
  }
}
