export interface Test {
  id: string;
  name: string;
  type: TestType;
  category: TestCategory;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  difficulty: DifficultyLevel;
  isPersonalized: boolean;
  patientId?: string;
  assignmentId?: string;
}

export enum TestType {
  MMSE = 'MMSE',
  MEMORY = 'MEMORY',
  LANGUAGE = 'LANGUAGE',
  ORIENTATION = 'ORIENTATION',
  GAME = 'GAME',
  PERSONALIZED = 'PERSONALIZED'
}

export enum TestCategory {
  COGNITIVE = 'COGNITIVE',
  MEMORY = 'MEMORY',
  ATTENTION = 'ATTENTION',
  LANGUAGE = 'LANGUAGE',
  EXECUTIVE = 'EXECUTIVE',
  VISUAL_SPATIAL = 'VISUAL_SPATIAL',
  ORIENTATION = 'ORIENTATION'
}

export enum DifficultyLevel {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  category: TestCategory;
  points: number;
  timeLimit?: number;
  options?: string[];
  correctAnswer?: string | number;
  imageData?: string;
  instructions?: string;
  order: number;
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TEXT_ANSWER = 'TEXT_ANSWER',
  IMAGE_CHOICE = 'IMAGE_CHOICE',
  MEMORY_SEQUENCE = 'MEMORY_SEQUENCE',
  YES_NO = 'YES_NO',
  CALCULATION = 'CALCULATION',
  RECALL = 'RECALL',
  GAME_MATCHING = 'GAME_MATCHING'
}

export interface TestSession {
  id: string;
  testId: string;
  patientId: string;
  startTime: Date;
  endTime?: Date;
  currentQuestionIndex: number;
  answers: TestAnswer[];
  score?: number;
  status: TestSessionStatus;
  progress: number;
}

export enum TestSessionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  ABANDONED = 'ABANDONED'
}

export interface TestAnswer {
  questionId: string;
  answer: string | number | string[];
  isCorrect?: boolean;
  timeSpent: number;
  timestamp: Date;
}

export interface GameData {
  type: GameType;
  cards: GameCard[];
  timer: number;
  score: number;
  moves: number;
  matches: number;
}

export enum GameType {
  MEMORY_CARDS = 'MEMORY_CARDS',
  IMAGE_MATCHING = 'IMAGE_MATCHING',
  SEQUENCE_MEMORY = 'SEQUENCE_MEMORY'
}

export interface GameCard {
  id: string;
  content: string;
  image?: string;
  isFlipped: boolean;
  isMatched: boolean;
  position: number;
}

