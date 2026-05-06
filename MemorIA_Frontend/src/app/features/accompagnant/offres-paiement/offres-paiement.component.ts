import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbonnementService } from '../../../services/abonnement.service';
import { TypeAbonnement, Abonnement, StatutAbonnement } from '../../../models/abonnement.model';
import { loadStripe } from '@stripe/stripe-js';

@Component({
  selector: 'app-offres-paiement',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pricing-container">
      <div class="header">
        <h2>Choisissez votre forfait de séances</h2>
        <p>Des forfaits adaptés à vos besoins pour un accompagnement optimal.</p>
      </div>

      <div class="error-msg" *ngIf="errorMessage">{{ errorMessage }}</div>
      
      <div class="active-sub-card" *ngIf="activeAbonnement">
        <h3>Vous avez un abonnement actif !</h3>
        <p>Pack : <strong>{{ activeAbonnement.type }}</strong></p>
        <p>Séances restantes : <span class="badge-restantes">{{ activeAbonnement.seancesRestantes }}</span></p>
        <p>Valide jusqu'au : {{ activeAbonnement.dateFin | date }}</p>
        <p class="info-note">Vous devez terminer votre pack actuel avant d'en souscrire un nouveau.</p>
      </div>

      <div class="pricing-grid" *ngIf="!activeAbonnement && !clientSecret">
        <!-- Pack Mensuel -->
        <div class="pricing-card">
          <div class="card-header">
            <h3>Essentiel</h3>
            <div class="price">40€ <span>/ 1 mois</span></div>
          </div>
          <ul class="features">
            <li><i class="fa fa-check"></i> 4 séances</li>
            <li><i class="fa fa-check"></i> Valable 1 mois</li>
            <li><i class="fa fa-check"></i> Support standard</li>
          </ul>
          <button class="btn-buy" (click)="buyAbonnement('PACK_4')">Souscrire (40€)</button>
        </div>

        <!-- Pack Trimestriel -->
        <div class="pricing-card popular">
          <div class="popular-badge">Populaire</div>
          <div class="card-header">
            <h3>Régulier</h3>
            <div class="price">135€ <span>/ 3 mois</span></div>
          </div>
          <ul class="features">
            <li><i class="fa fa-check"></i> 15 séances</li>
            <li><i class="fa fa-check"></i> Valable 3 mois</li>
            <li><i class="fa fa-check"></i> Support prioritaire</li>
          </ul>
          <button class="btn-buy popular" (click)="buyAbonnement('PACK_15')">Souscrire (135€)</button>
        </div>

        <!-- Pack Annuel -->
        <div class="pricing-card">
          <div class="card-header">
            <h3>Intensif</h3>
            <div class="price">400€ <span>/ 1 an</span></div>
          </div>
          <ul class="features">
            <li><i class="fa fa-check"></i> 50 séances</li>
            <li><i class="fa fa-check"></i> Valable 1 an</li>
            <li><i class="fa fa-check"></i> Accès illimité aux contenus</li>
          </ul>
          <button class="btn-buy" (click)="buyAbonnement('PACK_50')">Souscrire (400€)</button>
        </div>
      </div>

      <div class="payment-container" *ngIf="clientSecret">
        <h3>Finaliser le paiement</h3>
        <p>Veuillez entrer vos coordonnées bancaires (Simulation dans cet environnement).</p>
        <!-- Idéalement ici vous utiliseriez ngx-stripe ou Stripe Elements UI -->
        <div class="mock-stripe">
          <div class="stripe-card-element">[Élément Carte Stripe]</div>
          <button class="btn-pay" (click)="simulatePaymentSuccess()">Confirmer le paiement de {{ selectedType }}</button>
          <button class="btn-cancel" (click)="clientSecret = null">Annuler</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pricing-container { padding: 4rem 2rem; background: #fafafa; min-height: 100vh; text-align: center; }
    .header h2 { font-size: 2.5rem; color: #1e293b; margin-bottom: 0.5rem; font-weight: 800; }
    .header p { color: #64748b; font-size: 1.1rem; margin-bottom: 3rem; }
    
    .error-msg { background: #fee2e2; color: #ef4444; padding: 1rem; border-radius: 8px; margin-bottom: 2rem; display: inline-block; }
    
    .active-sub-card { background: linear-gradient(135deg, #4f46e5, #3b82f6); color: white; padding: 2rem; border-radius: 16px; display: inline-block; text-align: left; box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4); }
    .active-sub-card h3 { margin-top: 0; font-size: 1.5rem; }
    .badge-restantes { background: white; color: #4f46e5; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 1.2rem; }
    .info-note { background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; font-size: 0.9rem; margin-top: 1rem; }
    
    .pricing-grid { display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap; }
    .pricing-card { background: white; border-radius: 24px; padding: 2rem; width: 320px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); position: relative; transition: transform 0.3s; }
    .pricing-card:hover { transform: translateY(-10px); }
    .pricing-card.popular { border: 2px solid #8b5cf6; box-shadow: 0 20px 40px rgba(139, 92, 246, 0.15); transform: scale(1.05); }
    .pricing-card.popular:hover { transform: scale(1.05) translateY(-10px); }
    
    .popular-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #8b5cf6; color: white; padding: 4px 16px; border-radius: 20px; font-weight: bold; font-size: 0.85rem; }
    .card-header h3 { color: #64748b; font-size: 1.2rem; margin-bottom: 1rem; }
    .price { font-size: 3rem; font-weight: 800; color: #1e293b; }
    .price span { font-size: 1rem; color: #94a3b8; font-weight: normal; }
    
    .features { list-style: none; padding: 0; margin: 2rem 0; text-align: left; }
    .features li { margin-bottom: 1rem; color: #475569; display: flex; align-items: center; }
    .features li i { color: #10b981; margin-right: 10px; }
    
    .btn-buy { width: 100%; padding: 14px; border-radius: 12px; border: none; font-size: 1rem; font-weight: 600; cursor: pointer; background: #f1f5f9; color: #334155; transition: all 0.2s; }
    .btn-buy:hover { background: #e2e8f0; }
    .btn-buy.popular { background: #8b5cf6; color: white; }
    .btn-buy.popular:hover { background: #7c3aed; }

    .payment-container { max-width: 500px; margin: 0 auto; background: white; padding: 2rem; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
    .mock-stripe { margin-top: 2rem; }
    .stripe-card-element { border: 1px solid #cbd5e1; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; background: #f8fafc; color: #94a3b8; }
    .btn-pay { width: 100%; background: #10b981; color: white; border: none; padding: 14px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 1rem; }
    .btn-cancel { width: 100%; background: transparent; border: 1px solid #cbd5e1; color: #64748b; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; }
  `]
})
export class OffresPaiementComponent {
  activeAbonnement: Abonnement | null = null;
  errorMessage = '';
  clientSecret: string | null = null;
  selectedType: TypeAbonnement | null = null;
  
  private accompagnantId = 2; // ID de test

  constructor(private abonnementService: AbonnementService) {
    this.checkActiveSubscription();
  }

  checkActiveSubscription() {
    this.abonnementService.getActiveAbonnement(this.accompagnantId).subscribe({
      next: (abo) => this.activeAbonnement = abo,
      error: () => this.activeAbonnement = null
    });
  }

  buyAbonnement(type: string) {
    this.selectedType = type as TypeAbonnement;
    this.abonnementService.createPaymentIntent(this.selectedType, this.accompagnantId).subscribe({
      next: (res) => {
        this.clientSecret = res.clientSecret;
      },
      error: (err) => {
        this.errorMessage = err.error?.error || "Une erreur est survenue.";
      }
    });
  }

  simulatePaymentSuccess() {
    // Simulation : confirmAbonnement backend appel. Dans la vraie vie, Stripe lance la confirmation d'abord.
    if(this.selectedType && this.clientSecret) {
      this.abonnementService.confirmAbonnement(this.selectedType, this.accompagnantId, this.clientSecret).subscribe({
        next: (abo) => {
          this.activeAbonnement = abo;
          this.clientSecret = null;
        },
        error: (err) => this.errorMessage = err.error?.error || "Erreur de confirmation."
      });
    }
  }
}
