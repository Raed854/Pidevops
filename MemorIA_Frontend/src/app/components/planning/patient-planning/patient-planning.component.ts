import { Component, OnInit, OnDestroy } from '@angular/core';
import { PlanningService } from '../../../services/planning.service';
import { AuthService } from '../../../services/auth.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-patient-planning',
  templateUrl: './patient-planning.component.html',
  styleUrls: ['./patient-planning.component.css']
})
export class PatientPlanningComponent implements OnInit, OnDestroy {
  // Données
  reminders: any[] = [];
  today = new Date().toISOString().slice(0, 10);
  currentDate = new Date();
  currentTime = '';
  error = '';

  // État UI
  isLoading = false;
  textSizeMultiplier = 1; // 1 = normal, 1.5 = grand, 0.8 = petit

  // Subscriptions
  private timeSubscription?: Subscription;
  private autoRefreshSubscription?: Subscription;

  // Web Speech API
  private synth = window.speechSynthesis;
  private recognition: any = null;
  private isSpeaking = false;

  constructor(
    private planning: PlanningService,
    private auth: AuthService
  ) {
    // Initialiser la reconnaissance vocale si disponible
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.setupSpeechRecognition();
    }
  }

  ngOnInit() {
    // Vérification du rôle
    if (this.auth.getRole() !== 'PATIENT') {
      this.error = 'Accès réservé aux patients.';
      return;
    }

    // Charger les rappels
    this.loadReminders();

    // Mettre à jour l'heure toutes les secondes
    this.updateTime();
    this.timeSubscription = interval(1000).subscribe(() => {
      this.updateTime();
    });

    // Auto-refresh toutes les 5 minutes
    this.startAutoRefresh();

    // Charger les préférences utilisateur
    this.applySavedPreferences();
  }

  ngOnDestroy() {
    if (this.timeSubscription) {
      this.timeSubscription.unsubscribe();
    }
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
    }
    this.synth.cancel();
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  /**
   * Démarrer l'auto-refresh des rappels
   */
  private startAutoRefresh(): void {
    this.autoRefreshSubscription = interval(5 * 60 * 1000) // 5 minutes
      .subscribe(() => {
        this.loadReminders();
      });
  }

  /**
   * Charger les préférences utilisateur sauvegardées
   */
  private applySavedPreferences(): void {
    const savedSize = localStorage.getItem('textSizeMultiplier');
    if (savedSize) {
      this.textSizeMultiplier = parseFloat(savedSize);
      this.applyTextSize();
    }
  }

  /**
   * Appliquer la taille du texte
   */
  applyTextSize(): void {
    document.documentElement.style.fontSize = `${16 * this.textSizeMultiplier}px`;
  }

  /**
   * Augmenter la taille du texte
   */
  increaseTextSize(): void {
    if (this.textSizeMultiplier < 1.5) {
      this.textSizeMultiplier += 0.1;
      this.applyTextSize();
      localStorage.setItem('textSizeMultiplier', this.textSizeMultiplier.toString());
    }
  }

  /**
   * Diminuer la taille du texte
   */
  decreaseTextSize(): void {
    if (this.textSizeMultiplier > 0.8) {
      this.textSizeMultiplier -= 0.1;
      this.applyTextSize();
      localStorage.setItem('textSizeMultiplier', this.textSizeMultiplier.toString());
    }
  }

  /**
   * Réinitialiser la taille du texte
   */
  resetTextSize(): void {
    this.textSizeMultiplier = 1;
    this.applyTextSize();
    localStorage.removeItem('textSizeMultiplier');
  }

  loadReminders() {
    const user = this.auth.getUser();
    const id = user?.id;
    if (!id) {
      this.error = 'Utilisateur non identifié.';
      return;
    }

    this.isLoading = true;
    this.planning.getReminders(id, this.today).subscribe({
      next: (reminders) => {
        this.reminders = reminders.sort((a, b) => {
          // Trier par heure
          return a.time.localeCompare(b.time);
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement rappels:', err);
        this.error = 'Erreur lors du chargement des rappels.';
        this.isLoading = false;
      }
    });
  }

  refreshReminders() {
    this.error = '';
    this.loadReminders();
  }

  updateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Configuration de la reconnaissance vocale
   */
  private setupSpeechRecognition(): void {
    if (!this.recognition) return;

    this.recognition.lang = 'fr-FR';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      this.handleVoiceCommand(transcript);
    };

    this.recognition.onerror = (event: any) => {
      console.error('Erreur reconnaissance vocale:', event.error);
    };
  }

  /**
   * Gérer les commandes vocales
   */
  private handleVoiceCommand(command: string): void {
    if (command.includes('lire') || command.includes('écouter')) {
      this.speakAll();
    } else if (command.includes('rafraîchir') || command.includes('actualiser')) {
      this.refreshReminders();
      this.speak('Actualisation en cours');
    } else if (command.includes('confirmer')) {
      // Confirmer le premier rappel en attente
      const pending = this.reminders.find(r => r.status !== 'confirmed');
      if (pending) {
        this.confirm(pending);
      }
    }
  }

  /**
   * Démarrer l'écoute vocale
   */
  startListening(): void {
    if (this.recognition) {
      try {
        this.recognition.start();
        this.speak('Je vous écoute');
      } catch (err) {
        console.error('Erreur démarrage reconnaissance:', err);
      }
    }
  }

  /**
   * Parler un texte simple
   */
  private speak(text: string): void {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'fr-FR';
    utter.rate = 0.9;
    this.synth.speak(utter);
  }

  confirm(reminder: any) {
    this.planning.confirmReminder(reminder.id).subscribe({
      next: () => {
        reminder.status = 'confirmed';
        this.speakConfirmation();

        // Feedback haptique si disponible
        if (navigator.vibrate) {
          navigator.vibrate(100);
        }
      },
      error: (err) => {
        console.error('Erreur confirmation:', err);
        alert('Erreur lors de la confirmation du rappel.');
      }
    });
  }

  speakAll() {
    if (this.reminders.length === 0) return;

    if (this.isSpeaking) {
      this.synth.cancel();
      this.isSpeaking = false;
      return;
    }

    this.synth.cancel(); // Arrêter toute lecture en cours
    this.isSpeaking = true;

    const intro = `Vous avez ${this.reminders.length} rappel${this.reminders.length > 1 ? 's' : ''} pour aujourd'hui. `;
    const text = this.reminders
      .map((r, i) => `${i + 1}. À ${r.time}, ${r.label}`)
      .join('. ');

    const utter = new SpeechSynthesisUtterance(intro + text);
    utter.lang = 'fr-FR';
    utter.rate = 0.85;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    utter.onend = () => {
      this.isSpeaking = false;
    };

    this.synth.speak(utter);
  }

  speakOne(reminder: any) {
    this.synth.cancel();

    const text = `À ${reminder.time}, ${reminder.label}${reminder.notes ? '. ' + reminder.notes : ''}`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'fr-FR';
    utter.rate = 0.85;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    this.synth.speak(utter);
  }

  speakConfirmation() {
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance('Rappel confirmé avec succès !');
    utter.lang = 'fr-FR';
    utter.rate = 0.9;
    synth.speak(utter);
  }

  // Statistiques
  getConfirmedCount(): number {
    return this.reminders.filter(r => r.status === 'confirmed').length;
  }

  getPendingCount(): number {
    return this.reminders.filter(r => r.status !== 'confirmed').length;
  }

  // Statut de l'heure
  getTimeStatus(time: string): string {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0, 0);

    const diff = reminderTime.getTime() - now.getTime();
    const diffMinutes = Math.floor(diff / 60000);

    if (diffMinutes < 0) {
      return 'Passé';
    } else if (diffMinutes === 0) {
      return 'Maintenant !';
    } else if (diffMinutes < 30) {
      return `Dans ${diffMinutes} min`;
    } else if (diffMinutes < 60) {
      return 'Bientôt';
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      return `Dans ${diffHours}h`;
    }
  }

  // Labels et classes CSS pour les types
  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'MEDICATION': '💊 Médicament',
      'MEDICATION_VITAL': '🚨 Médicament vital',
      'MEAL': '🍽️ Repas',
      'MEDICAL_APPOINTMENT': '🏥 Rendez-vous médical',
      'HYDRATION': '💧 Hydratation',
      'HYGIENE': '🧼 Hygiène',
      'WALK': '🚶 Promenade',
      'PHYSICAL_ACTIVITY': '🏃 Activité physique',
      'COGNITIVE_TEST': '🧠 Exercice cognitif',
      'FAMILY_CALL': '📞 Appel famille',
      'SLEEP_ROUTINE': '😴 Routine sommeil',
      'VITAL_SIGNS': '❤️ Signes vitaux',
      'OTHER': '📋 Autre'
    };
    return labels[type] || type;
  }

  getTypeClass(type: string): string {
    const classes: { [key: string]: string } = {
      'MEDICATION': 'bg-purple-100 text-purple-700 border border-purple-300',
      'MEDICATION_VITAL': 'bg-red-100 text-red-700 border border-red-300',
      'MEAL': 'bg-yellow-100 text-yellow-700 border border-yellow-300',
      'MEDICAL_APPOINTMENT': 'bg-blue-100 text-blue-700 border border-blue-300',
      'HYDRATION': 'bg-cyan-100 text-cyan-700 border border-cyan-300',
      'HYGIENE': 'bg-teal-100 text-teal-700 border border-teal-300',
      'WALK': 'bg-green-100 text-green-700 border border-green-300',
      'PHYSICAL_ACTIVITY': 'bg-lime-100 text-lime-700 border border-lime-300',
      'COGNITIVE_TEST': 'bg-indigo-100 text-indigo-700 border border-indigo-300',
      'FAMILY_CALL': 'bg-pink-100 text-pink-700 border border-pink-300',
      'SLEEP_ROUTINE': 'bg-violet-100 text-violet-700 border border-violet-300',
      'VITAL_SIGNS': 'bg-rose-100 text-rose-700 border border-rose-300',
      'OTHER': 'bg-gray-100 text-gray-700 border border-gray-300'
    };
    return classes[type] || classes['OTHER'];
  }

  getPriorityLabel(priority: string): string {
    const labels: { [key: string]: string } = {
      'URGENT': '🚨 Urgent',
      'HIGH': '⚠️ Important',
      'NORMAL': '📌 Normal',
      'LOW': '📎 Faible'
    };
    return labels[priority] || priority;
  }

  getPriorityClass(priority: string): string {
    const classes: { [key: string]: string } = {
      'URGENT': 'bg-red-100 text-red-700 border border-red-300 animate-pulse',
      'HIGH': 'bg-orange-100 text-orange-700 border border-orange-300',
      'NORMAL': 'bg-blue-100 text-blue-700 border border-blue-300',
      'LOW': 'bg-gray-100 text-gray-700 border border-gray-300'
    };
    return classes[priority] || classes['NORMAL'];
  }
}