// MMSE Specific Questions (30 official questions)
export const MMSE_QUESTIONS: Question[] = [
  {
    id: 'mmse_1',
    type: QuestionType.RECALL,
    text: "Quelle est la date d'aujourd'hui ?",
    category: TestCategory.ORIENTATION,
    points: 1,
    order: 1
  },
  {
    id: 'mmse_2',
    type: QuestionType.RECALL,
    text: "Quel jour de la semaine sommes-nous ?",
    category: TestCategory.ORIENTATION,
    points: 1,
    order: 2
  },
  {
    id: 'mmse_3',
    type: QuestionType.RECALL,
    text: "Quel mois sommes-nous ?",
    category: TestCategory.ORIENTATION,
    points: 1,
    order: 3
  },
  {
    id: 'mmse_4',
    type: QuestionType.RECALL,
    text: "En quelle année sommes-nous ?",
    category: TestCategory.ORIENTATION,
    points: 1,
    order: 4
  },
  {
    id: 'mmse_5',
    type: QuestionType.RECALL,
    text: "Dans quelle ville nous trouvons-nous ?",
    category: TestCategory.ORIENTATION,
    points: 1,
    order: 5
  },
  {
    id: 'mmse_6',
    type: QuestionType.RECALL,
    text: "Dans quel hôpital sommes-nous ?",
    category: TestCategory.ORIENTATION,
    points: 1,
    order: 6
  },
  {
    id: 'mmse_7',
    type: QuestionType.RECALL,
    text: "Dans quel étage sommes-nous ?",
    category: TestCategory.ORIENTATION,
    points: 1,
    order: 7
  },
  {
    id: 'mmse_8',
    type: QuestionType.RECALL,
    text: "Dans quel pays sommes-nous ?",
    category: TestCategory.ORIENTATION,
    points: 1,
    order: 8
  },
  {
    id: 'mmse_9',
    type: QuestionType.RECALL,
    text: "Dans quelle province/département sommes-nous ?",
    category: TestCategory.ORIENTATION,
    points: 1,
    order: 9
  },
  {
    id: 'mmse_10',
    type: QuestionType.RECALL,
    text: "Je vais vous dire trois mots. Répétez-les : 'Ballon, Voiture, Fleur'",
    category: TestCategory.MEMORY,
    points: 1,
    order: 10
  },
  {
    id: 'mmse_11',
    type: QuestionType.CALCULATION,
    text: "Faites une soustraction de 7 en 7 à partir de 100 : 100 - 7 = ?",
    category: TestCategory.ATTENTION,
    points: 1,
    order: 11
  },
  {
    id: 'mmse_12',
    type: QuestionType.CALCULATION,
    text: "Continuez : 93 - 7 = ?",
    category: TestCategory.ATTENTION,
    points: 1,
    order: 12
  },
  {
    id: 'mmse_13',
    type: QuestionType.CALCULATION,
    text: "Continuez : 86 - 7 = ?",
    category: TestCategory.ATTENTION,
    points: 1,
    order: 13
  },
  {
    id: 'mmse_14',
    type: QuestionType.CALCULATION,
    text: "Continuez : 79 - 7 = ?",
    category: TestCategory.ATTENTION,
    points: 1,
    order: 14
  },
  {
    id: 'mmse_15',
    type: QuestionType.CALCULATION,
    text: "Continuez : 72 - 7 = ?",
    category: TestCategory.ATTENTION,
    points: 1,
    order: 15
  },
  {
    id: 'mmse_16',
    type: QuestionType.RECALL,
    text: "Rappelez-vous les trois mots que je vous ai dits ?",
    category: TestCategory.MEMORY,
    points: 3,
    order: 16
  },
  {
    id: 'mmse_17',
    type: QuestionType.IMAGE_CHOICE,
    text: "Montrez cet objet : 'Stylo'",
    category: TestCategory.LANGUAGE,
    points: 1,
    order: 17
  },
  {
    id: 'mmse_18',
    type: QuestionType.IMAGE_CHOICE,
    text: "Montrez cet objet : 'Montre'",
    category: TestCategory.LANGUAGE,
    points: 1,
    order: 18
  },
  {
    id: 'mmse_19',
    type: QuestionType.TEXT_ANSWER,
    text: "Répétez cette phrase : 'Pas de mais, de si, ni de et'",
    category: TestCategory.LANGUAGE,
    points: 1,
    order: 19
  },
  {
    id: 'mmse_20',
    type: QuestionType.MULTIPLE_CHOICE,
    text: "Suivez cette instruction : 'Prenez cette feuille de papier avec votre main droite, pliez-la en deux, et posez-la sur vos genoux'",
    category: TestCategory.EXECUTIVE,
    points: 3,
    order: 20
  },
  {
    id: 'mmse_21',
    type: QuestionType.TEXT_ANSWER,
    text: "Écrivez une phrase complète",
    category: TestCategory.LANGUAGE,
    points: 1,
    order: 21
  },
  {
    id: 'mmse_22',
    type: QuestionType.IMAGE_CHOICE,
    text: "Copiez ce dessin : [intersection de deux pentagones]",
    category: TestCategory.VISUAL_SPATIAL,
    points: 1,
    order: 22
  },
  {
    id: 'mmse_23',
    type: QuestionType.YES_NO,
    text: "Avez-vous des difficultés de mémoire ?",
    category: TestCategory.COGNITIVE,
    points: 1,
    order: 23
  },
  {
    id: 'mmse_24',
    type: QuestionType.YES_NO,
    text: "Avez-vous des difficultés de concentration ?",
    category: TestCategory.COGNITIVE,
    points: 1,
    order: 24
  },
  {
    id: 'mmse_25',
    type: QuestionType.YES_NO,
    text: "Avez-vous des difficultés pour trouver vos mots ?",
    category: TestCategory.LANGUAGE,
    points: 1,
    order: 25
  },
  {
    id: 'mmse_26',
    type: QuestionType.YES_NO,
    text: "Avez-vous des difficultés pour vous orienter ?",
    category: TestCategory.ORIENTATION,
    points: 1,
    order: 26
  },
  {
    id: 'mmse_27',
    type: QuestionType.YES_NO,
    text: "Avez-vous des difficultés pour reconnaître les visages ?",
    category: TestCategory.VISUAL_SPATIAL,
    points: 1,
    order: 27
  },
  {
    id: 'mmse_28',
    type: QuestionType.YES_NO,
    text: "Avez-vous des difficultés pour vous habiller ?",
    category: TestCategory.EXECUTIVE,
    points: 1,
    order: 28
  },
  {
    id: 'mmse_29',
    type: QuestionType.YES_NO,
    text: "Avez-vous des difficultés pour gérer votre argent ?",
    category: TestCategory.EXECUTIVE,
    points: 1,
    order: 29
  },
  {
    id: 'mmse_30',
    type: QuestionType.YES_NO,
    text: "Avez-vous des difficultés pour prendre vos médicaments ?",
    category: TestCategory.EXECUTIVE,
    points: 1,
    order: 30
  }
];

