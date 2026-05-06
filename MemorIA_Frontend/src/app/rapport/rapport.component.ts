import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface QuestionResult {
  id: number;
  question: string;
  answer: string;
  correctAnswer: string;
  score: number;
  maxScore: number;
}

interface DiagnosticReport {
  patientName: string;
  testDate: Date;
  questions: QuestionResult[];
  totalScore: number;
  totalMaxScore: number;
  scorePercentage: number;
  diagnosis: string;
  diagnosisLevel: 'normal' | 'mild' | 'moderate' | 'severe';
  mriImage?: string;
}

@Component({
  selector: 'app-rapport',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rapport.component.html',
  styleUrl: './rapport.component.css'
})
export class RapportComponent implements OnInit {
  report: DiagnosticReport | null = null;
  showMriModal = false;
  isGeneratingPdf = false;

  ngOnInit(): void {
    // In a real application, this would come from a service or route parameter
    // For now, we'll use mock data
    this.loadMockReport();
  }

  loadMockReport(): void {
    this.report = {
      patientName: 'John Doe',
      testDate: new Date(),
      questions: [
        {
          id: 1,
          question: 'Name three objects I show you (e.g., pen, watch, key)',
          answer: 'pen, watch, key',
          correctAnswer: 'pen, watch, key',
          score: 1,
          maxScore: 1
        },
        {
          id: 2,
          question: 'What day of the week is it today?',
          answer: 'Monday',
          correctAnswer: 'current day',
          score: 1,
          maxScore: 1
        },
        {
          id: 3,
          question: 'Repeat the following phrase: "No ifs, ands, or buts"',
          answer: 'No ifs, ands, or buts',
          correctAnswer: 'no ifs, ands, or buts',
          score: 1,
          maxScore: 1
        },
        {
          id: 4,
          question: 'Count backwards from 100 by 7s (100, 93, 86...)',
          answer: '100, 93, 86',
          correctAnswer: '100, 93, 86, 79, 72',
          score: 0.6,
          maxScore: 1
        },
        {
          id: 5,
          question: 'What is the name of the current president?',
          answer: '',
          correctAnswer: 'current president',
          score: 0,
          maxScore: 1
        },
        {
          id: 6,
          question: 'Name as many animals as you can in one minute',
          answer: 'dog, cat, bird, fish',
          correctAnswer: 'various animals',
          score: 0.8,
          maxScore: 1
        },
        {
          id: 7,
          question: 'Copy this drawing (intersecting pentagons)',
          answer: 'drawing completed',
          correctAnswer: 'drawing',
          score: 1,
          maxScore: 1
        },
        {
          id: 8,
          question: 'What were the three objects I asked you to remember?',
          answer: 'pen, watch',
          correctAnswer: 'pen, watch, key',
          score: 0.7,
          maxScore: 1
        },
        {
          id: 9,
          question: 'Write a complete sentence about the weather',
          answer: 'It is sunny today',
          correctAnswer: 'complete sentence',
          score: 1,
          maxScore: 1
        },
        {
          id: 10,
          question: 'Follow this three-step command: Take this paper, fold it in half, and place it on the table',
          answer: 'completed all steps',
          correctAnswer: 'three steps completed',
          score: 1,
          maxScore: 1
        }
      ],
      totalScore: 0,
      totalMaxScore: 10,
      scorePercentage: 0,
      diagnosis: '',
      diagnosisLevel: 'normal',
      mriImage: 'https://via.placeholder.com/400x400/6C2EB9/FFFFFF?text=MRI+Scan'
    };

    this.calculateResults();
  }

  calculateResults(): void {
    if (!this.report) return;

    // Calculate total score
    this.report.totalScore = this.report.questions.reduce((sum, q) => sum + q.score, 0);

    // Calculate percentage
    this.report.scorePercentage = Math.round(
      (this.report.totalScore / this.report.totalMaxScore) * 100
    );

    // Determine diagnosis based on percentage
    if (this.report.scorePercentage >= 80) {
      this.report.diagnosis = 'Normal Cognitive Function';
      this.report.diagnosisLevel = 'normal';
    } else if (this.report.scorePercentage >= 60) {
      this.report.diagnosis = 'Mild Cognitive Deficit';
      this.report.diagnosisLevel = 'mild';
    } else if (this.report.scorePercentage >= 40) {
      this.report.diagnosis = 'Moderate Cognitive Impairment';
      this.report.diagnosisLevel = 'moderate';
    } else {
      this.report.diagnosis = 'Severe Cognitive Impairment';
      this.report.diagnosisLevel = 'severe';
    }
  }

  getScoreColor(score: number, maxScore: number): string {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return '#10B981'; // Green
    if (percentage >= 60) return '#F59E0B'; // Orange
    if (percentage >= 40) return '#EF4444'; // Red
    return '#DC2626'; // Dark Red
  }

  getDiagnosisColor(): string {
    if (!this.report) return '#6B7280';

    switch (this.report.diagnosisLevel) {
      case 'normal':
        return '#10B981'; // Green
      case 'mild':
        return '#F59E0B'; // Orange
      case 'moderate':
        return '#EF4444'; // Red
      case 'severe':
        return '#DC2626'; // Dark Red
      default:
        return '#6B7280';
    }
  }

  openMriModal(): void {
    this.showMriModal = true;
  }

  closeMriModal(): void {
    this.showMriModal = false;
  }

  async downloadReport(): Promise<void> {
    if (!this.report || this.isGeneratingPdf) return;

    this.isGeneratingPdf = true;

    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 100));

      // Hide action buttons and modals before capturing
      const actionButtons = document.querySelector('.action-buttons') as HTMLElement;
      const originalDisplay = actionButtons?.style.display;
      if (actionButtons) actionButtons.style.display = 'none';

      // Get the report container
      const reportElement = document.querySelector('.rapport-container') as HTMLElement;

      if (!reportElement) {
        console.error('Report element not found');
        this.isGeneratingPdf = false;
        return;
      }

      // Create canvas from HTML
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#F4F5F7'
      });

      // Restore action buttons
      if (actionButtons) actionButtons.style.display = originalDisplay || '';

      // Calculate dimensions for PDF
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add new pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename with patient name and date
      const fileName = `Diagnostic_Report_${this.report.patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

      // Download PDF
      pdf.save(fileName);

      console.log('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      this.isGeneratingPdf = false;
    }
  }

  printReport(): void {
    window.print();
  }
}
