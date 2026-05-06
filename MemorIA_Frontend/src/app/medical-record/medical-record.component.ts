import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { MedicalRecordService } from '../services/medical-record.service';
import { DossierMedical } from '../models/medical-record.model';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-medical-record',
  standalone: true,
  imports: [CommonModule, RouterModule, ToastModule, ButtonModule, TagModule, CardModule, DividerModule, TooltipModule],
  providers: [MessageService],
  templateUrl: './medical-record.component.html',
  styleUrl: './medical-record.component.css'
})
export class MedicalRecordComponent implements OnInit {
  dossier: DossierMedical | null = null;
  isLoading = true;
  errorMessage = '';
  isNotFound = false;
  copyDone = false;

  currentUser: any = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly medicalRecordService: MedicalRecordService,
    private readonly messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadDossier();
  }

  // ─── Permissions ────────────────────────────────────────────────────────────

  get currentUserRole(): string {
    return this.currentUser?.role?.toUpperCase() ?? '';
  }

  get canEdit(): boolean {
    return this.currentUserRole === 'ADMINISTRATEUR'
        || this.currentUserRole === 'SOIGNANT'
        || this.currentUserRole === 'PATIENT';
  }

  get canDelete(): boolean {
    return this.currentUserRole === 'ADMINISTRATEUR';
  }

  // ─── Label helpers ───────────────────────────────────────────────────────────

  stadeLabel(stade?: string): string {
    const map: Record<string, string> = { LEGER: 'Léger', MODERE: 'Modéré', SEVERE: 'Sévère' };
    return stade ? (map[stade] ?? stade) : '—';
  }

  stadeSeverity(stade?: string): 'success' | 'warning' | 'danger' | 'secondary' {
    if (stade === 'LEGER') return 'success';
    if (stade === 'MODERE') return 'warning';
    if (stade === 'SEVERE') return 'danger';
    return 'secondary';
  }

  orientationLabel(val?: string): string {
    return val === 'CONSCIENT' ? 'Conscient / Orienté' : val === 'CONFUS' ? 'Confus / Désorienté' : '—';
  }

  fonctionnementLabel(val?: string): string {
    const map: Record<string, string> = {
      INDEPENDANT: 'Indépendant',
      BESOIN_AIDE: "Besoin d'aide",
      DEPENDANT: 'Dépendant'
    };
    return val ? (map[val] ?? val) : '—';
  }

  comportementLabel(val?: string): string {
    const map: Record<string, string> = {
      CALME: 'Calme',
      ANXIEUX: 'Anxieux',
      AGRESSIF: 'Agressif',
      FUGUE: 'Tendance à la fugue'
    };
    return val ? (map[val] ?? val) : '—';
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  onEdit(): void {
    if (this.dossier?.id) {
      this.router.navigate(['/dossier-medical/edit', this.dossier.id]);
    }
  }

  onCreateOwnRecord(): void {
    this.router.navigate(['/dossier-medical/new']);
  }

  goBack(): void {
    const role = this.currentUserRole;
    if (role === 'PATIENT') {
      this.router.navigate(['/profile/patient']);
    } else if (role === 'SOIGNANT') {
      this.router.navigate(['/dashboard_diagnostic']);
    } else {
      this.router.navigate(['/users']);
    }
  }

  onDelete(): void {
    if (!this.dossier?.id) return;
    if (!confirm('Confirmer la suppression de ce dossier médical ?')) return;
    this.medicalRecordService.delete(this.dossier.id, this.currentUser.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Supprimé', detail: 'Dossier médical supprimé.' });
        setTimeout(() => this.goBack(), 1200);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer ce dossier.' });
      }
    });
  }

  // ─── QR Code & Sharing ───────────────────────────────────────────────────────

  get qrCodeText(): string {
    if (!this.dossier) return '';
    return [
      '=== DOSSIER MÉDICAL — MemorIA ===',
      `Diagnostic : ${this.dossier.typeDiagnostic || '—'}`,
      `Stade       : ${this.stadeLabel(this.dossier.stade)}`,
      `Date diag.  : ${this.dossier.dateDiagnostic || '—'}`,
      `Maladies    : ${this.dossier.maladiesPrincipales || '—'}`,
      `Allergies   : ${this.dossier.allergies || '—'}`,
      `Médicaments : ${this.dossier.medicamentsActuels || '—'}`,
      `Mémoire     : ${this.dossier.niveauMemoire || '—'}`,
      `Orientation : ${this.orientationLabel(this.dossier.orientation)}`,
      `Autonomie   : ${this.fonctionnementLabel(this.dossier.niveauFonctionnement)}`,
      `Comportement: ${this.comportementLabel(this.dossier.etatComportement)}`,
      `Accompagnant: ${this.dossier.accompagnantNom || '—'} — ${this.dossier.accompagnantContact || '—'}`,
      `Notes       : ${this.dossier.notesMedecin || '—'}`,
    ].join('\n');
  }

  get qrCodeUrl(): string {
    const encoded = encodeURIComponent(this.qrCodeText);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encoded}`;
  }

  shareViaWhatsApp(): void {
    window.open(`https://wa.me/?text=${encodeURIComponent(this.qrCodeText)}`, '_blank');
  }

  shareViaEmail(): void {
    const subject = encodeURIComponent('Dossier Médical — MemorIA');
    const body = encodeURIComponent(this.qrCodeText);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  copyForMessenger(): void {
    navigator.clipboard.writeText(this.qrCodeText).then(() => {
      this.copyDone = true;
      this.messageService.add({
        severity: 'success',
        summary: 'Copié !',
        detail: 'Informations copiées — collez-les dans Messenger ou toute autre application.'
      });
      setTimeout(() => { this.copyDone = false; }, 3000);
    }).catch(() => {
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de copier dans le presse-papier.' });
    });
  }

  // ─── Data loading ────────────────────────────────────────────────────────────

  private loadDossier(): void {
    const patientIdParam = this.route.snapshot.paramMap.get('patientId');
    const dossierIdParam = this.route.snapshot.paramMap.get('id');

    if (patientIdParam) {
      this.medicalRecordService.getByPatientId(+patientIdParam, this.currentUser.id).subscribe({
        next: (d) => { this.dossier = d; this.isLoading = false; },
        error: (err) => this.handleError(err)
      });
    } else if (dossierIdParam) {
      this.medicalRecordService.getById(+dossierIdParam, this.currentUser.id).subscribe({
        next: (d) => { this.dossier = d; this.isLoading = false; },
        error: (err) => this.handleError(err)
      });
    } else {
      // Patient viewing their own record
      this.medicalRecordService.getByPatientId(this.currentUser.id, this.currentUser.id).subscribe({
        next: (d) => { this.dossier = d; this.isLoading = false; },
        error: (err) => this.handleError(err)
      });
    }
  }

  private handleError(err: any): void {
    this.isLoading = false;
    if (err.status === 404) {
      this.errorMessage = 'Aucun dossier médical trouvé.';
      this.isNotFound = true;
    } else if (err.status === 403) {
      this.errorMessage = 'Accès refusé.';
    } else {
      this.errorMessage = 'Erreur lors du chargement du dossier médical.';
    }
  }
}
