import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { VisageTestService, VisageAnswerDto, VisageResultDto } from '../../services/visage-test.service';

interface VisageData {
  id: number;
  imageUrl: string;
  questionText: string;
  characteristic: string; // La caractéristique spécifique à identifier
  correctAnswer: boolean; // Si la caractéristique est présente sur l'image
  isCorrect?: boolean;
  userAnswer?: boolean;
  answered: boolean;
}

interface VisageScoreRequest {
  testId: number;
  patientId: number;
  score: number;
}

interface TestResult {
  resultId?: number;
  patientId: number;
  testId: number;
  score: number;
  totalQuestions: number;
  timeTaken: number;
  responses: Array<{
    imageId: number;
    characteristic: string;
    correctAnswer: boolean;
    userAnswer: boolean;
    isCorrect: boolean;
  }>;
}

@Component({
  selector: 'app-test-visages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-visages.component.html',
  styleUrls: ['./test-visages.component.css']
})
export class TestVisagesComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  private currentPatientId: number = 1; // Corriger: mettre un ID patient valide
  private currentTestId: number = 4;

  // State signals
  currentVisageIndex = signal(0);
  visages = signal<VisageData[]>([]);
  testCompleted = signal(false);
  score = signal(0);
  isAnswering = signal(false);

  // Computed properties
  currentVisage = computed(() => this.visages()[this.currentVisageIndex()]);
  totalVisages = computed(() => this.visages().length);
  progressPercentage = computed(() => 
    Math.round(((this.currentVisageIndex() + 1) / this.totalVisages()) * 100)
  );

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private visageTestService: VisageTestService
  ) {}

  ngOnInit(): void {
    // Get parameters from URL
    this.route.queryParams.subscribe(params => {
      this.currentPatientId = +params['patientId'] || 0;
      this.currentTestId = +params['testId'] || 4;
      
      this.loadTestVisages();
    });
  }

  loadTestVisages(): void {
    // Load visages data - in real app, this would come from backend
    const mockVisages: VisageData[] = [
      {
        id: 1,
        imageUrl: 'assets/image/homme-age.jpg',
        questionText: 'Cet homme porte-t-il des lunettes ?',
        characteristic: 'lunettes',
        correctAnswer: true,
        answered: false
      },
      {
        id: 2,
        imageUrl: 'assets/image/femme-brune.jpg',
        questionText: 'Cette femme a-t-elle les cheveux bruns ?',
        characteristic: 'cheveux bruns',
        correctAnswer: true,
        answered: false
      },
      {
        id: 3,
        imageUrl: 'assets/image/enfant-blond.jpg',
        questionText: 'Cet enfant a-t-il les cheveux blonds ?',
        characteristic: 'cheveux blonds',
        correctAnswer: true,
        answered: false
      },
      {
        id: 4,
        imageUrl: 'assets/image/homme-barbu.jpg',
        questionText: 'Cet homme a-t-il une barbe ?',
        characteristic: 'barbe',
        correctAnswer: true,
        answered: false
      },
      {
        id: 5,
        imageUrl: 'assets/image/femme-agee.jpg',
        questionText: 'Cette femme est-elle âgée ?',
        characteristic: 'âge avancé',
        correctAnswer: true,
        answered: false
      },
      {
        id: 6,
        imageUrl: 'assets/image/homme-chauve.jpg',
        questionText: 'Cet homme est-il chauve ?',
        characteristic: 'chauve',
        correctAnswer: false,
        answered: false
      },
      {
        id: 7,
        imageUrl: 'assets/image/jeune-fille.jpg',
        questionText: 'Cette jeune fille porte-t-elle un ruban ?',
        characteristic: 'ruban',
        correctAnswer: false,
        answered: false
      },
      {
        id: 8,
        imageUrl: 'assets/image/homme-moustachu.jpg',
        questionText: 'Cet homme a-t-il une moustache ?',
        characteristic: 'moustache',
        correctAnswer: false,
        answered: false
      }
    ];

    // Shuffle visages randomly
    const shuffled = this.shuffleArray([...mockVisages]);
    this.visages.set(shuffled);
  }

  shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  answerVisage(userAnswer: boolean): void {
    if (this.isAnswering() || this.testCompleted()) return;
    this.isAnswering.set(true);
    
    const current = this.currentVisage();
    if (!current) return;
    
    // Update visage data
    const updatedVisages = this.visages().map(v => {
      if (v.id === current.id) {
        // Convert userAnswer (boolean) to string for comparison
        const userAnswerStr = userAnswer ? 'true' : 'false';
        return {
          ...v,
          userAnswer: userAnswer,
          answered: true,
          isCorrect: userAnswerStr === v.correctAnswer.toString()
        };
      }
      return v;
    });

    this.visages.set(updatedVisages);

    // Wait a moment to show feedback, then move to next
    setTimeout(() => {
      this.nextVisage();
      this.isAnswering.set(false);
    }, 1500);
  }

  nextVisage(): void {
    const nextIndex = this.currentVisageIndex() + 1;
    
    if (nextIndex >= this.totalVisages()) {
      this.completeTest();
    } else {
      this.currentVisageIndex.set(nextIndex);
    }
  }

  completeTest(): void {
    // Calculate final score
    const correctAnswers = this.visages().filter(v => v.isCorrect).length;
    this.score.set(correctAnswers);
    this.testCompleted.set(true);

    // Save final score using simple endpoint
    this.saveFinalScore();
  }

  saveFinalScore(): void {
    const scoreData: VisageScoreRequest = {
      testId: this.currentTestId,
      patientId: this.currentPatientId,
      score: this.score()
    };

    console.log('=== SAVING FINAL SCORE ===');
    console.log('API URL:', this.apiUrl);
    console.log('Score Data:', scoreData);
    console.log('Score value:', this.score());
    console.log('Test ID:', this.currentTestId);
    console.log('Patient ID:', this.currentPatientId);

    this.http.post(`${this.apiUrl}/visage/submit-score`, scoreData).subscribe({
      next: (response) => {
        console.log('✅ Final score saved successfully:', response);
      },
      error: (err) => {
        console.error('❌ Error saving final score:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.message);
        console.error('Error URL:', err.url);
      }
    });
  }

  restartTest(): void {
    this.currentVisageIndex.set(0);
    this.testCompleted.set(false);
    this.score.set(0);
    this.isAnswering.set(false);
    this.loadTestVisages();
  }

  returnToDashboard(): void {
    this.router.navigate(['/tests-cognitifs']);
  }

  // Helper methods
  getImageUrl(visage: VisageData): string {
    return visage.imageUrl;
  }

  isCurrentVisageCorrect(): boolean {
    const current = this.currentVisage();
    return current?.isCorrect === true;
  }

  isCurrentVisageIncorrect(): boolean {
    const current = this.currentVisage();
    return current?.isCorrect === false;
  }

  getScoreText(): string {
    return `${this.score()} / ${this.totalVisages()}`;
  }

  getScorePercentage(): number {
    return Math.round((this.score() / this.totalVisages()) * 100);
  }

  onImageLoad(): void {
    console.log('Image loaded successfully');
  }

  onImageError(): void {
    console.error('Image failed to load');
  }
}