// Mock questions for other tests
export const MOCK_QUESTIONS: Question[] = [
  {
    id: 'mem_1',
    type: QuestionType.MULTIPLE_CHOICE,
    text: "Quelle est la capitale de la France ?",
    category: TestCategory.MEMORY,
    points: 1,
    options: ["Lyon", "Marseille", "Paris", "Toulouse"],
    correctAnswer: 2,
    order: 1
  },
  {
    id: 'mem_2',
    type: QuestionType.IMAGE_CHOICE,
    text: "Identifiez l'animal dans cette image",
    category: TestCategory.VISUAL_SPATIAL,
    points: 1,
    imageData: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5DaWVuPC90ZXh0Pjwvc3ZnPg==",
    order: 2
  },
  {
    id: 'mem_3',
    type: QuestionType.MEMORY_SEQUENCE,
    text: "Mémorisez cette séquence : 3-7-2-9-5",
    category: TestCategory.MEMORY,
    points: 1,
    order: 3
  },
  {
    id: 'mem_4',
    type: QuestionType.TEXT_ANSWER,
    text: "Décrivez votre petit-déjeuner habituel",
    category: TestCategory.LANGUAGE,
    points: 1,
    order: 4
  },
  {
    id: 'mem_5',
    type: QuestionType.CALCULATION,
    text: "15 + 27 = ?",
    category: TestCategory.ATTENTION,
    points: 1,
    order: 5
  },
  {
    id: 'mem_6',
    type: QuestionType.MULTIPLE_CHOICE,
    text: "Quelle saison suit l'été ?",
    category: TestCategory.MEMORY,
    points: 1,
    options: ["Printemps", "Automne", "Hiver", "Été"],
    correctAnswer: 1,
    order: 6
  },
  {
    id: 'mem_7',
    type: QuestionType.YES_NO,
    text: "Les oiseaux peuvent voler sous l'eau",
    category: TestCategory.COGNITIVE,
    points: 1,
    order: 7
  },
  {
    id: 'mem_8',
    type: QuestionType.TEXT_ANSWER,
    text: "Nommez 3 fruits rouges",
    category: TestCategory.MEMORY,
    points: 1,
    order: 8
  },
  {
    id: 'mem_9',
    type: QuestionType.IMAGE_CHOICE,
    text: "Combien y a-t-il d'objets dans cette image ?",
    category: TestCategory.VISUAL_SPATIAL,
    points: 1,
    order: 9
  },
  {
    id: 'mem_10',
    type: QuestionType.MULTIPLE_CHOICE,
    text: "Quel est le plus grand océan du monde ?",
    category: TestCategory.MEMORY,
    points: 1,
    options: ["Atlantique", "Indien", "Arctique", "Pacifique"],
    correctAnswer: 3,
    order: 10
  }
];
