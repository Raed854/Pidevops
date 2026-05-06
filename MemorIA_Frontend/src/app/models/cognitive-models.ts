export enum TestType {
    MEMORY = 'MEMORY',
    LANGUAGE = 'LANGUAGE',
    REFLECTION = 'REFLECTION',
    LOGIC = 'LOGIC',
    AUDIO = 'AUDIO',
    ATTENTION = 'ATTENTION',
    DRAWING = 'DRAWING',
    GAME = 'GAME'
}

export enum QuestionType {
    MCQ = 'MCQ',
    TEXT = 'TEXT',
    IMAGE = 'IMAGE',
    TRUE_FALSE = 'TRUE_FALSE',
    NUMERIC = 'NUMERIC',
    DRAWING = 'DRAWING',
    AUDIO = 'AUDIO'
}

export enum AssignmentStatus {
    ASSIGNED = 'ASSIGNED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    EXPIRED = 'EXPIRED',
    CANCELLED = 'CANCELLED'
}

export enum SeverityLevel {
    NORMAL = 'NORMAL',
    MILD = 'MILD',
    MODERATE = 'MODERATE',
    SEVERE = 'SEVERE'
}

export enum DecisionType {
    SURVEILLANCE = 'SURVEILLANCE',
    ALERTE = 'ALERTE',
    CONSULTATION = 'CONSULTATION',
    URGENCE = 'URGENCE'
}

export enum DifficultyLevel {
    FACILE = 'FACILE',
    MOYEN = 'MOYEN',
    AVANCE = 'AVANCE'
}

/**
 * Énumérations pour les Recommandations et Décisions
 */
export enum PriorityLevel {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT'
}

export enum RecommendStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    DISMISSED = 'DISMISSED'
}

export enum DecisionSource {
    AI_MODEL = 'AI_MODEL',
    RULE_BASED = 'RULE_BASED',
    MANUAL = 'MANUAL',
    HYBRID = 'HYBRID'
}

export enum TypeTestEnum {
    MEMORY = 'MEMORY',
    LANGUAGE = 'LANGUAGE',
    REFLECTION = 'REFLECTION',
    CONFUSION = 'CONFUSION'
}

export interface CognitiveTest {
    id?: number;
    titre: string;
    description?: string;
    type: TestType;
    difficultyLevel?: DifficultyLevel;
    totalScore?: number;
    durationMinutes?: number;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    idUser?: number;
    questions?: TestQuestion[];
}

export interface TestQuestion {
    id?: number;
    test?: CognitiveTest;
    questionText: string;
    questionType: QuestionType;
    correctAnswer?: string;
    answerOptions?: string[]; // JSON list
    score: number;
    orderIndex?: number;
    timeLimitSeconds?: number;
    imageUrl?: string;
    explanation?: string;
    isRequired?: boolean;
}

export interface PatientTestAssignment {
    id?: number;
    patientId: number;
    test: CognitiveTest;
    assignedBy?: number;
    assignedDate?: string;
    dueDate?: string;
    status: AssignmentStatus;
    completedDate?: string;
    notes?: string;
    reminderSent?: boolean;
    reminderCount?: number;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface TestResult {
    id?: number;
    patientId: number;
    test?: CognitiveTest;
    assignmentId?: number;
    scoreTotale?: number;
    maxPossibleScore?: number;
    scorePercentage?: number;
    zScore?: number;
    percentile?: number;
    interpretation?: string;
    severityLevel?: SeverityLevel;
    testDate?: string;
    durationSeconds?: number;
    completionRate?: number;
    isValid?: boolean;
    flaggedReasons?: string;
    reviewedBy?: number;
    reviewedAt?: string;
}

export interface Decision {
    id?: number;
    patientId: number;
    testResult?: TestResult;
    testType?: TypeTestEnum;
    decisionType?: DecisionType;
    riskLevel?: 'FAIBLE' | 'MOYEN' | 'ELEVE' | 'CRITIQUE';
    confidence?: number;
    explanation?: string;
    sourceType?: DecisionSource;
    createdAt?: string;
    createdBy?: string;
    approved?: boolean;
    approvedBy?: number;
    approvedAt?: string;
    recommendations?: Recommendation[];
}

export interface Recommendation {
    id?: number;
    decision?: Decision;
    decisionId?: number;
    action: string;
    priority: PriorityLevel;
    targetRole: string; // 'CAREGIVER', 'MEDECIN', etc.
    deadline: string;
    status: RecommendStatus;
    createdAt?: string;
    clinicianId: number;
    patientId: number;
    notes?: string;
    completedAt?: string;
    completedBy?: number;
    updatedAt?: string;
    testResultId?: number;
    isNew?: boolean; // For UI purposes (highlight new items)
}

export interface UserDTO {
    id: number;
    nom: string;
    prenom: string;
    email?: string;
    role: string;
    actif: boolean;
}

export interface PatientDTO extends UserDTO {
    dateNaissance?: string;
    sexe?: string;
    adresse?: string;
    medecin?: {
        id: number;
        nom: string;
        prenom: string;
        email?: string;
        specialite?: string;
    };
}

export interface SoignantDTO extends UserDTO {
    specialite?: string;
    hopital?: string;
    numeroOrdre?: string;
}

export interface AccompagnantDTO extends UserDTO {
    relation?: string;
    frequenceAccompagnement?: string;
    telephone?: string;
    patientId?: number; // ID du patient lié à cet aidant
}

export interface AssignationRequest {
    patientId: number;
    testId: number;
    soignantId: number;
    accompagnantId?: number;
    dateLimite?: string;
    instructions?: string;
}

export interface PersonalizedTestItem {
    question: string;
    reponse: string;
    score: number;
    imageUrl?: string;
    metadata: { [key: string]: any };
}

export interface PersonalizedTestRequest {
    patientId: number;
    soignantId?: number; // Rendu optionnel pour récupération automatique
    accompagnantId?: number;
    titre: string;
    description: string;
    stage: 'STABLE' | 'MOYEN' | 'CRITIQUE';
    dateLimite: string; // YYYY-MM-DD
    instructions?: string;
    items: PersonalizedTestItem[];
}
