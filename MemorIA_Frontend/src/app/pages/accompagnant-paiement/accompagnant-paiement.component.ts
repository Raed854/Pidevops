import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { jsPDF } from 'jspdf';
import { AbonnementService } from '../../services/abonnement.service';
import { AuthService } from '../../auth/auth.service';
import { TypeAbonnement } from '../../models/abonnement.model';

@Component({
  selector: 'app-accompagnant-paiement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accompagnant-paiement.component.html',
  styleUrls: ['./accompagnant-paiement.component.css']
})
export class AccompagnantPaiementComponent implements OnInit {
  plans = [
    { type: TypeAbonnement.PACK_4, name: 'Pack Découverte', price: 40, description: '4 séances par mois', icon: 'fas fa-leaf', features: ['4 séances utilisables', 'Accès aux activités', 'Support standard'] },
    { type: TypeAbonnement.PACK_15, name: 'Pack Essentiel', price: 135, description: '15 séances par trimestre', icon: 'fas fa-bolt', popular: true, features: ['15 séances utilisables', 'Priorité de réservation', 'Support prioritaire'] },
    { type: TypeAbonnement.PACK_50, name: 'Pack Sérénité', price: 400, description: '50 séances par an', icon: 'fas fa-shield-alt', features: ['50 séances utilisables', 'Meilleur prix / séance', 'Support dédié'] }
  ];

  currentUser: any = null;
  isLoading = false;
  isProcessing = false;
  successMessage = '';
  errorMessage = '';

  selectedPlan: any = null;
  showPaymentForm = false;
  paymentSuccess = false;

  // Form fields
  cardNumber = '';
  expMonth = '';
  expYear = '';
  cvc = '';

  constructor(
    private abonnementService: AbonnementService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser || this.currentUser.role !== 'ACCOMPAGNANT') {
      this.router.navigate(['/login']);
      return;
    }
  }

  selectPlan(plan: any) {
    this.isLoading = true;
    this.abonnementService.getActiveAbonnement(this.currentUser.id).subscribe({
      next: (abo) => {
        this.isLoading = false;
        if (abo && abo.seancesRestantes > 0) {
          this.errorMessage = `Vous avez encore un pack actif (${this.abonnementService.getPlanLabel(abo.type)}) avec ${abo.seancesRestantes} séance(s) restante(s). Vous pourrez en racheter un une fois celui-ci terminé.`;
          this.isLoading = false;
          return;
        }
        this.selectedPlan = plan;
        this.showPaymentForm = true;
        this.errorMessage = '';
      },
      error: () => {
        this.isLoading = false;
        this.selectedPlan = plan;
        this.showPaymentForm = true;
      }
    });
  }

  cancelPayment() {
    this.showPaymentForm = false;
    this.selectedPlan = null;
    this.errorMessage = '';
  }

  processPayment() {
    if (!this.selectedPlan || !this.cardNumber || !this.expMonth || !this.expYear || !this.cvc) {
      this.errorMessage = 'Veuillez remplir tous les champs du formulaire.';
      return;
    }

    if (this.expYear.length !== 4) {
      this.errorMessage = 'L\'année d\'expiration doit être au format AAAA (ex: 2026).';
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';

    this.abonnementService.createPaymentIntent(this.selectedPlan.type, this.currentUser.id).subscribe({
      next: (res) => {
        // En mode simulation (notre backend retourne un secret simulé)
        const simulatedToken = 'tok_simulated_' + Math.random().toString(36).substring(7);
        
        // Simulation du délai de traitement
        setTimeout(() => {
          this.abonnementService.confirmAbonnement(
            this.selectedPlan.type, 
            this.currentUser.id, 
            simulatedToken,
            this.cardNumber,
            this.expMonth,
            this.expYear,
            this.selectedPlan.price
          ).subscribe({
            next: (savedAbo) => {
              console.log('[Paiement] Abonnement sauvé en BD:', savedAbo);
              this.isProcessing = false;
              this.paymentSuccess = true;
              this.successMessage = 'Paiement effectué avec succès ! Votre pack est maintenant actif. Redirection en cours...';
              
              // Redirection automatique après 2 secondes pour permettre de réserver rapidement
              setTimeout(() => {
                this.router.navigate(['/activities-feed']);
              }, 2000);
            },
            error: (err) => {
              this.isProcessing = false;
              this.errorMessage = err.error?.error || err.error?.message || 'La confirmation du paiement a échoué.';
            }
          });
        }, 1500);
      },
      error: (err) => {
        this.isProcessing = false;
        // Affiche l'erreur RÉELLE envoyée par le Java (ex: "Un abonnement est déjà actif")
        this.errorMessage = err.error?.error || err.error?.message || 'Impossible d\'initier le paiement. Veuillez réessayer.';
      }
    });
  }

  formatCardNumber(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    value = value.replace(/(.{4})/g, '$1 ').trim();
    this.cardNumber = value;
  }

  downloadReceipt() {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('fr-FR');
    const invoiceNum = 'INV-' + Math.floor(Math.random() * 90000 + 10000);

    // Styling
    doc.setFontSize(22);
    doc.setTextColor(84, 26, 117); // #541A75
    doc.text('REÇU DE PAIEMENT - MemorIA', 20, 20);

    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date: ${date}`, 20, 30);
    doc.text(`N° Facture: ${invoiceNum}`, 20, 37);

    doc.setDrawColor(226, 232, 240);
    doc.line(20, 45, 190, 45);

    doc.setTextColor(30, 27, 75);
    doc.setFontSize(14);
    doc.text('Détails du Client', 20, 55);
    doc.setFontSize(12);
    doc.text(`Nom: ${this.currentUser.nom} ${this.currentUser.prenom}`, 20, 62);
    doc.text(`Email: ${this.currentUser.email}`, 20, 69);

    doc.setFontSize(14);
    doc.text('Description de l\'achat', 20, 85);
    doc.setFontSize(12);
    doc.text(`${this.selectedPlan.name} (${this.selectedPlan.description})`, 20, 92);
    doc.text(`Montant payé: ${this.selectedPlan.price} €`, 20, 99);

    doc.line(20, 110, 190, 110);
    
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('Merci pour votre confiance. Prêt pour de nouvelles activités !', 20, 120);

    doc.save(`MemorIA_Recu_${invoiceNum}.pdf`);
  }

  goToDashboard() {
    this.router.navigate(['/activities-feed']);
  }
}
