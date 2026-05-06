import { Component, signal, effect, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  LucideAngularModule,
  ChevronRight, Calendar, Plus, ClipboardCheck, Users, AlertTriangle,
  TrendingDown, Activity, X, Brain, Info, MessageSquare, ClipboardList,
  Clock, Search, CheckCircle2, UserCircle
} from 'lucide-angular';
import { CognitiveTestService } from '../../services/cognitive-test.service';
import { TestResultService } from '../../services/test-result.service';
import { AssignationService } from '../../services/assignation.service';
import { MmseScoreService, MMSEScoreResponse } from '../../services/mmse-score.service';
import { MetricsService, ScoreGlobal } from '../../services/metrics.service';
import { RecommendationService } from '../../services/recommendation.service';
import { DecisionService } from '../../services/decision.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { CognitiveTest, TestResult, DifficultyLevel, PatientDTO, AccompagnantDTO, AssignationRequest, Recommendation, PriorityLevel, RecommendStatus, Decision, DecisionType, TypeTestEnum } from '../../models/cognitive-models';
import { NewRecommendationModalComponent } from '../../components/new-recommendation-modal/new-recommendation-modal.component';
import { catchError, of, switchMap } from 'rxjs';

/** Rendez-vous de consultation vidéo */
export interface VideoAppointment {
  id: string;
  doctorName: string;
  patientName: string;
  patientId: number;
  date: string; // ISO
  status: 'scheduled' | 'active' | 'ended' | 'declined' | 'missed' | 'cancelled';
  roomId: string;
  report?: string;
  proposedDate?: string;
}

/** Message dans la conversation aidant ↔ médecin */
export interface RecMessage {
  id: string;
  recId: number;
  text: string;
  from: 'aidant' | 'medecin';
  priority: 'NORMALE' | 'HAUTE';
  sentAt: string;
  read: boolean;
}

