import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import localeFr from '@angular/common/locales/fr';

// Register French locale
registerLocaleData(localeFr);
import { PlanningService, Reminder } from '../../../../services/planning.service';
import { AuthService } from '../../../../services/auth.service';
import { NavbarComponent } from '../../../../components/navbare/navbare.component';
import { SidebarDiagnosticComponent } from '../../../../components/sidebar_diagnostic/sidebar_diagnostic.component';

// ── Web Speech API types ──────────────────────────────────
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

@Component({
  selector: 'app-patient-planning',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, SidebarDiagnosticComponent],
  templateUrl: './patient-planning.component.html',
  styleUrls: ['./patient-planning.component.css']
})
export class PatientPlanningComponent implements OnInit, OnDestroy {

  // ── Données ───────────────────────────────────────────
  todayReminders: Reminder[] = [];
  currentPatientId: number | null = null;
  currentDate = new Date();

  // ── Horloge temps réel (pour détecter les rappels dépassés) ──
  now = new Date();
  private clockTimer: ReturnType<typeof setInterval> | null = null;

  // ── État UI de base ───────────────────────────────────
  isLoading          = false;
  textSizeMultiplier = 1;
  isDarkMode         = false;
  isSpeaking         = false;
  isListening        = false;

  // ── Boutons d'action ──────────────────────────────────
  /** ID du rappel en cours de traitement — affiche le spinner sur le bon bouton */
  loadingId: number | null = null;

  // ── Modal de report ───────────────────────────────────
  showDelayModal   = false;
  reminderToDelay: Reminder | null = null;

  // ── Toast de confirmation ─────────────────────────────
  showToast    = false;
  toastMessage = '';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Web Speech API ────────────────────────────────────
  private synth       = window.speechSynthesis;
  private recognition: any = null;

