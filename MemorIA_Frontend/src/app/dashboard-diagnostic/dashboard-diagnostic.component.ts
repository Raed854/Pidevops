import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import jsPDF from 'jspdf';
import { environment } from '../../environments/environment';

interface ImportQuestion {
  questionText: string;
  answers: string[];
  correctAnswerIndex: number;
}

@Component({
  selector: 'app-dashboard-diagnostic',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-diagnostic.component.html',
  styleUrl: './dashboard-diagnostic.component.css'
})
export class DashboardDiagnosticComponent implements OnInit {

  private apiUrl = environment.apiUrl;

  // Notifications
  notifications: any[] = [];
  loadingNotifications = false;
  notificationsError = '';

  // Validated rapports for table
  validatedRapports: any[] = [];
  loadingRapports = false;
  rapportsError = '';

  // Search & Sort
  searchTerm = '';
  dateSortOrder: 'asc' | 'desc' = 'desc';
  private searchDebounceTimer: any = null;

  // Modal: Rapport Details (from notification click)
  showRapportModal = false;
  selectedRapport: any = null;
  loadingRapport = false;
  validating = false;
  validateMessage = '';

  // Titre editing
  editingTitre = false;
  editedTitre = '';
  savingTitre = false;

  // Modal: Import Questions
  showImportModal = false;
  csvFile: Blob | null = null;
  csvFileName = '';
  csvQuestions: ImportQuestion[] = [];
  manualQuestionText = '';
  manualAnswers: string[] = ['', '', '', ''];
  manualCorrectAnswerIndex = 0;
  importedQuestions: ImportQuestion[] = [];
  isUploading = false;
  uploadMessage = '';
  uploadSuccess = false;

  // Notification dropdown
  showNotifDropdown = false;

