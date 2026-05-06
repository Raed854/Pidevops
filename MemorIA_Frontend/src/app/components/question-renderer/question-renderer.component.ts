import { Component, Input, Output, EventEmitter, OnChanges, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Question, QuestionType } from '../../models/test-models';

@Component({
  selector: 'app-question-renderer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './question-renderer.component.html',
  styleUrl: './question-renderer.component.css'
})
export class QuestionRendererComponent implements OnChanges {
  @Input() question!: Question;
  @Input() answer: any = null;
  @Output() answerChange = new EventEmitter<any>();

  // Icons
  readonly icons = {
    CheckCircle: 'CheckCircle',
    Circle: 'Circle'
  };

  // UI State
  selectedOption: any = null;
  textAnswer: string = '';
  yesNoAnswer: string = '';
  calculationAnswer: string = '';
  memorySequence: string[] = [];
  showMemorySequence = false;
  memoryInputSequence: string[] = [];

  ngOnChanges(): void {
    this.initializeAnswer();
  }

  private initializeAnswer(): void {
    switch (this.question.type) {
      case QuestionType.MULTIPLE_CHOICE:
      case QuestionType.IMAGE_CHOICE:
        this.selectedOption = this.answer;
        break;
      case QuestionType.TEXT_ANSWER:
      case QuestionType.RECALL:
        this.textAnswer = this.answer || '';
        break;
      case QuestionType.YES_NO:
        this.yesNoAnswer = this.answer || '';
        break;
      case QuestionType.CALCULATION:
        this.calculationAnswer = this.answer || '';
        break;
      case QuestionType.MEMORY_SEQUENCE:
        this.memoryInputSequence = this.answer || [];
        break;
    }
  }

  // Answer Handlers
  onMultipleChoiceChange(option: any): void {
    this.selectedOption = option;
    this.answerChange.emit(option);
  }

  onTextAnswerChange(): void {
    this.answerChange.emit(this.textAnswer);
  }

  onYesNoChange(value: string): void {
    this.yesNoAnswer = value;
    this.answerChange.emit(value);
  }

  onCalculationChange(): void {
    this.answerChange.emit(this.calculationAnswer);
  }

  // Memory Sequence Handlers
  startMemorySequence(): void {
    this.showMemorySequence = true;
    setTimeout(() => {
      this.showMemorySequence = false;
    }, 3000); // Show sequence for 3 seconds
  }

  addMemoryInput(digit: string): void {
    if (this.memoryInputSequence.length < 5) {
      this.memoryInputSequence.push(digit);
      this.answerChange.emit(this.memoryInputSequence);
    }
  }

  removeMemoryInput(): void {
    if (this.memoryInputSequence.length > 0) {
      this.memoryInputSequence.pop();
      this.answerChange.emit(this.memoryInputSequence);
    }
  }

  clearMemoryInput(): void {
    this.memoryInputSequence = [];
    this.answerChange.emit(this.memoryInputSequence);
  }

  // Utility Methods
  isOptionSelected(option: any): boolean {
    return this.selectedOption === option;
  }

  getOptionClass(option: any): string {
    const baseClass = 'option-item';
    if (this.isOptionSelected(option)) {
      return `${baseClass} selected`;
    }
    return baseClass;
  }

  getYesNoClass(value: string): string {
    const baseClass = 'yes-no-option';
    if (this.yesNoAnswer === value) {
      return `${baseClass} selected`;
    }
    return baseClass;
  }

  // For MMSE specific questions
  isMMSEWordRecall(): boolean {
    return this.question.id === 'mmse_16';
  }

  getMMSETargetWords(): string[] {
    return ['ballon', 'voiture', 'fleur'];
  }

  getMMSEWordScore(): number {
    if (!this.textAnswer) return 0;
    const words = this.textAnswer.toLowerCase().split(/[,\s]+/).filter(w => w.length > 0);
    const targetWords = this.getMMSETargetWords();
    return words.filter(word => targetWords.includes(word)).length;
  }

  // Display helpers
  shouldShowCalculationHint(): boolean {
    return this.question.type === QuestionType.CALCULATION && 
           this.question.text.includes('100 - 7');
  }

  getCalculationHint(): string {
    return "Conseil : 100 - 7 = 93, puis continuez à soustraire 7";
  }

  isMultiStepMMSE(): boolean {
    return this.question.id === 'mmse_20'; // Multi-step instruction
  }

  getMMSESteps(): string[] {
    return [
      "Prendre la feuille avec votre main droite",
      "Plier la feuille en deux",
      "Poser la feuille sur vos genoux"
    ];
  }

  // Image choice helpers
  getImageDisplayUrl(imageData?: string): string {
    if (!imageData) return '';
    // In a real app, this would handle image URLs properly
    return imageData;
  }

  // Validation helpers
  isValidAnswer(): boolean {
    switch (this.question.type) {
      case QuestionType.MULTIPLE_CHOICE:
      case QuestionType.IMAGE_CHOICE:
        return this.selectedOption !== null;
      case QuestionType.TEXT_ANSWER:
      case QuestionType.RECALL:
      case QuestionType.CALCULATION:
        return this.textAnswer.trim().length > 0 || this.calculationAnswer.trim().length > 0;
      case QuestionType.YES_NO:
        return this.yesNoAnswer === 'oui' || this.yesNoAnswer === 'non';
      case QuestionType.MEMORY_SEQUENCE:
        return this.memoryInputSequence.length > 0;
      default:
        return false;
    }
  }

  // Helper method for placeholder text
  getPlaceholder(): string {
    switch (this.question.type) {
      case QuestionType.TEXT_ANSWER:
        return 'Écrivez votre réponse ici...';
      case QuestionType.RECALL:
        return 'Rappelez-vous les informations demandées...';
      case QuestionType.CALCULATION:
        return 'Entrez votre réponse...';
      default:
        return 'Votre réponse...';
    }
  }

  // Additional helper method for better UX
  showHint(): boolean {
    return this.question.type === QuestionType.CALCULATION || 
           this.question.type === QuestionType.MEMORY_SEQUENCE;
  }
}