  // ── RxJS ─────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  constructor(
    private planningService: PlanningService,
    private authService: AuthService
  ) {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.setupSpeechRecognition();
    }
  }

  // ═══════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════

  ngOnInit(): void {
    this.loadCurrentPatient();
    this.applySavedPreferences();
    // Ticker toutes les 60 s pour détecter les rappels dépassés
    this.clockTimer = setInterval(() => {
      this.now = new Date();
      this.autoMarkOverdueAsMissed();
    }, 60_000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.synth.cancel();
    if (this.recognition) this.recognition.stop();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  // ═══════════════════════════════════════════════════════
  // CHARGEMENT DONNÉES
  // ═══════════════════════════════════════════════════════

  private loadCurrentPatient(): void {
    const user = this.authService.getUser();
    if (!user) return;
    this.currentPatientId = user.id;
    this.loadTodayReminders();
    this.startAutoRefresh();
  }

  private loadTodayReminders(): void {
    if (!this.currentPatientId) return;
    this.isLoading = true;

    this.planningService.getTodayReminders(this.currentPatientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reminders) => {
          this.now = new Date();
          this.todayReminders = this.sortRemindersByTime(reminders);
          this.autoMarkOverdueAsMissed();
          this.isLoading = false;
        },
        error: () => {
          this.loadMockReminders();
          this.isLoading = false;
        }
      });
  }

  private loadMockReminders(): void {
    const now = new Date();
    const ts  = now.toISOString();
    this.todayReminders = [
      {
        id: 1, title: 'Donépézil 10mg',
        description: 'Prendre avec un verre d\'eau', type: 'medication',
        scheduledTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0).toISOString(),
        status: 'pending', patientId: this.currentPatientId!,
        priority: 'normal', createdAt: ts, updatedAt: ts
      },
      {
        id: 2, title: 'Rendez-vous neurologue',
        description: 'Dr. Martin - Cabinet médical', type: 'appointment',
        scheduledTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 30).toISOString(),
        status: 'pending', patientId: this.currentPatientId!,
        priority: 'normal', createdAt: ts, updatedAt: ts
      },
      {
        id: 3, title: 'Exercices mémoire',
        description: 'Jeu des 7 différences', type: 'activity',
        scheduledTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0).toISOString(),
        status: 'confirmed', patientId: this.currentPatientId!,
        priority: 'normal', createdAt: ts, updatedAt: ts
      }
    ];
  }

  private sortRemindersByTime(reminders: Reminder[]): Reminder[] {
    return [...reminders].sort((a, b) =>
      new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );
  }

  private startAutoRefresh(): void {
    setInterval(() => {
      if (!this.isLoading) this.loadTodayReminders();
    }, 2 * 60 * 1000);
  }

  // ═══════════════════════════════════════════════════════
  // ACTIONS RAPPELS
  // ═══════════════════════════════════════════════════════

  /**
   * Retourne true si l'heure du rappel est passée (délai de grâce : 0 min).
   * Utilisé dans le template pour savoir si on affiche "Manqué" + les deux boutons.
   */
  isOverdue(reminder: Reminder): boolean {
    if (!reminder.scheduledTime) return false;
    const scheduled = new Date(reminder.scheduledTime);
    return this.now.getTime() > scheduled.getTime();
  }

  /**
   * Retourne true si le rappel est encore actionnable (non confirmé, non annulé).
   */
  isActionable(reminder: Reminder): boolean {
    return reminder.status === 'pending'
        || reminder.status === 'planned'
        || reminder.status === 'missed'
        || reminder.status === 'delayed';
  }

  /**
   * Met à jour localement le statut à 'missed' pour les rappels
   * dont l'heure est passée et qui sont encore 'pending' ou 'planned'.
   * Appelé par le ticker toutes les 60 secondes.
   */
  private autoMarkOverdueAsMissed(): void {
    let changed = false;
    this.todayReminders = this.todayReminders.map(r => {
      if ((r.status === 'pending' || r.status === 'planned') && this.isOverdue(r)) {
        changed = true;
        return { ...r, status: 'missed' as Reminder['status'] };
      }
      return r;
    });
    // Force la détection des changements Angular
    if (changed) {
      this.todayReminders = [...this.todayReminders];
    }
  }

  /** ✅ Confirmer un rappel — spinner sur le bouton + toast + feedback vocal */
  confirmReminder(reminder: Reminder): void {
    if (this.loadingId === reminder.id) return;
    this.loadingId = reminder.id;

    this.planningService.confirmReminder(reminder.id, this.currentPatientId ?? undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const idx = this.todayReminders.findIndex(r => r.id === updated.id);
          if (idx >= 0) {
            this.todayReminders[idx] = { ...updated, status: 'confirmed' };
          }
          this.loadingId = null;
          if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
          this.speak(`Confirmé: ${reminder.title}`, 'fr-FR');
          this.showToastMsg(`✅ "${reminder.title}" confirmé !`);
        },
        error: () => {
          // Mise à jour optimiste même si l'API échoue
          const idx = this.todayReminders.findIndex(r => r.id === reminder.id);
          if (idx >= 0) this.todayReminders[idx] = { ...reminder, status: 'confirmed' };
          this.loadingId = null;
          this.speak(`Confirmé: ${reminder.title}`, 'fr-FR');
          this.showToastMsg(`✅ "${reminder.title}" confirmé !`);
        }
      });
  }

  /** ❌ Marquer un rappel comme manqué */
  markAsMissed(reminder: Reminder): void {
    if (this.loadingId === reminder.id) return;
    if (!confirm(`Marquer "${reminder.title}" comme manqué ?`)) return;
    const idx = this.todayReminders.findIndex(r => r.id === reminder.id);
    if (idx >= 0) this.todayReminders[idx] = { ...reminder, status: 'missed' };
    this.showToastMsg(`⚠️ "${reminder.title}" marqué comme manqué.`);
  }

  /** ⏰ Ouvrir le modal de report */
  openDelayModal(reminder: Reminder): void {
    this.reminderToDelay = reminder;
    this.showDelayModal  = true;
  }

  closeDelayModal(): void {
    this.showDelayModal  = false;
    this.reminderToDelay = null;
  }

  /** Reporter de N minutes */
  delayBy(minutes: number): void {
    if (!this.reminderToDelay) return;
    const reminder  = this.reminderToDelay;
    const newTime   = new Date(new Date(reminder.scheduledTime).getTime() + minutes * 60000);
    const idx = this.todayReminders.findIndex(r => r.id === reminder.id);
    if (idx >= 0) {
      this.todayReminders[idx] = { ...reminder, scheduledTime: newTime.toISOString() };
      this.todayReminders = this.sortRemindersByTime(this.todayReminders);
    }
    const label = minutes < 60 ? `${minutes} min` : `${minutes / 60}h`;
    this.speak(`Rappel reporté de ${label}`, 'fr-FR');
    this.showToastMsg(`⏰ "${reminder.title}" reporté de ${label}`);
    this.closeDelayModal();
  }

  /** Reporter à demain même heure */
  delayToTomorrow(): void {
    if (!this.reminderToDelay) return;
    const reminder = this.reminderToDelay;
    const idx = this.todayReminders.findIndex(r => r.id === reminder.id);
    if (idx >= 0) this.todayReminders.splice(idx, 1);
    this.speak('Rappel reporté à demain', 'fr-FR');
    this.showToastMsg(`📅 "${reminder.title}" reporté à demain`);
    this.closeDelayModal();
  }

  // ═══════════════════════════════════════════════════════
  // STATISTIQUES
  // ═══════════════════════════════════════════════════════

  getRemainingCount(): number {
    return this.todayReminders.filter(r =>
      r.status === 'pending' || r.status === 'planned' || r.status === 'delayed'
    ).length;
  }

  getConfirmedCount(): number {
    return this.todayReminders.filter(r =>
      r.status === 'confirmed' || r.status === 'confirmed_late'
    ).length;
  }

  getCompletionRate(): number {
    if (!this.todayReminders.length) return 0;
    return Math.round((this.getConfirmedCount() / this.todayReminders.length) * 100);
  }

  // ═══════════════════════════════════════════════════════
  // FORMATAGE / HELPERS
  // ═══════════════════════════════════════════════════════

  formatTime(date: string): string {
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  getTypeIcon(type: string): string {
    const t = (type || '').toLowerCase();
    const icons: Record<string, string> = {
      medication: '💊',
      medication_vital: '💊',
      appointment: '🏥',
      medical_appointment: '🏥',
      activity: '🎯',
      physical_activity: '🏃',
      test: '🔬',
      cognitive_test: '🧠',
      meal: '🍽️',
      hygiene: '🛁',
      walk: '🚶',
      family_call: '📞',
      hydration: '💧',
      sleep_routine: '😴',
      vital_signs: '❤️',
      other: '📋'
    };
    return icons[t] || '📋';
  }

  getTypeLabel(type: string): string {
    const t = (type || '').toLowerCase();
    const labels: Record<string, string> = {
      medication: 'Médicament',
      medication_vital: 'Médicament vital',
      appointment: 'Rendez-vous',
      medical_appointment: 'RDV médical',
      activity: 'Activité',
      physical_activity: 'Activité physique',
      test: 'Test',
      cognitive_test: 'Test cognitif',
      meal: 'Repas',
      hygiene: 'Hygiène',
      walk: 'Promenade',
      family_call: 'Appel famille',
      hydration: 'Hydratation',
      sleep_routine: 'Routine sommeil',
      vital_signs: 'Signes vitaux',
      other: 'Rappel'
    };
    return labels[t] || 'Rappel';
  }

  getSimpleLabel(reminder: Reminder): string {
    const t = (reminder.type as string || '').toLowerCase();
    if (t === 'medication' || t === 'medication_vital')  return `Prendre ${reminder.title}`;
    if (t === 'appointment' || t === 'medical_appointment') return `RDV: ${reminder.title}`;
    if (t === 'meal')        return `Repas: ${reminder.title}`;
    if (t === 'family_call') return `Appel: ${reminder.title}`;
    return reminder.title;
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      confirmed: 'fas fa-check-circle',
      confirmed_late: 'fas fa-check-circle',
      pending: 'fas fa-clock',
      planned: 'fas fa-calendar-check',
      missed: 'fas fa-times-circle',
      canceled: 'fas fa-ban',
      rescheduled: 'fas fa-redo',
      delayed: 'fas fa-hourglass-half'
    };
    return icons[status] || 'fas fa-circle';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      confirmed: 'Fait ✓',
      confirmed_late: 'Fait (tard)',
      pending: 'À faire',
      planned: 'Planifié',
      missed: 'Manqué',
      canceled: 'Annulé',
      rescheduled: 'Reporté',
      delayed: 'En retard'
    };
    return labels[status] || status;
  }

  trackById(_: number, item: Reminder): number { return item.id; }

  // ═══════════════════════════════════════════════════════
  // TOAST
  // ═══════════════════════════════════════════════════════

  private showToastMsg(msg: string): void {
    this.toastMessage = msg;
    this.showToast    = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.showToast = false; }, 3000);
  }

  // ═══════════════════════════════════════════════════════
  // WEB SPEECH — SYNTHÈSE VOCALE
  // ═══════════════════════════════════════════════════════

  readTodayPlan(): void {
    if (this.isSpeaking) { this.synth.cancel(); this.isSpeaking = false; return; }
    this.isSpeaking = true;
    const lang = localStorage.getItem('language') || 'fr-FR';
    let text = `Bonjour. Voici votre planning du jour.\n`;

    if (!this.todayReminders.length) {
      text += 'Vous n\'avez aucun rappel pour aujourd\'hui.';
    } else {
      text += `Vous avez ${this.todayReminders.length} rappel${this.todayReminders.length > 1 ? 's' : ''}.\n`;
      this.todayReminders.forEach((r, i) => {
        const status = r.status === 'confirmed' ? 'déjà fait' : 'à faire';
        text += `\n${i + 1}. À ${this.formatTime(r.scheduledTime)}: ${this.getSimpleLabel(r)}. ${status}.`;
      });
      const rem = this.getRemainingCount();
      text += rem > 0
        ? `\n\nIl vous reste ${rem} rappel${rem > 1 ? 's' : ''} à confirmer.`
        : '\n\nFélicitations ! Tous vos rappels sont confirmés.';
    }

    const utterance  = new SpeechSynthesisUtterance(text);
    utterance.lang   = lang === 'ar' ? 'ar-TN' : 'fr-FR';
    utterance.rate   = 0.85;
    utterance.onend  = () => { this.isSpeaking = false; };
    utterance.onerror = () => { this.isSpeaking = false; };
    this.synth.speak(utterance);
  }

  private speak(text: string, lang = 'fr-FR'): void {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = 0.9;
    this.synth.speak(u);
  }

  // ═══════════════════════════════════════════════════════
  // WEB SPEECH — RECONNAISSANCE VOCALE
  // ═══════════════════════════════════════════════════════

  activateVoiceConfirmation(): void {
    if (!this.recognition) { alert('Reconnaissance vocale non disponible.'); return; }
    if (this.isListening) { this.recognition.stop(); this.isListening = false; return; }
    this.isListening = true;
    this.speak('Je vous écoute. Dites "j\'ai fait" ou "confirmé".', 'fr-FR');
    setTimeout(() => { if (this.isListening) this.recognition.start(); }, 1500);
  }

  private setupSpeechRecognition(): void {
    if (!this.recognition) return;
    this.recognition.continuous    = false;
    this.recognition.interimResults = false;
    this.recognition.lang          = 'fr-FR';
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => { this.isListening = true; };
    this.recognition.onend   = () => { this.isListening = false; };
    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      if (event.error === 'not-allowed')
        alert('Veuillez autoriser l\'accès au microphone.');
    };
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++)
        transcript += event.results[i][0].transcript;
      this.processVoiceCommand(transcript.toLowerCase());
    };
  }

  private processVoiceCommand(transcript: string): void {
    const pending = this.todayReminders.filter(r =>
      r.status === 'pending' || r.status === 'planned' || r.status === 'delayed'
    );
    if (!pending.length) { this.speak('Tous vos rappels sont confirmés.', 'fr-FR'); return; }

    const keywords = ['j\'ai pris','j\'ai fait','confirmé','confirmer','oui','fait','pris','ok','validé'];
    if (keywords.some(kw => transcript.includes(kw))) {
      this.confirmReminder(pending[0]);
      const rem = pending.length - 1;
      this.speak(rem > 0 ? `Confirmé. Il reste ${rem} rappel${rem > 1 ? 's' : ''}.` : 'Bravo ! Tout est confirmé.', 'fr-FR');
    } else {
      this.speak('Commande non reconnue. Dites "j\'ai fait".', 'fr-FR');
    }
  }

  // ═══════════════════════════════════════════════════════
  // ACCESSIBILITÉ
  // ═══════════════════════════════════════════════════════

  increaseFontSize(): void {
    this.textSizeMultiplier = Math.min(this.textSizeMultiplier + 0.2, 1.8);
    localStorage.setItem('textSizeMultiplier', this.textSizeMultiplier.toString());
    this.applyFontSize();
  }

  decreaseFontSize(): void {
    this.textSizeMultiplier = Math.max(this.textSizeMultiplier - 0.2, 0.8);
    localStorage.setItem('textSizeMultiplier', this.textSizeMultiplier.toString());
    this.applyFontSize();
  }

  private applyFontSize(): void {
    document.documentElement.style.fontSize = (16 * this.textSizeMultiplier) + 'px';
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', this.isDarkMode.toString());
    document.documentElement.classList.toggle('dark', this.isDarkMode);
  }

  private applySavedPreferences(): void {
    const size = localStorage.getItem('textSizeMultiplier');
    if (size) { this.textSizeMultiplier = parseFloat(size); this.applyFontSize(); }
    if (localStorage.getItem('darkMode') === 'true') {
      this.isDarkMode = true;
      document.documentElement.classList.add('dark');
    }
  }

  // ═══════════════════════════════════════════════════════
  // EXPORT PDF
  // ═══════════════════════════════════════════════════════

  exportPDF(): void {
    if (!this.currentPatientId) { alert('Aucun patient connecté'); return; }
    this.planningService.exportWeeklyPlanningPDF(this.currentPatientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a   = document.createElement('a');
          a.href = url;
          a.download = `planning_${new Date().toISOString().split('T')[0]}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
          this.speak('Votre planning a été exporté en PDF.', 'fr-FR');
        },
        error: () => alert('Erreur lors de l\'export PDF.')
      });
  }
}