  // IRM full-screen modal
  showIrmFullModal = false;

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadNotifications();
    this.loadValidatedRapports();
  }

  toggleNotifDropdown(): void {
    this.showNotifDropdown = !this.showNotifDropdown;
  }

  closeNotifDropdown(): void {
    this.showNotifDropdown = false;
  }

  onLogout(): void {
    this.authService.logout();
    window.location.href = '/home';
  }

  // =====================
  // NOTIFICATIONS
  // =====================

  loadNotifications(): void {
    this.loadingNotifications = true;
    this.notificationsError = '';
    this.http.get<any[]>(`${this.apiUrl}/api/notifications`).subscribe({
      next: (data) => {
        this.notifications = Array.isArray(data) ? data : [];
        this.loadingNotifications = false;
      },
      error: (err) => {
        this.loadingNotifications = false;
        this.notificationsError = 'Unable to load notifications. Check the server.';
        console.error('Notifications load error:', err);
      }
    });
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  get sortedNotifications(): any[] {
    return [...this.notifications].sort((a, b) => {
      const aUnread = !a.isRead ? 0 : 1;
      const bUnread = !b.isRead ? 0 : 1;
      return aUnread - bUnread;
    });
  }

  onNotificationClick(notification: any): void {
    if (!notification.rapport?.idRapport) return;

    this.loadingRapport = true;
    this.showRapportModal = true;
    this.selectedRapport = null;
    this.validateMessage = '';
    this.editingTitre = false;
    this.editedTitre = '';

    this.http.get<any>(`${this.apiUrl}/api/rapports/${notification.rapport.idRapport}`).subscribe({
      next: (rapport) => {
        this.selectedRapport = rapport;
        console.log('Rapport loaded from notification:', rapport);
        this.loadingRapport = false;
      },
      error: () => {
        this.loadingRapport = false;
      }
    });

    // Mark as read
    if (!notification.isRead) {
      this.http.patch(`${this.apiUrl}/api/notifications/${notification.id}/mark-as-read`, {}).subscribe({
        next: () => { notification.isRead = true; }
      });
    }
  }

  openRapportFromTable(rapport: any): void {
    this.loadingRapport = true;
    this.showRapportModal = true;
    this.selectedRapport = null;
    this.validateMessage = '';
    this.editingTitre = false;
    this.editedTitre = '';

    const rapportId = rapport.idRapport;
    if (rapportId) {
      this.http.get<any>(`${this.apiUrl}/api/rapports/${rapportId}`).subscribe({
        next: (fullRapport) => {
          this.selectedRapport = fullRapport;
          this.loadingRapport = false;
        },
        error: () => {
          // Fallback: use the rapport data we already have
          this.selectedRapport = rapport;
          this.loadingRapport = false;
        }
      });
    } else {
      this.selectedRapport = rapport;
      this.loadingRapport = false;
    }
  }

  closeRapportModal(): void {
    this.showRapportModal = false;
    this.showIrmFullModal = false;
    this.selectedRapport = null;
    this.validateMessage = '';
    this.editingTitre = false;
    this.editedTitre = '';
  }

  startEditTitre(): void {
    this.editedTitre = this.getDiagnosticTitre();
    this.editingTitre = true;
  }

  getDiagnosticTitre(): string {
    return this.selectedRapport?.diagnostic?.titre
      || this.selectedRapport?.titre
      || '';
  }

  cancelEditTitre(): void {
    this.editingTitre = false;
    this.editedTitre = '';
  }

  updateDiagnosticTitre(): void {
    const diagnosticId = this.selectedRapport?.diagnostic?.idDiagnostic;
    if (!diagnosticId || !this.editedTitre.trim()) {
      this.validateMessage = 'Error: Diagnostic ID not found.';
      return;
    }
    this.savingTitre = true;
    this.validateMessage = '';

    const newTitre = this.editedTitre.trim();
    console.log(`PUT /api/diagnostics/${diagnosticId} with titre: "${newTitre}"`);

    this.http.put<any>(`${this.apiUrl}/api/diagnostics/${diagnosticId}`, { titre: newTitre }).subscribe({
      next: (response) => {
        console.log('Titre update response:', response);
        this.savingTitre = false;
        // Update the diagnostic titre in the local object
        if (this.selectedRapport.diagnostic) {
          this.selectedRapport.diagnostic.titre = newTitre;
        }
        // Also update rapport titre if it mirrors diagnostic
        this.selectedRapport.titre = newTitre;
        this.editingTitre = false;
        this.editedTitre = '';
        this.validateMessage = 'Title updated successfully!';
        this.loadValidatedRapports();
      },
      error: (err) => {
        this.savingTitre = false;
        this.validateMessage = 'Error updating the title.';
        console.error('Titre update error:', err);
        console.error('Error details:', err.error);
      }
    });
  }

  isValidated(): boolean {
    return this.selectedRapport?.diagnostic?.valideParMedecin
      || this.selectedRapport?.valideParMedecin
      || false;
  }

  validateRapport(): void {
    if (!this.selectedRapport || !this.selectedRapport.diagnostic?.idDiagnostic) {
      this.validateMessage = 'Error: Diagnostic ID not found.';
      return;
    }
    this.validating = true;
    this.validateMessage = '';

    const diagnosticId = this.selectedRapport.diagnostic.idDiagnostic;
    const updatePayload: any = {
      valideParMedecin: true
    };

    this.http.put<any>(`${this.apiUrl}/api/diagnostics/${diagnosticId}`, updatePayload).subscribe({
      next: () => {
        this.validating = false;
        if (this.selectedRapport.diagnostic) {
          this.selectedRapport.diagnostic.valideParMedecin = true;
        }
        this.selectedRapport.valideParMedecin = true;
        this.validateMessage = 'Report validated successfully!';
        
        // Reload notifications to refresh the list
        this.loadNotifications();
        
        // Reload validated rapports table
        this.loadValidatedRapports();
      },
      error: (err) => {
        this.validating = false;
        this.validateMessage = 'Error during validation.';
        console.error('Validation error:', err);
      }
    });
  }

  // =====================
  // VALIDATED RAPPORTS TABLE
  // =====================

  loadValidatedRapports(): void {
    this.loadingRapports = true;
    this.rapportsError = '';

    const params: Record<string, string> = { sortOrder: this.dateSortOrder };
    if (this.searchTerm.trim()) {
      params['search'] = this.searchTerm.trim();
    }

    const query = new URLSearchParams(params).toString();
    this.http.get<any[]>(`${this.apiUrl}/api/rapports/validated?${query}`).subscribe({
      next: (data) => {
        this.validatedRapports = Array.isArray(data) ? data : [];
        this.loadingRapports = false;
      },
      error: (err) => {
        this.loadingRapports = false;
        this.rapportsError = 'Unable to load reports. Check the server.';
        console.error('Rapports load error:', err);
      }
    });
  }

  onSearchChange(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.loadValidatedRapports();
    }, 400);
  }

  toggleDateSort(): void {
    this.dateSortOrder = this.dateSortOrder === 'asc' ? 'desc' : 'asc';
    this.loadValidatedRapports();
  }

  getPatientName(rapport: any): string {
    const user = rapport?.diagnostic?.user;
    return user ? `${user.prenom} ${user.nom}` : 'N/A';
  }

  getMriImageUrl(): string | null {
    const diagnosticId = this.selectedRapport?.diagnostic?.idDiagnostic;
    const imageName = this.selectedRapport?.diagnostic?.imageName;
    if (!diagnosticId || !imageName) return null;
    return `${this.apiUrl}/api/diagnostics/${diagnosticId}/image`;
  }

  getEtatIrmLabel(etatIrm: string): string {
    const n = (etatIrm || '').toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ').trim();
    if (n.includes('no impairment') || n === 'no') return 'No Impairment';
    if (n.includes('very mild')) return 'Very Mild Impairment';
    if (n.includes('mild')) return 'Mild Impairment';
    if (n.includes('moderate')) return 'Moderate Impairment';
    return etatIrm;
  }

  getEtatIrmColor(etatIrm: string): string {
    const n = (etatIrm || '').toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ').trim();
    if (n.includes('no impairment') || n === 'no') return '#10B981';
    if (n.includes('very mild')) return '#F59E0B';
    if (n.includes('mild')) return '#F97316';
    if (n.includes('moderate')) return '#EF4444';
    return '#6B7280';
  }

  getRiskLevelColor(level: string): string {
    switch (level?.toLowerCase()) {
      case 'low': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'high': return '#EF4444';
      default: return '#6B7280';
    }
  }

  getRiskLevelLabel(level: string): string {
    switch (level?.toLowerCase()) {
      case 'low': return 'Low';
      case 'medium': return 'Medium';
      case 'high': return 'High';
      default: return level || 'N/A';
    }
  }

  exportRapportPdf(rapport: any): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    const addWrappedText = (text: string, x: number, startY: number, maxWidth: number, lineHeight: number, fontSize: number, style: string = 'normal'): number => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', style);
      const lines = doc.splitTextToSize(text, maxWidth);
      for (const line of lines) {
        if (startY > 270) { doc.addPage(); startY = 20; }
        doc.text(line, x, startY);
        startY += lineHeight;
      }
      return startY;
    };

    // Header
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Rapport Diagnostic', margin, 18);

    const patientName = this.getPatientName(rapport);
    const dateStr = rapport.dateGeneration
      ? new Date(rapport.dateGeneration).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'N/A';
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patientName}  |  ${dateStr}`, margin, 30);
    doc.setTextColor(0, 0, 0);
    y = 52;

    // Patient info
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Patient', margin + 4, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(patientName, margin + 4, y + 10);
    y += 16;

    // Date & Risk level
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(margin, y, contentWidth / 2 - 2, 12, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Date', margin + 4, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(dateStr, margin + 4, y + 10);

    const riskLevel = rapport.diagnostic?.riskLevel || 'N/A';
    const riskLabel = this.getRiskLevelLabel(riskLevel);
    const riskX = margin + contentWidth / 2 + 2;
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(riskX, y, contentWidth / 2 - 2, 12, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Niveau de risque', riskX + 4, y + 5);
    const rlc = this.getRiskLevelColor(riskLevel);
    const r = parseInt(rlc.slice(1, 3), 16);
    const g = parseInt(rlc.slice(3, 5), 16);
    const b = parseInt(rlc.slice(5, 7), 16);
    doc.setFillColor(r, g, b);
    doc.roundedRect(riskX + 4, y + 7, doc.getTextWidth(riskLabel) + 6, 5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(riskLabel, riskX + 7, y + 10.5);
    doc.setTextColor(0, 0, 0);
    y += 18;

    // Score
    const score = rapport.diagnostic?.pourcentageReussite;
    if (score != null) {
      doc.setFillColor(245, 245, 250);
      doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('Score', margin + 4, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`${Math.round(score)}%`, margin + 4, y + 10);
      y += 16;
    }

    // Titre
    const titre = rapport.diagnostic?.titre || rapport.titre;
    if (titre) {
      y += 4;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(99, 102, 241);
      doc.text('Titre', margin, y);
      y += 7;
      doc.setTextColor(0, 0, 0);
      y = addWrappedText(titre, margin, y, contentWidth, 6, 11);
      y += 4;
    }

    // Summary
    if (rapport.resumer) {
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(99, 102, 241);
      doc.text('Summary', margin, y);
      y += 7;
      doc.setTextColor(0, 0, 0);
      y = addWrappedText(rapport.resumer, margin, y, contentWidth, 5.5, 10);
      y += 4;
    }

    // Detailed Analysis
    if (rapport.analyseDetaillee) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(99, 102, 241);
      doc.text('Detailed Analysis', margin, y);
      y += 7;
      doc.setTextColor(0, 0, 0);
      const cleanAnalyse = rapport.analyseDetaillee.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
      y = addWrappedText(cleanAnalyse, margin, y, contentWidth, 5.5, 10);
      y += 4;
    }

    // Validation status
    const validated = rapport.diagnostic?.valideParMedecin || rapport.valideParMedecin;
    if (y > 260) { doc.addPage(); y = 20; }
    y += 4;
    doc.setFontSize(10);
    if (validated) {
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(margin, y - 4, 52, 7, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Validated by doctor', margin + 3, y);
    } else {
      doc.setFillColor(245, 158, 11);
      doc.roundedRect(margin, y - 4, 55, 7, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Pending validation', margin + 3, y);
    }

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `MemorIA - G\u00e9n\u00e9r\u00e9 le ${new Date().toLocaleDateString('fr-FR')}  |  Page ${i}/${pageCount}`,
        pageWidth / 2, 290, { align: 'center' }
      );
    }

    const fileName = `rapport_${patientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  }

  // =====================
  // IMPORT QUESTIONS
  // =====================

  openImportModal(): void {
    this.resetImportForm();
    this.showImportModal = true;
  }

  closeImportModal(): void {
    this.showImportModal = false;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.csvFileName = file.name;

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        this.csvFile = new Blob([arrayBuffer], { type: file.type });

        const textReader = new FileReader();
        textReader.onload = (te: ProgressEvent<FileReader>) => {
          const text = te.target?.result as string;
          this.parseCsv(text);
        };
        textReader.readAsText(this.csvFile);
      };
      reader.readAsArrayBuffer(file);
    }
  }

  parseCsv(text: string): void {
    const lines = text.split('\n').filter(line => line.trim());
    this.csvQuestions = [];

    const startIndex = lines.length > 0 && lines[0].toLowerCase().includes('question') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length >= 3) {
        const questionText = parts[0];
        const answers = parts.slice(1, parts.length - 1);
        const correctIndex = parseInt(parts[parts.length - 1], 10);
        this.csvQuestions.push({
          questionText,
          answers,
          correctAnswerIndex: isNaN(correctIndex) ? 0 : correctIndex
        });
      }
    }
  }

  addManualQuestion(): void {
    if (!this.manualQuestionText.trim()) return;

    this.importedQuestions.push({
      questionText: this.manualQuestionText.trim(),
      answers: [...this.manualAnswers.filter(a => a.trim())],
      correctAnswerIndex: this.manualCorrectAnswerIndex
    });

    this.manualQuestionText = '';
    this.manualAnswers = ['', '', '', ''];
    this.manualCorrectAnswerIndex = 0;
  }

  removeImportedQuestion(index: number): void {
    this.importedQuestions.splice(index, 1);
  }

  saveImportedQuestions(): void {
    if (this.manualQuestionText.trim()) {
      this.addManualQuestion();
    }

    if (!this.csvFile && this.importedQuestions.length === 0) {
      this.uploadMessage = 'Veuillez s\u00e9lectionner un fichier ou ajouter des questions manuellement.';
      this.uploadSuccess = false;
      return;
    }

    this.isUploading = true;
    this.uploadMessage = '';

    const user = this.authService.getCurrentUser();
    const userId = user ? user.id : 1;

    if (this.csvFile) {
      const formData = new FormData();
      formData.append('file', this.csvFile, this.csvFileName);

      const fileName = this.csvFileName.toLowerCase();
      const isExcel = fileName.endsWith('.xls') || fileName.endsWith('.xlsx');
      const apiUrl = isExcel
        ? `${this.apiUrl}/api/import/questions-excel?userId=${userId}`
        : `${this.apiUrl}/api/import/questions-csv?userId=${userId}`;

      this.http.post(apiUrl, formData).subscribe({
        next: () => {
          if (this.importedQuestions.length > 0) {
            this.saveManualQuestions(userId);
          } else {
            this.isUploading = false;
            this.uploadMessage = 'Questions import\u00e9es avec succ\u00e8s !';
            this.uploadSuccess = true;
            setTimeout(() => this.closeImportModal(), 1500);
          }
        },
        error: () => {
          this.isUploading = false;
          this.uploadMessage = '\u00c9chec de l\'importation du fichier. Veuillez r\u00e9essayer.';
          this.uploadSuccess = false;
        }
      });
    } else {
      this.saveManualQuestions(userId);
    }
  }

  saveManualQuestions(userId: number): void {
    let savedCount = 0;
    let errorCount = 0;
    const total = this.importedQuestions.length;

    this.importedQuestions.forEach(q => {
      const questionPayload = {
        questionText: q.questionText,
        type: 'TEXT',
        userId: userId
      };

      this.http.post<any>(`${this.apiUrl}/api/questions`, questionPayload).subscribe({
        next: (savedQuestion) => {
          if (q.answers.length > 0) {
            q.answers.forEach((answerText, index) => {
              const reponsePayload = {
                reponseText: answerText,
                reponse: index === q.correctAnswerIndex,
                questionId: savedQuestion.id
              };
              this.http.post(`${this.apiUrl}/api/reponses`, reponsePayload).subscribe();
            });
          }

          savedCount++;
          if (savedCount + errorCount === total) {
            this.isUploading = false;
            this.uploadMessage = `${savedCount} question(s) enregistr\u00e9e(s) avec succ\u00e8s !`;
            this.uploadSuccess = errorCount === 0;
            setTimeout(() => this.closeImportModal(), 1500);
          }
        },
        error: () => {
          errorCount++;
          if (savedCount + errorCount === total) {
            this.isUploading = false;
            this.uploadMessage = `${savedCount} enregistr\u00e9e(s), ${errorCount} \u00e9chou\u00e9e(s).`;
            this.uploadSuccess = false;
          }
        }
      });
    });
  }

  resetImportForm(): void {
    this.csvFile = null;
    this.csvFileName = '';
    this.csvQuestions = [];
    this.manualQuestionText = '';
    this.manualAnswers = ['', '', '', ''];
    this.manualCorrectAnswerIndex = 0;
    this.importedQuestions = [];
    this.uploadMessage = '';
    this.uploadSuccess = false;
  }

  get totalReports(): number {
    return this.validatedRapports.length;
  }

  get lowRiskCount(): number {
    return this.validatedRapports.filter(r => r.diagnostic?.riskLevel?.toLowerCase() === 'low').length;
  }

  get mediumRiskCount(): number {
    return this.validatedRapports.filter(r => r.diagnostic?.riskLevel?.toLowerCase() === 'medium').length;
  }

  get highRiskCount(): number {
    return this.validatedRapports.filter(r => r.diagnostic?.riskLevel?.toLowerCase() === 'high').length;
  }

  trackByIndex(index: number): number {
    return index;
  }

  formatAnalyseDetaillee(text: string): string {
    if (!text) return '';

    let html = text
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Bold text **...**
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Process line by line
    const lines = html.split('\n');
    let result = '';
    let inList = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (inList) { result += '</ul>'; inList = false; }
        continue;
      }

      if (trimmed.startsWith('## ')) {
        if (inList) { result += '</ul>'; inList = false; }
        result += `<h2 class="analyse-h2">${trimmed.substring(3)}</h2>`;
      } else if (trimmed.startsWith('### ')) {
        if (inList) { result += '</ul>'; inList = false; }
        result += `<h3 class="analyse-h3">${trimmed.substring(4)}</h3>`;
      } else if (trimmed.startsWith('- ')) {
        if (!inList) { result += '<ul class="analyse-list">'; inList = true; }
        result += `<li>${trimmed.substring(2)}</li>`;
      } else {
        if (inList) { result += '</ul>'; inList = false; }
        result += `<p class="analyse-paragraph">${trimmed}</p>`;
      }
    }
    if (inList) result += '</ul>';

    return result;
  }
}