@Component({
  selector: 'app-tests-cognitifs',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatDialogModule,
    LucideAngularModule
  ],
  templateUrl: './tests-cognitifs.component.html',
  styleUrl: './tests-cognitifs.component.css'
})
export class TestsCognitifsComponent implements OnInit, OnDestroy {
  private cognitiveTestService = inject(CognitiveTestService);
  private testResultService = inject(TestResultService);
  private assignationService = inject(AssignationService);
  private mmseScoreService = inject(MmseScoreService);
  private metricsService = inject(MetricsService);
  private recommendationService = inject(RecommendationService);
  private decisionService = inject(DecisionService);
  private notifService = inject(NotificationService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  router = inject(Router);
  activatedRoute = inject(ActivatedRoute);

  // ─── Icons ─────────────────────────────────────────────────
  readonly icons = {
    ChevronRight, Calendar, Plus, ClipboardCheck, Users, AlertTriangle,
    TrendingDown, Activity, X, Brain, Info, MessageSquare, ClipboardList,
    Clock, Search, CheckCircle2, UserCircle
  };

  // ─── Recommandations ───────────────────────────────────────
  doctorId = signal<number | null>(null);
  doctorRecommendations = signal<Recommendation[]>([]);
  aidantRecommendations = signal<Recommendation[]>([]);
  patientRecommendations = signal<Recommendation[]>([]);
  allAidantsRecommendations = signal<Map<number, Recommendation[]>>(new Map());
  PriorityLevel = PriorityLevel;
  RecommendStatus = RecommendStatus;
  DecisionType = DecisionType;
  TypeTestEnum = TypeTestEnum;

  // ─── Interface Aidant — Navigation & état ──────────────────
  aidantActiveTab = signal<'accueil' | 'recommandations' | 'historique' | 'profil'>('accueil');
  aidantStatusFilter = signal<RecommendStatus | null>(null);
  aidantSelectedRec = signal<Recommendation | null>(null);
  aidantRecPage = signal(1);
  aidantRecNotesEditing = signal(false);
  aidantRecNotesDraft = signal('');
  readonly REC_PAGE_SIZE = 10;

  // ── Étape 15 : Confirmation & Motif d'ignorance ──────────────────────
  showConfirmModal = signal(false);
  confirmConfig = signal<{
    title: string;
    message: string;
    confirmLabel: string;
    confirmClass: string;
    onConfirm: () => void;
  } | null>(null);
  showDismissModal = signal(false);
  dismissTargetRec = signal<Recommendation | null>(null);
  dismissReason = signal<string>('');
  dismissCustomNote = signal<string>('');
  readonly DISMISS_REASONS = [
    'Déjà réalisée avant prescription',
    'Plus pertinente',
    'Impossible à réaliser',
    'Autre (préciser)'
  ];

  // ── Étape 16 : Recherche et filtres avancés ──────────────────────────
  aidantSearchQuery = signal<string>('');
  aidantPriorityFilter = signal<PriorityLevel | null>(null);

  // ── Étape 17 : Notifications ─────────────────────────────────────────
  aidantToasts = signal<{ id: string; rec: Recommendation; timeout?: any }[]>([]);
  urgentPopupRec = signal<Recommendation | null>(null);
  private seenRecIds = new Set<number>();
  private notifPollingTimer: any = null;

  // ── Étape 18 : Historique amélioré ──────────────────────────────────
  histPeriodFilter = signal<'all' | 'week' | 'month' | 'year'>('all');
  histStatusFilter = signal<'all' | 'completed' | 'dismissed'>('all');
  showArchiveDetailModal = signal(false);
  archiveDetailRec = signal<Recommendation | null>(null);

  // ── Étape 19 : Décisions médicales ──────────────────────────────────
  patientDecisions = signal<Decision[]>([]);
  showDecisionsHistoryModal = signal(false);

  // ── Étape 20 : Communication aidant ↔ médecin ───────────────────────
  showContactModal = signal(false);
  contactTargetRec = signal<Recommendation | null>(null);
  contactMessage = signal('');

  // ── Scroll Horizontal : Cartes Patients et Aidants ──────────────────
  showPatientDetailModal = signal(false);
  selectedPatientDetail = signal<any>(null);
  patientsWithAidants = signal<any[]>([]);
  contactPriority = signal<'NORMALE' | 'HAUTE'>('NORMALE');
  contactMessages = signal<RecMessage[]>([]);
  showConversationModal = signal(false);
  conversationTargetRec = signal<Recommendation | null>(null);

  // ── Interface messagerie médecin ─────────────────────────────────────
  showDoctorConvModal = signal(false);
  doctorConvRec = signal<Recommendation | null>(null);
  doctorReplyText = signal('');
  doctorReplyPriority = signal<'NORMALE' | 'HAUTE'>('NORMALE');
  private doctorReadIds = new Set<string>();
  private doctorMsgPollingTimer: any = null;

  // ── Carte patient (scroll horizontal) ───────────────────────────────
  selectedPatientCard = signal<any>(null);

  // ── Étapes 21-22 : Consultation vidéo ────────────────────────────────
  showVideoConfigModal = signal(false);
  videoConfigStep = signal<'select-aidant' | 'configure'>('select-aidant');
  videoSelectedAidant = signal<AccompagnantDTO | null>(null);
  videoAidantSearch = signal('');
  videoCallMode = signal<'immediate' | 'scheduled' | null>(null);
  showDoctorVideoUI = signal(false);
  doctorCamStream = signal<MediaStream | null>(null);
  doctorMicMuted = signal(false);
  doctorCamOff = signal(false);
  videoCallConnected = signal(false);
  videoCallActive = signal(false);
  showVideoReportModal = signal(false);
  videoReport = signal('');
  scheduledCallDate = signal('');
  scheduledCallTime = signal('');
  currentRoomId = signal<string | null>(null);

  // Aidant – réception appel
  incomingCall = signal<{ roomId: string; doctorName: string; patientName: string } | null>(null);
  showAidantVideoUI = signal(false);
  aidantCamStream = signal<MediaStream | null>(null);
  aidantTestMode = signal(false);
  showProposeTimeModal = signal(false);
  proposeDate = signal('');
  proposeTime = signal('');
  showDeclineCallModal = signal(false);
  callDeclineReason = signal('');
  private callStatePollingTimer: any = null;
  private aidantCallPollingTimer: any = null;

  // ── Étape 23 : Rappels rendez-vous ───────────────────────────────────
  scheduledAppointments = signal<VideoAppointment[]>([]);
  private reminderPollingTimer: any = null;

  showNewTestModal = signal(false);
  // MMSE score dynamique pour aidant et patient
  aidantPatientMmseScore = signal<MMSEScoreResponse | null>(null);
  patientMmseScore = signal<MMSEScoreResponse | null>(null);
  aidantGlobalScore = signal<ScoreGlobal | null>(null);
  selectedRole = signal<string | null>(null);

  // New Test Form State
  searchQuery = signal('');
  selectedPatientId = signal<string | null>(null);
  testStage = signal<'STABLE' | 'MOYEN' | 'CRITIQUE' | null>(null);
  selectedTestId = signal<string | null>(null);
  testDeadline = signal('');
  testNotes = signal('');

  availableTests = signal<CognitiveTest[]>([]);
  recentResults = signal<any[]>([]);
  patientsList = signal<PatientDTO[]>([]);
  aidantsList = signal<AccompagnantDTO[]>([]);
  patientAssignments = signal<any[]>([]);
  doctorAssignments = signal<any[]>([]);
  mockAssignments: any[] = JSON.parse(localStorage.getItem('mockAssignments') || '[]'); // Store local mock assignments for demo purposes
  showDoctorAssignmentsModal = signal(false);
  selectedPatientForDashboard = signal<any>(null); // Stores the selected patient object

  // Selection Modal State
  showSelectionModal = signal(false);
  selectionType = signal<'PATIENT' | 'AIDANT' | null>(null);
  selectedPersonId = signal<number | null>(null);
  activeAidantId = signal<number | null>(null);

  dashboardStats = {
    totalPatients: 23,
    newThisMonth: 3,
    stage1: 12,
    stage2: 8,
    stage3: 3
  };

  criticalAlerts = [
    { name: 'Pierre Martin', stage: 'STAGE 3 — CRITIQUE', score: '14/30', trend: '-5 pts', alerts: 3, color: 'red' },
    { name: 'Anne Petit', stage: 'STAGE 3 — CRITIQUE', score: '16/30', trend: '-4 pts', alerts: 2, color: 'pink' }
  ];

  recentDecisions = [
    { patient: 'Pierre Martin', status: 'CRITIQUE', urgency: 'URGENCE', description: 'Déclin rapide détecté - Score passé de 19 à 14 en 1 mois. Intervention immédiate recommandée.', type: 'HYBRID', date: '08/02/2026' },
    { patient: 'Jean Dupont', status: 'MOYEN', urgency: 'SURVEILLANCE', description: 'Léger déclin observé. Surveillance renforcée recommandée.', type: 'RULE BASED', date: '15/02/2026' }
  ];

  // Aidant Mock Data
  aidantData = {
    patientName: 'Robert Lefebvre',
    patientId: 36,
    patientAge: 85,
    stage: 'STAGE 2 — SURVEILLANCE',
    currentScore: '22/30',
    percentage: 73.3,
    trend: 'Déclin -2 pts',
    nextTest: '29/03/2026',
    statusMessage: 'Surveillance renforcée',
    statusDesc: 'Score en baisse de 2 points ce mois. Suivez bien les recommandations du médecin.',
    tasks: [
      { id: 1, title: 'Appeler le médecin', urgency: 'URGENTE', date: '17/02/2026', color: 'red' },
      { id: 2, title: 'Exercices mémoire quotidiens', urgency: 'ÉLEVÉE', date: '17/02/2026', color: 'yellow' },
      { id: 3, title: 'Préparer cahier de suivi', urgency: 'MOYENNE', date: '20/02/2026', color: 'blue' }
    ],
    appointment: {
      date: '25 Février 2026',
      time: '10h00',
      description: 'Test Cognitif + Consultation',
      location: 'Cabinet Dr. Martin'
    },
    resources: [
      { title: "Guide de l'aidant", desc: 'Conseils et bonnes pratiques', icon: null },
      { title: "Ligne d'urgence", desc: '0800 XXX XXX (24/7)', icon: null },
      { title: 'Groupe de soutien', desc: 'Rejoindre la communauté', icon: null }
    ]
  };

  // Patient Mock Data
  patientData = {
    stage: 'STAGE 2 — SURVEILLANCE',
    currentScore: '22/30',
    percentage: 73.3,
    doctorNote: "Votre médecin suit votre mémoire de près. Ce n'est PAS une maladie grave. C'est une surveillance préventive. Faites vos exercices quotidiens et passez les tests demandés.",
    testsToDo: [
      { title: 'Test de Stroop', desc: "Évaluation de l'attention sélective et de l'inhibition cognitive", duration: '10 min', deadline: '29/03/2026' }
    ],
    recommendations: [
      { title: 'Exercices de mémoire quotidiens', desc: "15 minutes par jour d'exercices cognitifs", icon: undefined },
      { title: 'Rendez-vous médical', desc: 'Consultation de suivi le 25 février', icon: undefined }
    ],
    nextAppointment: {
      date: '25 Février 2026 à 10h00',
      location: 'Cabinet Dr. Martin'
    }
  };

  // Reactive signals for patient data
  // patientsList is already defined at line 42

  get filteredPatients() {
    const query = this.searchQuery().toLowerCase();
    const patients = this.patientsList();
    if (!query) return [];
    return patients.filter(p =>
      (p.nom?.toLowerCase().includes(query) || p.prenom?.toLowerCase().includes(query))
    );
  }

  get selectedPatientData() {
    return this.patientsList().find(p => p.id.toString() === this.selectedPatientId());
  }

  selectedTestType = signal<string | null>(null);

  // Personalized tests filled by the doctor
  personalizedTests: { STABLE: { name: string; selected: boolean }[]; MOYEN: { name: string; selected: boolean }[]; CRITIQUE: { name: string; selected: boolean }[] } = {
    STABLE: [
      { name: 'Mémoire des visages personnalisée', selected: false },
      { name: 'Mots croisés personnalisés', selected: false }
    ],
    MOYEN: [
      { name: 'Memory personnalisé', selected: false },
      { name: 'Reconnaissance d\'odeurs personnalisée', selected: false }
    ],
    CRITIQUE: [
      { name: 'Reconnaissance des proches personnalisée', selected: false },
      { name: 'Chansons personnalisées', selected: false }
    ]
  };

  // Helper to map UI stage to numeric difficulty level
  private getDifficultyFromStage(stage: string): DifficultyLevel {
    const stageDifficultyMap: Record<string, DifficultyLevel> = {
      'STABLE': DifficultyLevel.FACILE,
      'MOYEN': DifficultyLevel.MOYEN,
      'CRITIQUE': DifficultyLevel.AVANCE
    };
    return stageDifficultyMap[stage];
  }

  readonly typeLabels: Record<string, string> = {
    'MEMORY': 'MEMORY (Tests de mémoire)',
    'LANGUAGE': 'LANGUAGE (Tests de langage)',
    'REFLECTION': 'REFLECTION (Tests de réflexion)',
    'LOGIC': 'LOGIC (Tests de logique)',
    'AUDIO': 'AUDIO (Tests sonores)',
    'ATTENTION': 'ATTENTION (Tests d\'attention)',
    'DRAWING': 'DRAWING (Tests de dessin)'
  };

  get groupedTestsHierarchy() {
    const tests = this.availableTests();
    const stages: { id: 'STABLE' | 'MOYEN' | 'CRITIQUE', label: string, difficulty: DifficultyLevel }[] = [
      { id: 'STABLE', label: 'STABLE (Facile)', difficulty: DifficultyLevel.FACILE },
      { id: 'MOYEN', label: 'MOYEN (Intermédiaire)', difficulty: DifficultyLevel.MOYEN },
      { id: 'CRITIQUE', label: 'CRITIQUE (Avancé)', difficulty: DifficultyLevel.AVANCE }
    ];

    return stages.map(stage => {
      const testsInStage = tests.filter(t => t.difficultyLevel === stage.difficulty);
      const uniqueTypes = [...new Set(testsInStage.map(t => t.type))];

      const categories = uniqueTypes.map(type => ({
        type,
        label: this.typeLabels[type] || type,
        tests: testsInStage.filter(t => t.type === type)
      }));

      return {
        ...stage,
        categories
      };
    });
  }

  get availableTestTypes() {
    const stage = this.testStage();
    if (!stage) return [];

    const targetDifficulty = this.getDifficultyFromStage(stage);

    // Filter tests by difficulty
    const tests = this.availableTests().filter(t =>
      t.difficultyLevel === targetDifficulty
    );

    // Get unique types
    const types = [...new Set(tests.map(t => t.type))];
    return types;
  }

  get availableSpecificTests() {
    const stage = this.testStage();
    const type = this.selectedTestType();

    if (!stage || !type) return [];

    const targetDifficulty = this.getDifficultyFromStage(stage);

    return this.availableTests().filter(t =>
      t.difficultyLevel === targetDifficulty &&
      t.type === type
    );
  }

  isFormValid() {
    return this.selectedPatientId() && this.testStage() && this.selectedTestType() && this.selectedTestId() && this.testDeadline();
  }

  // Helper to map test type to color/icon
  getTestStyle(type: string) {
    switch (type) {
      case 'MEMORY': return { color: 'blue', icon: undefined };
      case 'LANGUAGE': return { color: 'green', icon: undefined };
      case 'LOGIC': return { color: 'indigo', icon: undefined };
      case 'REFLECTION': return { color: 'purple', icon: undefined };
      case 'AUDIO': return { color: 'pink', icon: undefined };
      case 'ATTENTION': return { color: 'teal', icon: undefined };
      case 'DRAWING': return { color: 'orange', icon: undefined };
      default: return { color: 'purple', icon: undefined };
    }
  }

  constructor() {
    effect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && this.showNewTestModal()) {
          this.handleCloseModal();
        }
      };

      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    });

    // Effect to load aidant's recommendations and notifications when activeAidantId changes
    effect(() => {
      const aidantId = this.activeAidantId();
      const patientsData = this.patientsWithAidants();
      
      if (aidantId && patientsData.length > 0) {
        console.log('[DEBUG] Effect triggered: loading aidant data for aidantId:', aidantId);
        this.loadAidantDataByIdFromParams(aidantId);
      } else if (aidantId) {
        console.log('[DEBUG] Waiting for patientsWithAidants to load before loading aidant data');
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    // Check for queryParams to allow doctor to view patient (from medecin-metrics)
    const queryRole = this.activatedRoute.snapshot.queryParams['role'];
    const queryPatientId = this.activatedRoute.snapshot.queryParams['patientId'];

    // Auto-detect user role and set selectedRole accordingly
    const userRole = this.authService.getRole();
    const currentUser = this.authService.getUser();
    
    // If doctor is viewing a patient via queryParams, override the role
    if (queryRole === 'patient' && queryPatientId) {
      const patientId = parseInt(queryPatientId);
      this.selectedRole.set('patient');
      
      // Load patients first to get the actual patient data
      this.assignationService.getAllPatientsWithMedecin().subscribe({
        next: (patients: any[]) => {
          const patient = patients.find(p => p.id === patientId);
          if (patient) {
            this.selectedPatientForDashboard.set({
              id: patient.id,
              prenom: patient.prenom,
              nom: patient.nom,
              email: patient.email,
              dateNaissance: patient.dateNaissance
            } as any);
          } else {
            this.selectedPatientForDashboard.set({ 
              id: patientId,
              prenom: 'Patient',
              nom: ''
            } as any);
          }
          // Load MMSE score after setting patient
          this.loadMmseScoreForPatient();
        },
        error: () => {
          this.selectedPatientForDashboard.set({ 
            id: patientId,
            prenom: 'Patient',
            nom: ''
          } as any);
          // Load MMSE score after setting patient
          this.loadMmseScoreForPatient();
        }
      });
      
      // Load recommendations for this patient
      this.loadPatientRecommendations(patientId);
      this.loadPatientAssignments(patientId);
    } else if (userRole === 'AIDANT') {
      // Aidant/Accompanant: set role to 'aidant' and load their associated patient
      this.selectedRole.set('aidant');
      if (currentUser?.id) {
        this.activeAidantId.set(currentUser.id);
      }
    } else if (userRole === 'PATIENT') {
      // Patient: set role to 'patient'
      this.selectedRole.set('patient');
      if (currentUser?.id) {
        this.selectedPatientForDashboard.set(currentUser as any);
      }
    } else if (userRole === 'SOIGNANT') {
      // Médecin/Soignant: keep default (no specific role, show doctor interface)
      // selectedRole remains null, showing the default doctor dashboard
      // Initialize doctorId from currentUser
      if (currentUser?.id) {
        this.doctorId.set(currentUser.id);
      }
    }

    // Check if user is aidant and get their ID from queryParams or AuthService
    const aidantIdFromParams = this.activatedRoute.snapshot.queryParams['aidantId'];
    if (aidantIdFromParams) {
      const aidantId = parseInt(aidantIdFromParams);
      this.activeAidantId.set(aidantId);
      this.selectedRole.set('aidant');
      console.log('[DEBUG] Aidant mode activé pour aidantId:', aidantId);
    } else if (userRole === 'AIDANT') {
      // Aidant/Accompanant: set role to 'aidant' and load their associated patient
      this.selectedRole.set('aidant');
      if (currentUser?.id) {
        this.activeAidantId.set(currentUser.id);
      }
    }

    // Only call these if not viewing a patient via queryParams (since they're called separately)
    if (!(queryRole === 'patient' && queryPatientId)) {
      this.loadPatients();
      this.loadAidants();
      this.loadTests();
      this.loadDoctorAssignments();
      // Charger le score MMSE pour patient (aidant sera chargé plus tard)
      this.loadMmseScoreForPatient();
    } else {
      // Still need to load these
      this.loadPatients();
      this.loadAidants();
      this.loadTests();
      this.loadDoctorAssignments();
    }
    
    // Charger les patients avec leurs aidants pour le scroll horizontal
    setTimeout(() => this.loadPatientsWithAidants(), 1000);
  }

  loadMmseScoreForAidant() {
    // Récupérer le patientId de l'aidant actif (si disponible)
    const aidantId = this.activeAidantId();
    if (!aidantId) return;
    // Chercher l'assignment de l'aidant pour récupérer le patientId
    this.assignationService.getAllAssignations().pipe(
      catchError(() => of([]))
    ).subscribe((assignments: any[]) => {
      const assignment = assignments.find((a: any) => a.accompagnantId === aidantId && a.patientId);
      if (assignment && assignment.patientId) {
        this.mmseScoreService.getLatestMMSEScore(assignment.patientId.toString()).subscribe({
          next: (score) => this.aidantPatientMmseScore.set(score),
          error: (err) => console.error('Erreur chargement score MMSE aidant', err)
        });
      }
    });
  }

  loadMmseScoreForPatient() {
    const patient = this.selectedPatientForDashboard();
    if (!patient) return;
    this.mmseScoreService.getLatestMMSEScore(patient.id.toString()).subscribe({
      next: (score) => this.patientMmseScore.set(score),
      error: (err) => console.error('Erreur chargement score MMSE patient', err)
    });
  }

  loadPatients() {
    // Utiliser notre nouvel endpoint pour récupérer tous les patients avec leur médecin
    this.assignationService.getAllPatientsWithMedecin().subscribe({
      next: (patients: any[]) => {
        // Convertir les patients au format attendu par le composant (sans typage strict)
        const formattedPatients = patients.map(p => ({
          id: p.id,
          nom: p.nom,
          prenom: p.prenom,
          email: p.email,
          dateNaissance: p.dateNaissance,
          sexe: p.sexe,
          adresse: p.adresse,
          role: 'PATIENT',
          actif: true,
          medecin: p.medecin
        }));
        this.patientsList.set(formattedPatients as any);
        console.log('[DEBUG] Patients chargés avec médecin:', formattedPatients);
      },
      error: (err) => {
        console.error('Error loading patients', err);
        // Fallback: créer des patients mock pour éviter l'erreur "aucun patient trouvé"
        const mockPatients = [
          {
            id: 92,
            nom: 'Lefebvre',
            prenom: 'Robert',
            email: 'robert.l@email.com',
            dateNaissance: '1942-03-15',
            sexe: 'M',
            adresse: '8 Rue de Rivoli, Paris',
            role: 'PATIENT',
            actif: true,
            medecin: {
              id: 55,
              nom: 'Oussama',
              prenom: 'Dr. Sophie',
              email: 'dr.oussama@hospital.com',
              specialite: 'Médecine Générale'
            }
          },
          {
            id: 93,
            nom: 'Moreau',
            prenom: 'Marguerite',
            email: 'margot.m@email.com',
            dateNaissance: '1938-11-02',
            sexe: 'F',
            adresse: '24 Avenue Mozart, Lyon',
            role: 'PATIENT',
            actif: true,
            medecin: {
              id: 55,
              nom: 'Oussama',
              prenom: 'Dr. Sophie',
              email: 'dr.oussama@hospital.com',
              specialite: 'Médecine Générale'
            }
          }
        ];
        this.patientsList.set(mockPatients as any);
        console.log('[DEBUG] Patients mock chargés:', mockPatients);
      }
    });
  }

  loadAidants() {
    console.log('[DEBUG] loadAidants() called');
    this.assignationService.getAllAidants().subscribe({
      next: (aidants) => {
        console.log('[DEBUG] getAllAidants() response:', aidants);
        if (Array.isArray(aidants) && aidants.length > 0) {
          this.aidantsList.set(aidants);
          console.log('[DEBUG] Aidants chargés:', aidants);
          console.log('[DEBUG] aidantsList signal:', this.aidantsList());
          // Charger les recommandations pour tous les aidants
          this.loadAllAidantsRecommendations();
        } else {
          console.log('[DEBUG] No aidants returned, using fallback');
          const mockAidant: any = {
            id: 16,
            nom: 'Martin',
            prenom: 'Sophie',
            email: 'sophie.martin@email.com',
            role: 'AIDANT',
            actif: true,
            patientId: 1
          };
          this.aidantsList.set([mockAidant]);
          console.log('[DEBUG] Aucun aidant trouvé, fallback mock:', mockAidant);
          // Charger les recommandations pour les aidants de secours
          this.loadAllAidantsRecommendations();
        }
      },
      error: (err) => {
        console.error('Error loading aidants', err);
        const mockAidant: any = {
          id: 16,
          nom: 'Martin',
          prenom: 'Sophie',
          email: 'sophie.martin@email.com',
          role: 'AIDANT',
          actif: true,
          patientId: 1
        };
        this.aidantsList.set([mockAidant]);
        console.log('[DEBUG] Aidants mock chargés (fallback):', mockAidant);
        // Charger les recommandations pour les aidants de secours
        this.loadAllAidantsRecommendations();
      }
    });
  }

  loadDoctorAssignments() {
    // Si le doctorId est déjà défini (pour les utilisateurs SOIGNANT), l'utiliser directement
    const existingDoctorId = this.doctorId();
    if (existingDoctorId) {
      console.log('[DEBUG] Using existing doctorId:', existingDoctorId);
      this.loadDoctorRecommendations(existingDoctorId);
      
      this.assignationService.getAssignationsByMedecin(existingDoctorId).pipe(
        catchError(() => of([]))
      ).subscribe((assignments) => {
        const mocks = this.mockAssignments.filter(a => a.soignantId === existingDoctorId);
        this.doctorAssignments.set([...assignments, ...mocks]);
        console.log('[DEBUG] Assignations médecin chargées (Direct):', this.doctorAssignments());
      });
      return;
    }

    // Fallback: Récupérer tous les patients pour trouver un médecin
    this.assignationService.getAllPatientsWithMedecin().subscribe({
      next: (patients) => {
        if (patients.length > 0 && patients[0].medecin) {
          const medecinId = patients[0].medecin.id;
          console.log('[DEBUG] Using medecinId from patients:', medecinId);

          // Stocker l'ID du médecin et charger ses recommandations
          this.doctorId.set(medecinId);
          this.loadDoctorRecommendations(medecinId);

          // Utiliser l'ID du médecin trouvé
          this.assignationService.getAssignationsByMedecin(medecinId).pipe(
            catchError(() => of([]))
          ).subscribe((assignments) => {
            // Merge real backend data with local mock data
            const mocks = this.mockAssignments.filter(a => a.soignantId === medecinId);
            this.doctorAssignments.set([...assignments, ...mocks]);
            console.log('[DEBUG] Assignations médecin chargées (Merged):', this.doctorAssignments());
          });
        } else {
          console.warn('[DEBUG] Aucun médecin trouvé parmi les patients');
          this.doctorAssignments.set([]);
        }
      },
      error: (err) => {
        console.error('Error loading patients for doctor assignments', err);
        // Fallback: utiliser l'ID du médecin actuel ou un ID par défaut
        const fallbackMedecinId = this.doctorId() || 16;
        this.doctorId.set(fallbackMedecinId);
        
        this.assignationService.getAssignationsByMedecin(fallbackMedecinId).pipe(
          catchError(() => of([]))
        ).subscribe((assignments) => {
          const mocks = this.mockAssignments.filter(a => a.soignantId === fallbackMedecinId);
          this.doctorAssignments.set([...assignments, ...mocks]);
          console.log('[DEBUG] Assignations médecin chargées (fallback):', this.doctorAssignments());
        });
      }
    });
  }

  getPatientName(patientId: number): string {
    const patient = this.patientsList().find(p => p.id === patientId);
    return patient ? `${patient.prenom} ${patient.nom}` : `Patient #${patientId}`;
  }

  /** Charge les patients avec leurs aidants associés pour le scroll horizontal */
  loadPatientsWithAidants() {
    const patients = this.patientsList();
    const aidants = this.aidantsList();
    
    // Récupérer toutes les assignations pour construire map patient -> aidants
    this.assignationService.getAllAssignations().pipe(
      catchError(() => of([]))
    ).subscribe((assignations: any[]) => {
      const patientsData = patients.map(patient => {
        // Trouver tous les aidants associés à ce patient
        const aidantsForPatient = assignations
          .filter(a => a.patientId === patient.id)
          .map(a => a.accompagnantId)
          .filter((id, index, self) => self.indexOf(id) === index); // unique
        
        const associatedAidants = aidants.filter(a => aidantsForPatient.includes(a.id));
        
        return {
          ...patient,
          aidants: associatedAidants.length > 0 ? associatedAidants : [],
          score: Math.floor(Math.random() * 30), // Utiliser données réelles si disponibles
          age: patient.dateNaissance ? this.calculateAge(patient.dateNaissance) : 0,
          stage: 'STABLE' // À récupérer depuis les scores cognitifs réels
        };
      });
      
      this.patientsWithAidants.set(patientsData);
      console.log('[DEBUG] Patients avec aidants chargés:', patientsData);
      
      // Recharger les recommandations pour tous les aidants maintenant que nous avons le mapping
      this.loadAllAidantsRecommendations();
    });
  }

  /** Ouvre la modale de détails du patient */
  openPatientDetail(patient: any) {
    this.selectedPatientDetail.set(patient);
    this.showPatientDetailModal.set(true);
  }

  /** Ferme la modale de détails */
  closePatientDetail() {
    this.showPatientDetailModal.set(false);
    setTimeout(() => this.selectedPatientDetail.set(null), 300);
  }

  /** Ouvre la conversation avec l'aidant du patient sélectionné */
  openConversationWithPatientAidant() {
    const patient = this.selectedPatientDetail();
    if (!patient || !patient.aidants || patient.aidants.length === 0) {
      this.notifService.showError('Aucun aidant assigné à ce patient');
      return;
    }

    const aidant = patient.aidants[0]; // Utiliser le premier aidant
    
    // Essayer de trouver une recommandation existante avec cet aidant
    const existingRec = this.doctorRecommendations().find((rec: any) => {
      // Chercher une recommandation pour ce patient
      return rec.patientId === patient.id;
    });

    if (existingRec) {
      // Ouvrir la conversation pour la recommandation existante
      this.loadAllRecMessages();
      this.openDoctorConversation(existingRec);
    } else {
      // Créer une modale de conversation directe avec l'aidant
      // Pour l'instant, afficher un message
      this.notifService.showInfo(`Conversation avec ${aidant.prenom} ${aidant.nom} (aidant)`);
      // Futur: Implémenter une messagerie directe patient <-> aidant
    }
    
    this.closePatientDetail();
  }

  /** Ouvre l'appel vidéo avec l'aidant du patient sélectionné */
  openVideoCallWithPatientAidant() {
    const patient = this.selectedPatientDetail();
    if (!patient || !patient.aidants || patient.aidants.length === 0) {
      this.notifService.showError('Aucun aidant assigné à ce patient');
      return;
    }

    const aidant = patient.aidants[0]; // Utiliser le premier aidant
    
    // Pré-sélectionner l'aidant pour l'appel vidéo
    this.videoSelectedAidant.set(aidant);
    this.videoConfigStep.set('configure');
    this.videoCallMode.set(null);
    this.scheduledCallDate.set('');
    this.scheduledCallTime.set('');
    this.showVideoConfigModal.set(true);
    
    this.closePatientDetail();
  }

  openSelectionModal(type: 'PATIENT' | 'AIDANT') {
    console.log('[DEBUG] openSelectionModal called with type:', type);
    this.selectionType.set(type);
    this.showSelectionModal.set(true);
    // Recharger la liste correspondante pour garantir qu'elle est à jour
    if (type === 'AIDANT') {
      console.log('[DEBUG] Loading aidants...');
      this.loadAidants();
    } else {
      console.log('[DEBUG] Loading patients...');
      this.loadPatients();
    }
  }

  handleCloseSelectionModal() {
    this.showSelectionModal.set(false);
    this.selectionType.set(null);
    this.selectedPersonId.set(null);
  }

  confirmSelection() {
    const type = this.selectionType();
    const id = this.selectedPersonId();
    if (!type || !id) return;

    if (type === 'PATIENT') {
      const patient = this.patientsList().find(p => p.id === id);
      if (patient) {
        this.selectedPatientForDashboard.set(patient); // Store the full patient object
        this.selectedRole.set('patient');
        this.loadPatientAssignments(id);
      }
    } else if (type === 'AIDANT') {
      const aidant = this.aidantsList().find(a => a.id === id);
      if (aidant) {
        this.activeAidantId.set(id);
        // Mettre à jour les données de l'aidant avec les vraies données
        this.aidantData.patientName = `${aidant.prenom} ${aidant.nom}`;
        this.aidantData.patientId = aidant.id;
        // Utiliser une valeur par défaut pour l'âge car AccompagnantDTO n'a pas de dateNaissance
        this.aidantData.patientAge = 75; // Valeur par défaut pour la démo
        this.selectedRole.set('aidant');

        // Charger les tests du patient lié à cet aidant via le nouvel endpoint
        this.loadAidantPatientTests(id);
        // Charger le score MMSE du patient lié à cet aidant
        this.loadMmseScoreForAidant();
        // Charger le score global composite
        this.aidantGlobalScore.set(null);
        this.metricsService.getScoreGlobalForAidant(id).subscribe({
          next: (score) => this.aidantGlobalScore.set(score),
          error: (err) => console.error('Erreur score global', err)
        });

        // Charger les recommandations si le patientId est déjà connu (AccompagnantDTO)
        if ((aidant as any).patientId) {
          this.loadAidantRecommendations((aidant as any).patientId);
          this.aidantData.patientId = (aidant as any).patientId;
        }
      }
    }
    this.handleCloseSelectionModal();
  }

  // Méthode pour trouver le patient associé à un aidant
  findPatientForAidant(aidantId: number) {
    // Charger toutes les assignments pour trouver celle qui contient cet aidant
    this.assignationService.getAllAssignations().subscribe({
      next: (allAssignments: any[]) => {
        // Chercher une assignment où cet aidant est l'accompagnant
        const assignmentWithAidant = allAssignments.find((assign: any) =>
          assign.accompagnantId === aidantId && assign.patientId
        );

        if (assignmentWithAidant) {
          // Trouver le patient associé
          const patient = this.patientsList().find(p => p.id === assignmentWithAidant.patientId);
          if (patient) {
            console.log('[DEBUG] Aidant', aidantId, 'associé au patient', patient.prenom, patient.nom);
            // Mettre à jour le nom du patient suivi
            this.aidantData.patientName = `${patient.prenom} ${patient.nom}`;
            this.aidantData.patientAge = this.calculateAge(patient.dateNaissance || '');
            // Charger les assignments de ce patient (l'aidant voit les mêmes tests)
            this.loadPatientAssignments(patient.id);
          }
        } else {
          // Fallback: utiliser le premier patient disponible pour la démo
          console.log('[DEBUG] Aucune assignment trouvée pour l\'aidant', aidantId, '- utilisation du premier patient');
          const firstPatient = this.patientsList()[0];
          if (firstPatient) {
            this.aidantData.patientName = `${firstPatient.prenom} ${firstPatient.nom}`;
            this.aidantData.patientAge = this.calculateAge(firstPatient.dateNaissance || '');
            this.loadPatientAssignments(firstPatient.id);
          }
        }
      },
      error: (err: any) => {
        console.error('Error finding patient for aidant', err);
        // Fallback: utiliser le premier patient
        const firstPatient = this.patientsList()[0];
        if (firstPatient) {
          this.aidantData.patientName = `${firstPatient.prenom} ${firstPatient.nom}`;
          this.loadPatientAssignments(firstPatient.id);
        }
      }
    });
  }

  // Helper pour calculer l'âge à partir de la date de naissance
  calculateAge(dateNaissance: string): number {
    if (!dateNaissance) return 75; // Valeur par défaut
    const birth = new Date(dateNaissance);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  loadPatientAssignments(patientId: number) {
    // Charger aussi les recommandations du patient
    this.loadPatientRecommendations(patientId);

    this.assignationService.getAssignationsByPatient(patientId).pipe(
      catchError(() => of([]))
    ).subscribe((realAssignments) => {
      let allAssignments = [...realAssignments];

      // Merge Mock Assignments
      const localMocks = this.mockAssignments.filter(a => Number(a.patientId) === Number(patientId));
      allAssignments = [...allAssignments, ...localMocks];

      // DEMO MAPPING: If Robert (36), also fetch Demo Data (ID 1)
      if (patientId === 36) {
        this.assignationService.getAssignationsByPatient(1).pipe(
          catchError(() => of([]))
        ).subscribe((demoData) => {
          // Ensure unique IDs (avoid duplicates if backend returns intersection)
          const existingIds = new Set(allAssignments.map(a => a.id));
          const uniqueDemoData = demoData.filter(d => !existingIds.has(d.id));

          this.patientAssignments.set([...allAssignments, ...uniqueDemoData]);
          console.log('[DEBUG] Assignations patient merged (Real+Mock+Demo):', this.patientAssignments());
        });
      } else {
        this.patientAssignments.set(allAssignments);
      }
    });
  }

  loadAidantPatientTests(aidantId: number) {
    this.assignationService.getAidantPatientTests(aidantId).pipe(
      catchError(() => of([]))
    ).subscribe((dtoList) => {
      // Mapper le DTO AidantPatientTestDto au format attendu par le template
      const mapped = dtoList.map((dto: any) => ({
        id: dto.patientId, // Utiliser patientId comme identifiant d'assignment pour l'affichage
        patientId: dto.patientId,
        patientName: dto.patientName,
        test: {
          id: dto.testId,
          titre: dto.testName,
          type: null // Le DTO ne retourne pas le type; le template gère le fallback
        },
        status: dto.status,
        dateAssignation: dto.assignedDate,
        dateLimite: null,
        instructions: null
      }));

      this.patientAssignments.set(mapped);
      console.log('[DEBUG] Assignations aidant chargées (DTO):', this.patientAssignments());

      // Mettre à jour les données affichées si le premier élément contient un nom de patient
      if (mapped.length > 0 && mapped[0].patientName) {
        this.aidantData.patientName = mapped[0].patientName;
      }

      // Charger les recommandations pour le patient de l'aidant
      if (mapped.length > 0 && mapped[0].patientId) {
        this.loadAidantRecommendations(mapped[0].patientId);
        this.aidantData.patientId = mapped[0].patientId;
      }
    });
  }

  loadTests() {
    this.cognitiveTestService.getAll().subscribe({
      next: (tests) => {
        console.log('[DEBUG] Tests chargés depuis le backend:', tests);
        this.availableTests.set(tests);
      },
      error: (err) => console.error('Error loading tests', err)
    });
  }

  loadRecentResults() {
    // Ideally we'd have a specific endpoint for "recent results" across all patients
    // For now, we'll mock it or fetch for a specific patient if we had one selected
    // But since this is a general view, we might need a new endpoint in backend or just map manually 
    // from a specific patient for demo purposes (e.g. patient 101)

    // Using Patient ID 1 (Robert) for demo purposes
    this.testResultService.getByPatient(1).subscribe({
      next: (results) => {
        const mappedResults = results.map(r => ({
          patient: 'Marie Dubois', // Mock name matching ID 101
          test: r.test?.titre || 'Test Inconnu',
          date: r.testDate,
          score: r.scoreTotale,
          duration: r.durationSeconds ? `${Math.floor(r.durationSeconds / 60)} min` : 'N/A'
        }));
        this.recentResults.set(mappedResults);
      },
      error: (err) => console.error('Error loading results', err)
    });
  }

  handleCloseModal() {
    this.showNewTestModal.set(false);
    setTimeout(() => {
      this.resetForm();
    }, 300);
  }

  resetForm() {
    this.searchQuery.set('');
    this.selectedPatientId.set(null);
    this.testStage.set(null);
    this.selectedTestType.set(null);
    this.selectedTestId.set(null);
    this.testDeadline.set('');
    this.testNotes.set('');
  }

  selectTestFromHierarchy(stageId: 'STABLE' | 'MOYEN' | 'CRITIQUE', type: string, testTitre: string) {
    this.testStage.set(stageId);
    this.selectedTestType.set(type);
    this.selectedTestId.set(testTitre);
  }

  togglePersonalizedTest(stage: 'STABLE' | 'MOYEN' | 'CRITIQUE', testName: string) {
    if (!this.selectedPatientId()) {
      alert('Veuillez d\'abord sélectionner un patient pour créer un test personnalisé.');
      return;
    }

    let type = '';
    if (testName.includes('visages')) type = 'FACES';
    else if (testName.includes('Mots croisés')) type = 'CROSSWORDS';
    else if (testName.includes('Memory')) type = 'MEMORY';
    else if (testName.includes('odeurs')) type = 'SCENTS';
    else if (testName.includes('proches')) type = 'RELATIVES';
    else if (testName.includes('Chansons')) type = 'SONGS';

    if (type) {
      const patient = this.selectedPatientData; // Getter logic
      const patientName = patient ? `${patient.prenom} ${patient.nom}` : 'Patient';

      this.router.navigate(['/personalized-test'], {
        queryParams: {
          type,
          stage,
          patientId: this.selectedPatientId(),
          patientName: patientName
        }
      });
    }
  }

  handleAidantAssignmentClick(assignment: any): void {
    if (!assignment) return;

    const status = String(assignment.status || 'ASSIGNED');
    if (status === 'COMPLETED') return;

    const patientId = assignment.patientId || this.aidantData.patientId;
    const baseQueryParams = {
      testId: assignment.test?.id,
      patientId: patientId,
      assignationId: assignment.id
    };

    // Check if this is a 5 mots test
    if (assignment.test?.titre?.toLowerCase().includes('5 mots') || assignment.test?.id === 3) {
      this.router.navigate(['/test-5mots'], { queryParams: baseQueryParams });
      return;
    }

    // Check if this is a visages test
    if (assignment.test?.titre?.toLowerCase().includes('visages') || assignment.test?.id === 4) {
      this.router.navigate(['/test-visages'], { queryParams: baseQueryParams });
      return;
    }

    // Check if this is a mots croises test
    if (assignment.test?.titre?.toLowerCase().includes('mots croises') || assignment.test?.id === 6) {
      this.router.navigate(['/test-mots-croises'], { queryParams: baseQueryParams });
      return;
    }

    // Navigate to dedicated test components with patientId/assignationId
    const testId = assignment.test?.id ?? assignment.testId;
    if (testId) {
      this.router.navigate(['/cognitive-test', testId], { queryParams: { patientId, assignationId: assignment.id } });
      return;
    }

    // Fallback sur l'ancien mapping par type si pas d'ID disponible
    const type = String(assignment.test?.type || 'MEMORY');
    const route = this.mapAidantTestTypeToRoute(type);
    if (route) {
      this.router.navigate([route], { queryParams: { patientId, assignationId: assignment.id } });
      return;
    }

    alert(`Ce test (${type}) n'est pas encore relié à un écran de test.`);
  }

  private mapAidantTestTypeToRoute(type: string): string | null {
    switch (type) {
      case 'MEMORY':
        return '/test-memoire';
      case 'LANGUAGE':
        return '/test-language';
      default:
        return null;
    }
  }

  selectPatient(patient: PatientDTO) {
    this.selectedPatientId.set(patient.id.toString());
    this.searchQuery.set(`${patient.prenom} ${patient.nom}`);
  }

  handleAssignTest() {
    if (this.isFormValid()) {
      const selectedTest = this.availableTests().find(t => t.titre === this.selectedTestId());

      if (!selectedTest?.id) return;

      // Récupérer le patient sélectionné pour trouver son médecin
      const selectedPatient = this.selectedPatientData;
      let soignantId = 16; // Fallback

      if (selectedPatient && (selectedPatient as any).medecin) {
        soignantId = (selectedPatient as any).medecin.id;
        console.log('[DEBUG] Using patient medecinId:', soignantId);
      }

      // Trouver l'aidant associé au patient sélectionné
      const patientIdNum = Number(this.selectedPatientId());
      const aidant = this.aidantsList().find((a: any) => a.patientId === patientIdNum);

      const request: AssignationRequest = {
        patientId: patientIdNum,
        testId: selectedTest.id,
        soignantId: soignantId,
        accompagnantId: aidant ? aidant.id : undefined,
        dateLimite: this.testDeadline(),
        instructions: this.testNotes()
      };

      console.log('[DEBUG] Sending AssignationRequest:', request);

      this.assignationService.createAssignation(request).subscribe({
        next: (res) => {
          console.log('Test assigned successfully:', res);
          this.handleCloseModal();
          this.loadDoctorAssignments(); // Refresh the assignments list
          // If we are currently viewing this patient as Patient, refresh patient view
          if (this.selectedPatientForDashboard()?.id === request.patientId) {
            this.loadPatientAssignments(request.patientId);
          }
        },
        error: (err) => {
          console.warn('Backend error (Simulation Mode Activated):', err);

          // Create Mock Assignment
          const mockAssign = {
            id: Date.now(), // Generate fake ID
            patientId: request.patientId,
            test: selectedTest,
            soignantId: request.soignantId,
            dateAssignation: new Date().toISOString(),
            dateLimite: request.dateLimite ? new Date(request.dateLimite).toISOString() : null,
            instructions: request.instructions,
            status: 'ASSIGNED'
          };

          this.mockAssignments.push(mockAssign);
          localStorage.setItem('mockAssignments', JSON.stringify(this.mockAssignments));

          // Show Success Feedback
          alert('Test assigné avec succès (Mode Démo - Sauvegardé localement)');

          this.handleCloseModal();
          this.loadDoctorAssignments(); // Show in doctor list

          // Refresh Patient View if active
          if (this.selectedPatientForDashboard()?.id === request.patientId) {
            this.loadPatientAssignments(request.patientId);
          }
        }
      });
    }
  }

  // ════════════════════════════════════════════════════════════
  //  RECOMMANDATIONS — MÉDECIN
  // ════════════════════════════════════════════════════════════

  /**
   * Ouvre la modale de création de recommandation (vue médecin).
   * Le clinicianId est récupéré depuis le signal doctorId.
   */
  openNewRecommendationDialog(): void {
    const clinicianId = this.doctorId();
    if (!clinicianId) {
      alert('Identifiant médecin non disponible. Veuillez actualiser la page.');
      return;
    }

    const dialogRef = this.dialog.open(NewRecommendationModalComponent, {
      width: '620px',
      maxWidth: '95vw',
      disableClose: false,
      data: {
        clinicianId,
        clinicianName: 'Dr. Médecin'
      },
      panelClass: 'recommendation-dialog',
      backdropClass: 'recommendation-dialog-backdrop'
    });

    dialogRef.afterClosed().subscribe((newRec: Recommendation | undefined) => {
      if (newRec) {
        // Ajouter la nouvelle recommandation en tête de liste avec badge "NOUVEAU"
        const enriched = { ...newRec, isNew: true };
        this.doctorRecommendations.update(recs => [enriched, ...recs]);
      }
    });
  }

  /**
   * Charge les recommandations créées par le médecin.
   */
  loadDoctorRecommendations(clinicianId: number): void {
    this.recommendationService.getByClinicianId(clinicianId).subscribe({
      next: (recs) => {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const enriched = recs.map(r => ({
          ...r,
          isNew: r.createdAt ? new Date(r.createdAt) > oneDayAgo : false
        }));
        this.doctorRecommendations.set(enriched);
      },
      error: (err) => console.error('[Recommandations Médecin] Erreur de chargement:', err)
    });
    // Charger rendez-vous et démarrer rappels (médecin aussi)
    this.loadAppointments();
    this.startReminderPolling();
  }

  // ════════════════════════════════════════════════════════════
  //  RECOMMANDATIONS — AIDANT
  // ════════════════════════════════════════════════════════════

  /**
   * Charge les recommandations destinées à l'aidant pour un patient donné.
   */
  loadAidantRecommendations(patientId: number): void {
    this.recommendationService.getByPatientId(patientId).subscribe({
      next: (recs) => {
        this.checkAndNotifyNewRecs(recs);
        this.aidantRecommendations.set(recs);
        this.startNotifPolling(patientId);
      },
      error: (err) => console.error('[Recommandations Aidant] Erreur de chargement:', err)
    });
    // Étape 19 — charger les décisions associées au patient
    this.decisionService.getByPatient(patientId).subscribe({
      next: (decisions) => this.patientDecisions.set(decisions),
      error: () => this.patientDecisions.set([])
    });
    // Étape 20 — charger les messages localStorage
    this.loadAllRecMessages();
    // Médecin — charger les IDs lus et démarrer le polling messages
    this.loadDoctorReadIds();
    this.startDoctorMsgPolling();
    // Étapes 21-23 — polling appel entrant + rappels
    this.startAidantCallPolling();
    this.loadAppointments();
    this.startReminderPolling();
  }

  // ════════════════════════════════════════════════════════════
  //  RECOMMANDATIONS — PATIENT
  // ════════════════════════════════════════════════════════════

  /**
   * Charge les recommandations d'un patient (vue patient).
   */
  loadPatientRecommendations(patientId: number): void {
    this.recommendationService.getByPatientId(patientId).subscribe({
      next: (recs) => this.patientRecommendations.set(recs),
      error: (err) => console.error('[Recommandations Patient] Erreur de chargement:', err)
    });
  }

  // ════════════════════════════════════════════════════════════
  //  RECOMMANDATIONS — TOUS LES AIDANTS
  // ════════════════════════════════════════════════════════════

  /**
   * Charge les recommandations pour tous les aidants
   */
  loadAllAidantsRecommendations(): void {
    const aidants = this.aidantsList();
    const patientsData = this.patientsWithAidants();
    
    if (aidants.length === 0) {
      console.log('[DEBUG] Aucun aidant pour charger les recommandations');
      this.allAidantsRecommendations.set(new Map());
      return;
    }

    const map = new Map<number, Recommendation[]>();
    let loadedCount = 0;

    aidants.forEach(aidant => {
      // Trouver le patient associé à cet aidant
      let patientId: number | null = null;
      
      // Chercher dans patientsWithAidants
      for (const patientData of patientsData) {
        if (patientData.aidants && patientData.aidants.some((a: any) => a.id === aidant.id)) {
          patientId = patientData.id;
          break;
        }
      }
      
      // Fallback si pas trouvé dans patientsWithAidants
      if (!patientId) {
        // Essayer les propriétés directes de l'aidant
        patientId = (aidant as any).patientId || (aidant as any).patient?.id;
      }
      
      if (!patientId) {
        console.warn(`[DEBUG] Pas de patient trouvé pour aidant ${aidant.id}, patientId: ${patientId}`);
        map.set(aidant.id, []);
        loadedCount++;
        
        if (loadedCount === aidants.length) {
          this.allAidantsRecommendations.set(map);
          console.log('[DEBUG] Toutes les recommandations des aidants chargées:', map);
        }
        return;
      }
      
      this.recommendationService.getByPatientId(patientId).subscribe({
        next: (recs) => {
          map.set(aidant.id, recs);
          loadedCount++;
          console.log(`[DEBUG] Recommandations chargées pour aidant ${aidant.id} (patient ${patientId}):`, recs.length);
          
          // Mettre à jour le signal quand tous les aidants sont chargés
          if (loadedCount === aidants.length) {
            this.allAidantsRecommendations.set(map);
            console.log('[DEBUG] Toutes les recommandations des aidants chargées:', map);
          }
        },
        error: (err) => {
          console.error(`[DEBUG] Erreur chargement recommandations aidant ${aidant.id} (patient ${patientId}):`, err);
          map.set(aidant.id, []);
          loadedCount++;
          
          if (loadedCount === aidants.length) {
            this.allAidantsRecommendations.set(map);
          }
        }
      });
    });
  }

  /**
   * Récupère les recommandations pour un aidant spécifique
   */
  getAidantRecommendations(aidantId: number): Recommendation[] {
    return this.allAidantsRecommendations().get(aidantId) || [];
  }

  /**
   * Charge les recommandations et notifications pour un aidant spécifique (via queryParams)
   */
  loadAidantDataByIdFromParams(aidantId: number): void {
    console.log('[DEBUG] loadAidantDataByIdFromParams called for aidantId:', aidantId);
    
    const patientsData = this.patientsWithAidants();
    
    // Trouver le patient associé à cet aidant
    let patientId: number | null = null;
    let patientData: any = null;
    
    for (const patient of patientsData) {
      if (patient.aidants && patient.aidants.some((a: any) => a.id === aidantId)) {
        patientId = patient.id;
        patientData = patient;
        break;
      }
    }
    
    if (!patientId) {
      console.warn(`[DEBUG] Pas de patient trouvé pour aidant ${aidantId}`);
      return;
    }
    
    console.log(`[DEBUG] Patient trouvé pour aidant ${aidantId}: patient ${patientId}`);
    
    // Charger les recommandations pour ce patient
    this.recommendationService.getByPatientId(patientId).subscribe({
      next: (recs) => {
        this.aidantRecommendations.set(recs);
        console.log(`[DEBUG] ${recs.length} recommandations chargées pour aidant ${aidantId}`);
        
        // Vérifier les nouvelles recommandations et afficher les notifications
        this.checkAndNotifyNewRecs(recs);
        
        // Démarrer le polling de notifications
        this.startNotifPolling(patientId);
      },
      error: (err) => {
        console.error(`[DEBUG] Erreur chargement recommandations pour aidant ${aidantId}:`, err);
        this.aidantRecommendations.set([]);
      }
    });
    
    // Charger les décisions associées au patient
    this.decisionService.getByPatient(patientId).subscribe({
      next: (decisions) => {
        this.patientDecisions.set(decisions);
        console.log(`[DEBUG] ${decisions.length} décisions chargées pour aidant ${aidantId}`);
      },
      error: () => this.patientDecisions.set([])
    });
    
    // Charger les messages de cette recommandation
    this.loadAllRecMessages();
    
    // Démarrer le polling des messages
    this.startDoctorMsgPolling();
    
    // Démarrer les autres services
    this.startAidantCallPolling();
    this.loadAppointments();
    this.startReminderPolling();
  }

  // ════════════════════════════════════════════════════════════
  //  UTILITAIRES PRIORITÉ / STATUT
  // ════════════════════════════════════════════════════════════

  getPriorityLabel(priority: PriorityLevel): string {
    switch (priority) {
      case PriorityLevel.LOW:    return 'Basse';
      case PriorityLevel.MEDIUM: return 'Moyenne';
      case PriorityLevel.HIGH:   return 'Haute';
      case PriorityLevel.URGENT: return 'Urgente';
      default: return 'Inconnue';
    }
  }

  getPriorityEmoji(priority: PriorityLevel): string {
    switch (priority) {
      case PriorityLevel.LOW:    return '🟢';
      case PriorityLevel.MEDIUM: return '🟡';
      case PriorityLevel.HIGH:   return '🟠';
      case PriorityLevel.URGENT: return '🔴';
      default: return '⚪';
    }
  }

  getPriorityColor(priority: PriorityLevel): string {
    switch (priority) {
      case PriorityLevel.LOW:    return '#4caf50';
      case PriorityLevel.MEDIUM: return '#ffc107';
      case PriorityLevel.HIGH:   return '#ff9800';
      case PriorityLevel.URGENT: return '#f44336';
      default: return '#9e9e9e';
    }
  }

  getStatusLabel(status: RecommendStatus): string {
    switch (status) {
      case RecommendStatus.PENDING:     return 'En attente';
      case RecommendStatus.IN_PROGRESS: return 'En cours';
      case RecommendStatus.COMPLETED:   return 'Terminée';
      case RecommendStatus.DISMISSED:   return 'Ignorée';
      default: return 'Inconnu';
    }
  }

  getStatusColor(status: RecommendStatus): string {
    switch (status) {
      case RecommendStatus.PENDING:     return '#2196f3';
      case RecommendStatus.IN_PROGRESS: return '#ff9800';
      case RecommendStatus.COMPLETED:   return '#4caf50';
      case RecommendStatus.DISMISSED:   return '#9e9e9e';
      default: return '#666';
    }
  }

  formatDeadlineText(deadline: string | undefined): string {
    if (!deadline) return '';
    const info = this.recommendationService.getTimeStrings(deadline);
    const formatted = this.recommendationService.formatDeadline(deadline);
    return `${formatted}  (${info.text})`;
  }

  getRecommendationUrgentCount(): number {
    return this.doctorRecommendations().filter(r => r.priority === PriorityLevel.URGENT).length;
  }

  getRecommendationPendingCount(): number {
    return this.doctorRecommendations().filter(r => r.status === RecommendStatus.PENDING).length;
  }

  // ════════════════════════════════════════════════════════════
  //  INTERFACE AIDANT — RECOMMANDATIONS (Étapes 11-14)
  // ════════════════════════════════════════════════════════════

  /** Compteurs par statut */
  pendingRecsCount():     number { return this.aidantRecommendations().filter(r => r.status === RecommendStatus.PENDING).length; }
  inProgressRecsCount():  number { return this.aidantRecommendations().filter(r => r.status === RecommendStatus.IN_PROGRESS).length; }
  completedRecsCount():   number { return this.aidantRecommendations().filter(r => r.status === RecommendStatus.COMPLETED).length; }
  dismissedRecsCount():   number { return this.aidantRecommendations().filter(r => r.status === RecommendStatus.DISMISSED).length; }

  /** Tri par priorité (URGENT→HIGH→MEDIUM→LOW) puis par deadline croissante */
  private priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  getSortedAidantRecs(): Recommendation[] {
    return [...this.aidantRecommendations()]
      .filter(r => r.status !== RecommendStatus.COMPLETED && r.status !== RecommendStatus.DISMISSED)
      .sort((a, b) => {
        const pDiff = (this.priorityOrder[a.priority] ?? 9) - (this.priorityOrder[b.priority] ?? 9);
        if (pDiff !== 0) return pDiff;
        return new Date(a.deadline ?? 0).getTime() - new Date(b.deadline ?? 0).getTime();
      });
  }

  getFilteredAidantRecs(): Recommendation[] {
    const statusFilter = this.aidantStatusFilter();
    const search = this.aidantSearchQuery().toLowerCase().trim();
    const priority = this.aidantPriorityFilter();

    let recs: Recommendation[];
    if (statusFilter === RecommendStatus.COMPLETED || statusFilter === RecommendStatus.DISMISSED) {
      recs = this.aidantRecommendations()
        .filter(r => r.status === statusFilter)
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    } else {
      recs = this.getSortedAidantRecs();
      if (statusFilter) recs = recs.filter(r => r.status === statusFilter);
    }
    if (search) {
      recs = recs.filter(r =>
        r.action.toLowerCase().includes(search) ||
        (r.notes || '').toLowerCase().includes(search)
      );
    }
    if (priority) {
      recs = recs.filter(r => r.priority === priority);
    }
    return recs;
  }

  getPaginatedAidantRecs(): Recommendation[] {
    const page = this.aidantRecPage();
    const all = this.getFilteredAidantRecs();
    return all.slice(0, page * this.REC_PAGE_SIZE);
  }

  hasMoreRecs(): boolean {
    return this.getFilteredAidantRecs().length > this.aidantRecPage() * this.REC_PAGE_SIZE;
  }

  loadMoreRecs(): void { this.aidantRecPage.update(p => p + 1); }

  /** Liste historique (COMPLETED + DISMISSED) */
  getHistoryRecs(): Recommendation[] {
    return [...this.aidantRecommendations()]
      .filter(r => r.status === RecommendStatus.COMPLETED || r.status === RecommendStatus.DISMISSED)
      .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime());
  }

  /** Top 3 urgentes/haute priorité pour la vue Accueil */
  getTopUrgentRecs(): Recommendation[] {
    return this.getSortedAidantRecs().slice(0, 3);
  }

  /** Ouvrir le détail d'une recommandation */
  openRecDetail(rec: Recommendation): void {
    this.aidantSelectedRec.set(rec);
    this.aidantRecNotesDraft.set(rec.notes ?? '');
    this.aidantRecNotesEditing.set(false);
  }

  closeRecDetail(): void {
    this.aidantSelectedRec.set(null);
    this.aidantRecNotesEditing.set(false);
  }

  /** Mettre à jour le statut d'une recommandation */
  updateAidantRecStatus(rec: Recommendation, newStatus: RecommendStatus): void {
    this.recommendationService.updateStatus(rec.id!, newStatus).subscribe({
      next: (updated) => {
        const recs = this.aidantRecommendations().map(r => r.id === updated.id ? updated : r);
        this.aidantRecommendations.set(recs);
        if (this.aidantSelectedRec()?.id === updated.id) this.aidantSelectedRec.set(updated);
      },
      error: (err) => console.error('[RecStatus] Erreur:', err)
    });
  }

  /** Sauvegarder les notes personnelles de l'aidant */
  saveAidantRecNotes(rec: Recommendation): void {
    const notes = this.aidantRecNotesDraft();
    this.recommendationService.update(rec.id!, { notes }).subscribe({
      next: (updated) => {
        const recs = this.aidantRecommendations().map(r => r.id === updated.id ? updated : r);
        this.aidantRecommendations.set(recs);
        this.aidantSelectedRec.set(updated);
        this.aidantRecNotesEditing.set(false);
      },
      error: (err) => console.error('[RecNotes] Erreur:', err)
    });
  }

  /** Statut de la deadline : overdue / today / soon / normal */
  getDeadlineStatus(deadline: string | undefined): 'overdue' | 'today' | 'soon' | 'normal' {
    if (!deadline) return 'normal';
    const dl = new Date(deadline);
    const now = new Date();
    if (dl < now) return 'overdue';
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dlDate = new Date(dl.getFullYear(), dl.getMonth(), dl.getDate());
    if (dlDate.getTime() === today.getTime()) return 'today';
    const diffDays = (dlDate.getTime() - today.getTime()) / 86400000;
    return diffDays <= 2 ? 'soon' : 'normal';
  }

  /** Texte deadline formatté avec indicateur couleur */
  getDeadlineDisplay(deadline: string | undefined): string {
    if (!deadline) return 'Pas de date limite';
    const dl = new Date(deadline);
    const status = this.getDeadlineStatus(deadline);
    const formatted = dl.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    + ' ' + dl.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const info = this.recommendationService.getTimeStrings(deadline);
    if (status === 'overdue') return `⚠️ RETARD — ${formatted} (${info.text})`;
    if (status === 'today')   return `⏰ Aujourd'hui — ${formatted}`;
    return `Date limite : ${formatted} (${info.text})`;
  }

  /** Initiales du nom patient */
  getPatientInitials(name: string): string {
    return (name || '?').split(' ').map((n: string) => n[0] || '').join('').toUpperCase().slice(0, 2);
  }

  /** Sélectionner un filtre statut (toggle) */
  toggleStatusFilter(status: RecommendStatus): void {
    const current = this.aidantStatusFilter();
    this.aidantStatusFilter.set(current === status ? null : status);
    this.aidantRecPage.set(1);
    this.aidantSelectedRec.set(null);
  }

  /** Naviguer vers un tab aidant */
  goToAidantTab(tab: 'accueil' | 'recommandations' | 'historique' | 'profil'): void {
    this.aidantActiveTab.set(tab);
    this.aidantSelectedRec.set(null);
    this.aidantStatusFilter.set(null);
    this.aidantRecPage.set(1);
  }

  openCalendar() {
    const role = this.selectedRole();
    if (role === 'medecin') {
      this.router.navigate(['/calendar'], { queryParams: { medecinId: 16 } });
    } else if (role === 'patient') {
      const patientId = this.selectedPatientForDashboard()?.id;
      if (patientId) {
        this.router.navigate(['/calendar'], { queryParams: { patientId: patientId } });
      }
    } else if (role === 'aidant') {
      const aidantId = this.activeAidantId();
      if (aidantId) {
        this.router.navigate(['/calendar'], { queryParams: { aidantId: aidantId } });
      }
    } else {
      this.router.navigate(['/calendar']);
    }
  }

  // ════════════════════════════════════════════════════════════
  //  ÉTAPE 15 — CONFIRMATION DE CHANGEMENT DE STATUT
  // ════════════════════════════════════════════════════════════

  /** Demande de changement de statut avec confirmation */
  requestStatusChange(rec: Recommendation, newStatus: RecommendStatus): void {
    if (newStatus === RecommendStatus.DISMISSED) {
      this.requestDismiss(rec);
      return;
    }
    const cfgs: Record<string, { title: string; message: string; confirmLabel: string; confirmClass: string }> = {
      [RecommendStatus.IN_PROGRESS]: {
        title: 'Commencer cette recommandation ?',
        message: `Confirmez-vous avoir commencé à travailler sur :\n« ${rec.action} » ?`,
        confirmLabel: '▶ Oui, commencer',
        confirmClass: 'inprogress'
      },
      [RecommendStatus.COMPLETED]: {
        title: 'Marquer comme terminée ?',
        message: `Cette action marque la recommandation comme accomplie :\n« ${rec.action} »\nConfirmez-vous ?`,
        confirmLabel: '✅ Oui, c\'est terminé',
        confirmClass: 'completed'
      },
      [RecommendStatus.PENDING]: {
        title: 'Réouvrir la recommandation ?',
        message: `Voulez-vous réactiver :\n« ${rec.action} » ?`,
        confirmLabel: '↺ Réouvrir',
        confirmClass: 'reopen'
      }
    };
    const cfg = cfgs[newStatus];
    if (!cfg) return;
    this.confirmConfig.set({ ...cfg, onConfirm: () => this.executeStatusChange(rec, newStatus) });
    this.showConfirmModal.set(true);
  }

  /** Ouvrir le modal de motif pour DISMISSED */
  requestDismiss(rec: Recommendation): void {
    this.dismissTargetRec.set(rec);
    this.dismissReason.set('');
    this.dismissCustomNote.set('');
    this.showDismissModal.set(true);
  }

  /** Confirmer l'ignorance avec motif */
  confirmDismiss(): void {
    const rec = this.dismissTargetRec();
    const reason = this.dismissReason();
    if (!rec || !reason) return;
    const finalNote = reason === 'Autre (préciser)'
      ? (this.dismissCustomNote().trim() || 'Autre')
      : reason;
    this.showDismissModal.set(false);
    this.recommendationService.update(rec.id!, { notes: finalNote }).pipe(
      switchMap(() => this.recommendationService.updateStatus(rec.id!, RecommendStatus.DISMISSED))
    ).subscribe({
      next: (updated) => {
        const recs = this.aidantRecommendations().map(r =>
          r.id === updated.id ? { ...updated, notes: finalNote } : r
        );
        this.aidantRecommendations.set(recs);
        if (this.aidantSelectedRec()?.id === updated.id) {
          this.aidantSelectedRec.set({ ...updated, notes: finalNote });
        }
        this.dismissTargetRec.set(null);
      },
      error: (err) => console.error('[Dismiss] Erreur:', err)
    });
  }

  /** Exécuter le changement après confirmation */
  executeStatusChange(rec: Recommendation, newStatus: RecommendStatus): void {
    this.showConfirmModal.set(false);
    this.updateAidantRecStatus(rec, newStatus);
  }

  // ════════════════════════════════════════════════════════════
  //  ÉTAPE 16 — RÉINITIALISATION DES FILTRES
  // ════════════════════════════════════════════════════════════

  resetAllFilters(): void {
    this.aidantSearchQuery.set('');
    this.aidantStatusFilter.set(null);
    this.aidantPriorityFilter.set(null);
    this.aidantRecPage.set(1);
    this.aidantSelectedRec.set(null);
  }

  hasActiveFilters(): boolean {
    return !!(this.aidantSearchQuery() || this.aidantStatusFilter() || this.aidantPriorityFilter());
  }

  // ════════════════════════════════════════════════════════════
  //  ÉTAPE 17 — NOTIFICATIONS EN TEMPS RÉEL
  // ════════════════════════════════════════════════════════════

  /** Vérifie les nouvelles recommandations et déclenche les notifications */
  checkAndNotifyNewRecs(newRecs: Recommendation[]): void {
    if (this.seenRecIds.size === 0) {
      // Premier chargement : marquer tout comme vu, pas de notification
      newRecs.forEach(r => { if (r.id) this.seenRecIds.add(r.id); });
      return;
    }
    newRecs
      .filter(r => r.id && !this.seenRecIds.has(r.id) && r.status === RecommendStatus.PENDING)
      .forEach(r => {
        if (r.id) this.seenRecIds.add(r.id);
        this.triggerNotification(r);
      });
  }

  /** Déclenche la notification selon la priorité */
  triggerNotification(rec: Recommendation): void {
    switch (rec.priority) {
      case PriorityLevel.URGENT:
        this.urgentPopupRec.set(rec);
        this.playAlertSound();
        break;
      case PriorityLevel.HIGH:
        this.addToast(rec, 10000);
        break;
      case PriorityLevel.MEDIUM:
        this.addToast(rec, 5000);
        break;
      // LOW : le badge s'incrémente automatiquement via pendingRecsCount()
    }
  }

  /** Ajoute un toast et le supprime après `duration` ms */
  addToast(rec: Recommendation, duration: number): void {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timeout = setTimeout(() => this.removeToast(id), duration);
    this.aidantToasts.update(list => [...list, { id, rec, timeout }]);
  }

  removeToast(id: string): void {
    const toast = this.aidantToasts().find(t => t.id === id);
    if (toast?.timeout) clearTimeout(toast.timeout);
    this.aidantToasts.update(list => list.filter(t => t.id !== id));
  }

  /** Bip d'alerte via Web Audio API (2 bips courts) */
  playAlertSound(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      [0, 0.35].forEach(offset => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.28, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.28);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.28);
      });
    } catch (_) { /* AudioContext non disponible */ }
  }

  /** Démarre le polling toutes les 30 s pour détecter les nouvelles recommandations */
  startNotifPolling(patientId: number): void {
    if (this.notifPollingTimer) return;
    this.notifPollingTimer = setInterval(() => {
      this.recommendationService.getByPatientId(patientId).subscribe({
        next: (recs) => {
          this.checkAndNotifyNewRecs(recs);
          this.aidantRecommendations.set(recs);
        }
      });
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.notifPollingTimer) clearInterval(this.notifPollingTimer);
    if (this.doctorMsgPollingTimer) clearInterval(this.doctorMsgPollingTimer);
    if (this.callStatePollingTimer) clearInterval(this.callStatePollingTimer);
    if (this.aidantCallPollingTimer) clearInterval(this.aidantCallPollingTimer);
    if (this.reminderPollingTimer) clearInterval(this.reminderPollingTimer);
    this.doctorCamStream()?.getTracks().forEach(t => t.stop());
    this.aidantCamStream()?.getTracks().forEach(t => t.stop());
    this.aidantToasts().forEach(t => { if (t.timeout) clearTimeout(t.timeout); });
  }

  // ════════════════════════════════════════════════════════════
  //  ÉTAPE 18 — HISTORIQUE AVANCÉ
  // ════════════════════════════════════════════════════════════

  /** Historique filtré par période et statut */
  getFilteredHistoryRecs(): Recommendation[] {
    const period = this.histPeriodFilter();
    const status = this.histStatusFilter();
    const now = new Date();
    let recs = this.aidantRecommendations().filter(r =>
      r.status === RecommendStatus.COMPLETED || r.status === RecommendStatus.DISMISSED
    );
    // Filtre statut
    if (status === 'completed') recs = recs.filter(r => r.status === RecommendStatus.COMPLETED);
    if (status === 'dismissed') recs = recs.filter(r => r.status === RecommendStatus.DISMISSED);
    // Filtre période
    if (period !== 'all') {
      const cutoff = new Date(now);
      if (period === 'week')  cutoff.setDate(now.getDate() - 7);
      if (period === 'month') cutoff.setMonth(now.getMonth() - 1);
      if (period === 'year')  cutoff.setFullYear(now.getFullYear() - 1);
      recs = recs.filter(r => {
        const date = new Date(r.updatedAt || r.createdAt || 0);
        return date >= cutoff;
      });
    }
    return recs.sort((a, b) =>
      new Date(b.updatedAt || b.createdAt || 0).getTime() -
      new Date(a.updatedAt || a.createdAt || 0).getTime()
    );
  }

  openArchiveDetail(rec: Recommendation): void {
    this.archiveDetailRec.set(rec);
    this.showArchiveDetailModal.set(true);
  }

  /** Export CSV de l'historique filtré */
  exportHistoryCSV(): void {
    const recs = this.getFilteredHistoryRecs();
    const BOM = '\uFEFF';
    const headers = ['Action', 'Priorité', 'Statut', 'Prescrit le', 'Réalisé le', 'Notes'];
    const rows = recs.map(r => [
      `"${(r.action || '').replace(/"/g, '""')}"`,
      r.priority,
      r.status === RecommendStatus.COMPLETED ? 'Terminée' : 'Ignorée',
      r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : '',
      (r.completedAt || r.updatedAt) ? new Date(r.completedAt || r.updatedAt!).toLocaleDateString('fr-FR') : '',
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ]);
    const csv = BOM + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.notifService.showSuccess('Historique exporté en CSV');
  }

  /** Impression / PDF natif */
  printHistory(): void {
    window.print();
  }

  // ════════════════════════════════════════════════════════════
  //  ÉTAPE 19 — DÉCISIONS MÉDICALES (vue simplifiée)
  // ════════════════════════════════════════════════════════════

  /** Trouve la décision liée à une recommandation */
  getDecisionForRec(rec: Recommendation): Decision | null {
    if (!rec.decisionId) return null;
    return this.patientDecisions().find(d => d.id === rec.decisionId) ?? null;
  }

  /** Libellé lisible du niveau de risque */
  getRiskLabel(level: string | undefined): string {
    switch (level) {
      case 'FAIBLE':   return 'Risque faible';
      case 'MOYEN':    return 'Risque modéré';
      case 'ELEVE':    return 'Risque élevé';
      case 'CRITIQUE': return 'Risque critique';
      default:         return 'Non évalué';
    }
  }

  /** Couleur du niveau de risque */
  getRiskColor(level: string | undefined): string {
    switch (level) {
      case 'FAIBLE':   return '#00635D';
      case 'MOYEN':    return '#E6A800';
      case 'ELEVE':    return '#e65100';
      case 'CRITIQUE': return '#CB1527';
      default:         return '#9CA3AF';
    }
  }

  /** Libellé lisible du type de décision */
  getDecisionTypeLabel(type: DecisionType | undefined): string {
    switch (type) {
      case DecisionType.SURVEILLANCE:  return 'Surveillance cognitive';
      case DecisionType.ALERTE:        return 'Alerte — suivi renforcé';
      case DecisionType.CONSULTATION:  return 'Consultation recommandée';
      case DecisionType.URGENCE:       return 'Urgence médicale';
      default:                         return 'Évaluation';
    }
  }

  /** Libellé lisible du type de test */
  getTestTypeLabel(type: TypeTestEnum | undefined): string {
    switch (type) {
      case TypeTestEnum.MEMORY:    return 'Mémoire';
      case TypeTestEnum.LANGUAGE:  return 'Langage';
      case TypeTestEnum.REFLECTION:return 'Réflexion cognitive';
      case TypeTestEnum.CONFUSION: return 'Évaluation de confusion';
      default:                     return 'Test cognitif';
    }
  }

  // ════════════════════════════════════════════════════════════
  //  ÉTAPE 20 — COMMUNICATION AIDANT ↔ MÉDECIN (Backend-integrated)
  // ════════════════════════════════════════════════════════════

  /** Charge tous les messages des recommandations depuis le backend */
  loadAllRecMessages(): void {
    const recs = this.selectedRole() === 'aidant' 
      ? this.aidantRecommendations() 
      : this.doctorRecommendations();
    
    if (recs.length === 0) {
      this.contactMessages.set([]);
      return;
    }

    // Charger les messages pour chaque recommandation
    let allMessages: any[] = [];
    let loadedCount = 0;

    recs.forEach(rec => {
      if (rec.id) {
        // RecMessageService not available - messaging feature pending
        loadedCount++;
        if (loadedCount === recs.length) {
          this.contactMessages.set(allMessages as any);
        }
      }
    });
  }

  /** Messages pour une recommandation donnée */
  getMessagesForRec(recId: number): any[] {
    return (this.contactMessages() as any[]).filter((m: any) => m.recId === recId);
  }

  /** Nombre de messages non lus du médecin */
  unreadDoctorCount(recId: number): number {
    return (this.contactMessages() as any[]).filter(
      (m: any) => m.recId === recId && m.from === 'MEDECIN' && !m.read
    ).length;
  }

  /** Ouvre le modal de contact pré-rempli */
  openContactModal(rec: Recommendation): void {
    this.contactTargetRec.set(rec);
    this.contactMessage.set(`À propos de la recommandation :\n« ${rec.action} »\n\n`);
    this.contactPriority.set('NORMALE');
    this.showContactModal.set(false); // reset first
    setTimeout(() => this.showContactModal.set(true), 0);
  }

  /** Envoie le message au backend */
  sendContactMessage(): void {
    const rec = this.contactTargetRec();
    const text = this.contactMessage().trim();
    if (!rec?.id || !text) return;

    const currentUser = this.authService.getUser();
    const senderType = this.selectedRole() === 'aidant' ? 'AIDANT' : 'MEDECIN';

    // RecMessageService not available - messaging feature pending
    this.notifService.showInfo('Fonction de messagerie en développement');
    this.showContactModal.set(false);
    this.contactMessage.set('');
  }

  /** Ouvre la conversation d'une recommandation */
  openConversation(rec: Recommendation): void {
    if (!rec.id) return;

    // Marquer les messages du médecin comme lus
    const senderType = this.selectedRole() === 'aidant' ? 'MEDECIN' : 'AIDANT';
    const currentUser = this.authService.getUser();

    // RecMessageService not available - messaging feature pending
    this.conversationTargetRec.set(rec);
    this.showConversationModal.set(true);
  }

  // ════════════════════════════════════════════════════════════
  //  INTERFACE MESSAGERIE MÉDECIN (Backend-integrated)
  // ════════════════════════════════════════════════════════════

  /** Charge les messages non lus pour le médecin */
  loadDoctorReadIds(): void {
    // Les messages marqués comme lus sont maintenant gérés par le backend
    // Cette méthode n'est plus nécessaire mais conservée pour compatibilité
  }

  /** Messages d'une recommandation (vue médecin) */
  getDoctorMessages(recId: number): any[] {
    return (this.contactMessages() as any[]).filter((m: any) => m.recId === recId);
  }

  /** Nombre de messages de l'aidant non lus par le médecin */
  getDoctorUnread(recId: number): number {
    return (this.contactMessages() as any[]).filter(
      (m: any) => m.recId === recId && m.from === 'AIDANT' && !m.read
    ).length;
  }

  /** Total non lus sur toutes les recommandations médecin */
  getTotalDoctorUnread(): number {
    return (this.contactMessages() as any[]).filter(
      (m: any) => m.from === 'AIDANT' && !m.read
    ).length;
  }

  /** Recommandations médecin ayant au moins un message */
  getRecsWithMessages(): Recommendation[] {
    return this.doctorRecommendations().filter(rec =>
      rec.id ? this.getDoctorMessages(rec.id).length > 0 : false
    );
  }

  /** Ouvre la conversation d'une recommandation (vue médecin) */
  openDoctorConversation(rec: Recommendation): void {
    if (!rec.id) return;

    const currentUser = this.authService.getUser();
    
    // RecMessageService not available - messaging feature pending
    this.doctorConvRec.set(rec);
    this.doctorReplyText.set('');
    this.doctorReplyPriority.set('NORMALE');
    this.showDoctorConvModal.set(true);
  }

  /** Envoie une réponse du médecin au backend */
  sendDoctorReply(): void {
    const rec = this.doctorConvRec();
    const text = this.doctorReplyText().trim();
    if (!rec?.id || !text) return;

    // RecMessageService not available - messaging feature pending
    this.notifService.showInfo('Fonction de messagerie en développement');
    this.doctorReplyText.set('');
  }

  /** Démarre le polling médecin (30s) pour détecter les nouveaux messages de l'aidant */
  startDoctorMsgPolling(): void {
    if (this.doctorMsgPollingTimer) return;
    this.doctorMsgPollingTimer = setInterval(() => {
      const prev = this.getTotalDoctorUnread();
      this.loadAllRecMessages();
      const next = this.getTotalDoctorUnread();
      if (next > prev) {
        this.notifService.showInfo(`💬 ${next - prev} nouveau(x) message(s) de l'aidant`);
      }
    }, 30000);
  }

  // ════════════════════════════════════════════════════════════
  //  ÉTAPES 21-22 — CONSULTATION VIDÉO
  // ════════════════════════════════════════════════════════════

  private readonly CALL_STATE_KEY  = 'memoria_video_call';
  private readonly APPOINTMENTS_KEY = 'memoria_appointments';

  // ── Médecin : initier l'appel ─────────────────────────────────────────

  // ════════════════════════════════════════════════════════════
  //  CARTES PATIENTS — SCROLL HORIZONTAL
  // ════════════════════════════════════════════════════════════

  /** Retourne la liste des patients avec leur aidant et stage calculé */
  getPairedPatients(): Array<{ patient: PatientDTO; aidant: AccompagnantDTO | null; stage: string; stageLevel: 1|2|3; score: number; scoreLabel: string }> {
    return this.patientsList().map(p => {
      const aidant = this.aidantsList().find(a => (a as any).patientId === p.id) ?? null;
      // Calcul mock du stage basé sur l'ID (remplacer par données réelles si dispo)
      const stageLevel: 1|2|3 = (p.id % 3 === 0) ? 3 : (p.id % 2 === 0) ? 2 : 1;
      const stage = stageLevel === 1 ? 'STABLE' : stageLevel === 2 ? 'SURVEILLANCE' : 'CRITIQUE';
      const score = stageLevel === 1 ? 26 : stageLevel === 2 ? 20 : 14;
      const scoreLabel = `${score}/30`;
      return { patient: p, aidant, stage, stageLevel, score, scoreLabel };
    });
  }

  /** Âge calculé depuis la date de naissance */
  getPatientAge(dateNaissance: string | undefined): number {
    if (!dateNaissance) return 0;
    const diff = Date.now() - new Date(dateNaissance).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  }

  /** Couleur selon le stage */
  getStageColor(stageLevel: 1|2|3): string {
    return stageLevel === 1 ? '#00635D' : stageLevel === 2 ? '#D97706' : '#CB1527';
  }

  /** Libellé complet du stage */
  getStageLabelFull(stageLevel: 1|2|3): string {
    return stageLevel === 1 ? 'Stage 1 — Stable' : stageLevel === 2 ? 'Stage 2 — Surveillance' : 'Stage 3 — Critique';
  }

  /** Ouvre la fiche d'un patient depuis le scroll */
  openPatientCard(item: ReturnType<typeof this.getPairedPatients>[0]): void {
    this.selectedPatientCard.set(item);
    // Pre-sélectionner l'aidant pour la vidéo
    if (item.aidant) this.videoSelectedAidant.set(item.aidant);
    // Charger ses recommandations
    if (item.patient?.id) {
      this.loadDoctorRecommendations(this.doctorId() ?? 16);
    }
  }

  closePatientCard(): void {
    this.selectedPatientCard.set(null);
    this.videoSelectedAidant.set(null);
  }

  /** Lance la vidéo avec l'aidant du patient sélectionné */
  openVideoConfigForPatient(): void {
    const card = this.selectedPatientCard();
    if (card?.aidant) {
      this.videoSelectedAidant.set(card.aidant);
      this.videoConfigStep.set('configure');
    } else {
      this.videoConfigStep.set('select-aidant');
    }
    this.videoCallMode.set(null);
    this.scheduledCallDate.set('');
    this.scheduledCallTime.set('');
    this.showVideoConfigModal.set(true);
  }

  /** Ouvre la messagerie pour les recommandations du patient sélectionné */
  openPatientMessages(): void {
    const msgs = this.contactMessages();
    const rec = this.doctorRecommendations()[0] ?? null;
    if (rec) {
      this.loadAllRecMessages();
      this.openDoctorConversation(rec);
    } else {
      this.notifService.showInfo('Aucune recommandation avec conversation pour ce patient.');
    }
  }

  openVideoConfig(): void {
    this.videoConfigStep.set('select-aidant');
    this.videoSelectedAidant.set(null);
    this.videoAidantSearch.set('');
    this.videoCallMode.set(null);
    this.scheduledCallDate.set('');
    this.scheduledCallTime.set('');
    this.showVideoConfigModal.set(true);
  }

  /** Aidants filtrés par la recherche */
  getFilteredAidantsForVideo(): AccompagnantDTO[] {
    const q = this.videoAidantSearch().toLowerCase().trim();
    const all = this.aidantsList();
    if (!q) return all;
    return all.filter(a =>
      `${a.nom} ${a.prenom}`.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      (a as any).telephone?.toLowerCase().includes(q)
    );
  }

  /** Sélectionne un aidant et passe à l'étape de configuration */
  selectAidantForVideo(aidant: AccompagnantDTO): void {
    this.videoSelectedAidant.set(aidant);
    this.videoConfigStep.set('configure');
  }

  /** Retourne le nom complet du patient lié à l'aidant sélectionné */
  getVideoPatientName(): string {
    const aidant = this.videoSelectedAidant();
    if (!aidant) return '';
    // Cherche dans patientsList le patient lié
    const patient = this.patientsList().find(p => p.id === (aidant as any).patientId);
    if (patient) return `${patient.prenom} ${patient.nom}`;
    return `Patient de ${aidant.prenom} ${aidant.nom}`;
  }

  /** Nombre de messages non lus venant d'un aidant donné */
  getAidantMessageCount(_aidant: AccompagnantDTO): number {
    return this.contactMessages().filter(m => m.from === 'aidant').length;
  }

  /** Dernier rendez-vous terminé (global) */
  getLastCallDate(_aidant: AccompagnantDTO): string | null {
    const apts = this.scheduledAppointments()
      .filter(a => a.status === 'ended')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (apts.length === 0) return null;
    return new Date(apts[0].date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /** Démarre une consultation immédiate */
  async startImmediateCall(): Promise<void> {
    const aidant = this.videoSelectedAidant();
    const aidantName = aidant ? `${aidant.prenom} ${aidant.nom}` : this.aidantData.patientName;
    const patientName = this.getVideoPatientName() || this.aidantData.patientName;

    const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.currentRoomId.set(roomId);

    // Écrire l'état de l'appel dans localStorage (signalisation inter-onglets)
    this._writeCallState({ roomId, status: 'calling', doctorName: 'Dr. Martin', patientName, aidantName });

    this.showVideoConfigModal.set(false);
    this.showDoctorVideoUI.set(true);
    this.videoCallActive.set(true);
    this.videoCallConnected.set(false);

    // Activer la caméra du médecin
    await this._startDoctorCamera();

    // Notifier via toast
    this.notifService.showInfo(`📹 Appel lancé — En attente de connexion de ${aidantName}…`);

    // Polling : surveiller si l'aidant accepte
    this._startCallStatePolling();
  }

  /** Planifie un rendez-vous futur */
  scheduleVideoCall(): void {
    const date = this.scheduledCallDate();
    const time = this.scheduledCallTime();
    if (!date || !time) { this.notifService.showError('Veuillez choisir une date et une heure.'); return; }

    const aidant = this.videoSelectedAidant();
    const patientName = this.getVideoPatientName() || this.aidantData.patientName;
    const patientId   = (aidant as any)?.patientId ?? this.aidantData.patientId;

    const apt: VideoAppointment = {
      id: `apt-${Date.now()}`,
      doctorName: 'Dr. Martin',
      patientName,
      patientId,
      date: `${date}T${time}:00`,
      status: 'scheduled',
      roomId: `room-${Date.now()}`
    };

    const all = [...this.scheduledAppointments(), apt];
    this.scheduledAppointments.set(all);
    this._saveAppointments(all);
    this.showVideoConfigModal.set(false);

    // Notifier l'aidant (simulation via localStorage + toast)
    this._writeCallState({ roomId: apt.roomId, status: 'scheduled', doctorName: apt.doctorName, patientName: apt.patientName, scheduledDate: apt.date });
    this.notifService.showSuccess(`📅 Rendez-vous planifié le ${new Date(apt.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
  }

  private async _startDoctorCamera(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.doctorCamStream.set(stream);
      setTimeout(() => {
        const video = document.getElementById('doctor-local-video') as HTMLVideoElement;
        if (video) { video.srcObject = stream; video.play().catch(() => {}); }
      }, 200);
    } catch {
      this.notifService.showError('Impossible d\'accéder à la caméra. Vérifiez les autorisations.');
    }
  }

  toggleDoctorMic(): void {
    const stream = this.doctorCamStream();
    if (!stream) return;
    stream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    this.doctorMicMuted.update(v => !v);
  }

  toggleDoctorCam(): void {
    const stream = this.doctorCamStream();
    if (!stream) return;
    stream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    this.doctorCamOff.update(v => !v);
  }

  /** Polling : médecin surveille l'acceptation de l'aidant */
  private _startCallStatePolling(): void {
    this.callStatePollingTimer = setInterval(() => {
      const state = this._readCallState();
      if (state?.status === 'accepted' && !this.videoCallConnected()) {
        this.videoCallConnected.set(true);
        this.notifService.showSuccess('✅ L\'aidant a rejoint la consultation !');
        clearInterval(this.callStatePollingTimer);
      }
      if (state?.status === 'declined') {
        this.notifService.showError('❌ L\'aidant a refusé la consultation.');
        this.endVideoCall(false);
      }
    }, 2000);
  }

  endVideoCall(askReport = true): void {
    // Arrêter tous les flux caméra
    this.doctorCamStream()?.getTracks().forEach(t => t.stop());
    this.aidantCamStream()?.getTracks().forEach(t => t.stop());
    this.doctorCamStream.set(null);
    this.aidantCamStream.set(null);

    clearInterval(this.callStatePollingTimer);
    clearInterval(this.aidantCallPollingTimer);

    this._writeCallState({ roomId: this.currentRoomId() || '', status: 'ended', doctorName: 'Dr. Martin', patientName: this.aidantData.patientName });

    this.videoCallActive.set(false);
    this.videoCallConnected.set(false);
    this.showDoctorVideoUI.set(false);
    this.showAidantVideoUI.set(false);
    this.incomingCall.set(null);

    if (askReport && this.selectedRole() === 'medecin') {
      this.videoReport.set('');
      this.showVideoReportModal.set(true);
    }
  }

  saveVideoReport(): void {
    const report = this.videoReport().trim();
    if (!report) { this.showVideoReportModal.set(false); return; }

    // Associer le compte rendu au dernier rendez-vous
    const apts = this.scheduledAppointments().map((a, i, arr) =>
      i === arr.length - 1 ? { ...a, report, status: 'ended' as const } : a
    );
    this.scheduledAppointments.set(apts);
    this._saveAppointments(apts);

    this.showVideoReportModal.set(false);
    this.notifService.showSuccess('Compte rendu sauvegardé dans le dossier patient ✓');
  }

  shareScreen(): void {
    navigator.mediaDevices.getDisplayMedia({ video: true }).then(stream => {
      const video = document.getElementById('doctor-local-video') as HTMLVideoElement;
      if (video) { video.srcObject = stream; }
      this.notifService.showInfo('🖥️ Partage d\'écran activé');
    }).catch(() => this.notifService.showError('Partage d\'écran annulé.'));
  }

  // ── Aidant : recevoir l'appel ─────────────────────────────────────────

  /** Polling aidant : cherche un appel entrant */
  startAidantCallPolling(): void {
    if (this.aidantCallPollingTimer) return;
    this.aidantCallPollingTimer = setInterval(() => {
      const state = this._readCallState();
      if (state?.status === 'calling' && !this.incomingCall() && !this.showAidantVideoUI()) {
        this.incomingCall.set({ roomId: state.roomId, doctorName: state.doctorName, patientName: state.patientName });
        this.notifService.showInfo('📹 Demande de consultation à distance du médecin !');
      }
      if (state?.status === 'scheduled' && !this.incomingCall()) {
        this.notifService.showInfo(`📅 Consultation planifiée le ${new Date(state.scheduledDate || '').toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`);
        // Ne répéter qu'une fois
        this._writeCallState({ ...state, status: 'scheduled_notified' });
      }
      if (state?.status === 'ended' && this.showAidantVideoUI()) {
        this.endVideoCall(false);
        this.notifService.showInfo('Le médecin a mis fin à la consultation.');
      }
    }, 2500);
  }

  async acceptCall(): Promise<void> {
    const call = this.incomingCall();
    if (!call) return;
    this._writeCallState({ ...call, status: 'accepted' });
    this.incomingCall.set(null);
    this.showAidantVideoUI.set(true);
    await this._startAidantCamera();
  }

  private async _startAidantCamera(): Promise<void> {
    // Test mode : simuler avec un canvas animé
    if (this.aidantTestMode()) {
      this._startSimulatedCamera();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.aidantCamStream.set(stream);
      setTimeout(() => {
        const video = document.getElementById('aidant-local-video') as HTMLVideoElement;
        if (video) { video.srcObject = stream; video.play().catch(() => {}); }
      }, 200);
    } catch {
      this.aidantTestMode.set(true);
      this._startSimulatedCamera();
    }
  }

  /** Caméra simulée par canvas animé (Mode Test PC unique) */
  private _startSimulatedCamera(): void {
    setTimeout(() => {
      const canvas = document.getElementById('aidant-sim-canvas') as HTMLCanvasElement;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      let t = 0;
      const draw = () => {
        t += 0.02;
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, `hsl(${200 + Math.sin(t) * 30}, 60%, 25%)`);
        grad.addColorStop(1, `hsl(${220 + Math.cos(t) * 30}, 50%, 15%)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔬 MODE TEST', canvas.width / 2, canvas.height / 2 - 14);
        ctx.font = '11px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fillText('Caméra simulée', canvas.width / 2, canvas.height / 2 + 8);
        requestAnimationFrame(draw);
      };
      draw();
      const stream = (canvas as any).captureStream(15);
      this.aidantCamStream.set(stream);
    }, 300);
  }

  openDeclineCallModal(): void {
    this.callDeclineReason.set('');
    this.showDeclineCallModal.set(true);
  }

  declineCall(): void {
    const call = this.incomingCall();
    if (call) this._writeCallState({ ...call, status: 'declined', reason: this.callDeclineReason() });
    this.incomingCall.set(null);
    this.showDeclineCallModal.set(false);
    this.notifService.showInfo('Consultation refusée. Le médecin a été notifié.');
  }

  openProposeTimeModal(): void {
    this.proposeDate.set('');
    this.proposeTime.set('');
    this.showProposeTimeModal.set(true);
  }

  proposeOtherTime(): void {
    const date = this.proposeDate();
    const time = this.proposeTime();
    if (!date || !time) { this.notifService.showError('Veuillez choisir une date et heure.'); return; }
    const call = this.incomingCall();
    if (call) {
      this._writeCallState({ ...call, status: 'proposed', proposedDate: `${date}T${time}:00` });
    }
    this.incomingCall.set(null);
    this.showProposeTimeModal.set(false);
    this.notifService.showInfo(`Proposition envoyée : ${new Date(`${date}T${time}`).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`);
  }

  // ── Helpers localStorage signalisation ───────────────────────────────

  private _writeCallState(state: any): void {
    try { localStorage.setItem(this.CALL_STATE_KEY, JSON.stringify(state)); } catch { /* silent */ }
  }

  private _readCallState(): any {
    try { const raw = localStorage.getItem(this.CALL_STATE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  // ════════════════════════════════════════════════════════════
  //  ÉTAPE 23 — RAPPELS RENDEZ-VOUS
  // ════════════════════════════════════════════════════════════

  loadAppointments(): void {
    try {
      const raw = localStorage.getItem(this.APPOINTMENTS_KEY);
      this.scheduledAppointments.set(raw ? JSON.parse(raw) : []);
    } catch { this.scheduledAppointments.set([]); }
  }

  private _saveAppointments(apts: VideoAppointment[]): void {
    try { localStorage.setItem(this.APPOINTMENTS_KEY, JSON.stringify(apts)); } catch { /* silent */ }
  }

  /** Démarre le polling de rappels (toutes les 60s) */
  startReminderPolling(): void {
    if (this.reminderPollingTimer) return;
    this.reminderPollingTimer = setInterval(() => this._checkReminders(), 60000);
    this._checkReminders(); // vérification immédiate
  }

  private _checkReminders(): void {
    const now = new Date().getTime();
    const apts = this.scheduledAppointments();

    apts.forEach(apt => {
      if (apt.status !== 'scheduled') return;
      const aptTime = new Date(apt.date).getTime();
      const diffMin = (aptTime - now) / 60000;

      // Rappel J-1 (entre 23h55 et 24h05 avant)
      if (diffMin >= 1435 && diffMin <= 1445) {
        this.notifService.showInfo(`📅 Rappel : Consultation demain à ${new Date(apt.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} avec ${apt.doctorName}`);
      }
      // Rappel T-10 min
      if (diffMin >= 9 && diffMin <= 11) {
        this.notifService.showInfo(`⏰ Consultation dans 10 minutes ! Cliquez "Rejoindre" pour vous connecter.`);
      }
      // Absence après 5 min
      if (diffMin <= -5 && diffMin >= -6) {
        this.notifService.showError(`⚠️ L'aidant n'a pas rejoint la consultation planifiée.`);
      }
      // Annulation après 15 min
      if (diffMin <= -15 && diffMin >= -16) {
        const updated = apts.map(a => a.id === apt.id ? { ...a, status: 'missed' as const } : a);
        this.scheduledAppointments.set(updated);
        this._saveAppointments(updated);
        this.notifService.showError(`❌ Rendez-vous manqué avec ${apt.patientName}. Séance annulée.`);
      }
    });
  }

  /** Rejoindre un rendez-vous planifié (aidant) */
  joinScheduledCall(apt: VideoAppointment): void {
    const state = this._readCallState();
    if (state?.roomId === apt.roomId) {
      this.incomingCall.set({ roomId: apt.roomId, doctorName: apt.doctorName, patientName: apt.patientName });
    } else {
      this.notifService.showError('Le médecin n\'a pas encore lancé la consultation.');
    }
  }

  /** Ajouter au calendrier (format .ics) */
  addToCalendar(apt: VideoAppointment): void {
    const start = new Date(apt.date);
    const end   = new Date(start.getTime() + 30 * 60000);
    const fmt   = (d: Date) => d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:Consultation MemoriA avec ${apt.doctorName}`,
      `DESCRIPTION:Consultation cognitive à distance`,
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'consultation.ics'; a.click();
    URL.revokeObjectURL(url);
  }

  startPatientTest(assignment: any): void {
    const patientId = this.selectedPatientForDashboard()?.id || assignment.patientId;
    const baseQueryParams = {
      testId: assignment.test?.id,
      patientId: patientId,
      assignationId: assignment.id
    };

    // Navigate to the appropriate test based on test type or ID
    if (assignment.test?.titre?.toLowerCase().includes('5 mots') || assignment.test?.id === 3) {
      this.router.navigate(['/test-5mots'], { queryParams: baseQueryParams });
    } else if (assignment.test?.titre?.toLowerCase().includes('visages') || assignment.test?.id === 4) {
      this.router.navigate(['/test-visages'], { queryParams: baseQueryParams });
    } else if (assignment.test?.titre?.toLowerCase().includes('mots croises') || assignment.test?.id === 6) {
      this.router.navigate(['/test-mots-croises'], { queryParams: baseQueryParams });
    } else {
      // Navigate to test component (routes for IDs 1,10,17,19,20 go to dedicated components)
      this.router.navigate(['/cognitive-test', assignment.test.id], {
        queryParams: { patientId, assignationId: assignment.id }
      });
    }
  }
}
