import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActiviteService } from '../../../services/activite.service';
import { Activite } from '../../../models/activite.model';

@Component({
  selector: 'app-activite-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="activite-container">
      <div class="header">
        <h2>Gestion des Activités</h2>
        <button class="btn-primary" (click)="toggleForm()">
          <i class="fa fa-plus"></i> Nouvelle Activité
        </button>
      </div>

      <!-- Formulaire d'ajout/modification -->
      <div class="form-card" *ngIf="showForm">
        <h3>{{ editMode ? 'Modifier' : 'Créer' }} une activité</h3>
        <form (ngSubmit)="saveActivite()">
          <div class="form-group">
            <label>Titre</label>
            <input type="text" [(ngModel)]="currentActivite.titre" name="titre" required class="form-control" />
          </div>
          <div class="form-group">
            <label>Type</label>
            <select [(ngModel)]="currentActivite.type" name="type" class="form-control">
              <option value="THERAPIE">Thérapie</option>
              <option value="CONSULTATION">Consultation</option>
              <option value="ATELIER">Atelier Groupe</option>
            </select>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea [(ngModel)]="currentActivite.description" name="description" rows="3" class="form-control"></textarea>
          </div>
          <div class="form-group">
            <label>Image URL</label>
            <input type="text" [(ngModel)]="currentActivite.image" name="image" class="form-control" />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-success">Enregistrer</button>
            <button type="button" class="btn-secondary" (click)="toggleForm()">Annuler</button>
          </div>
        </form>
      </div>

      <!-- Grille des activités -->
      <div class="grid-container">
        <div class="card" *ngFor="let activite of activites">
          <img [src]="activite.image || 'assets/images/default-activity.png'" alt="Activité" class="card-img" />
          <div class="card-body">
            <span class="badge">{{ activite.type }}</span>
            <h4>{{ activite.titre }}</h4>
            <p>{{ activite.description }}</p>
            <div class="card-actions">
              <button class="btn-edit" (click)="editActivite(activite)">Modifier</button>
              <button class="btn-delete" (click)="deleteActivite(activite.id!)">Supprimer</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .activite-container { padding: 2rem; background-color: #f8f9fa; min-height: 100vh; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    h2 { color: #2c3e50; font-family: 'Inter', sans-serif; font-weight: 700; }
    .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; transition: transform 0.2s; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(118, 75, 162, 0.4); }
    
    .form-card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); margin-bottom: 2rem; animation: fadeIn 0.3s ease-in-out; }
    .form-group { margin-bottom: 1.5rem; }
    .form-control { width: 100%; padding: 12px; border: 1px solid #e1e8ed; border-radius: 8px; font-size: 1rem; transition: border-color 0.3s; }
    .form-control:focus { border-color: #667eea; outline: none; }
    .form-actions { display: flex; gap: 1rem; }
    .btn-success { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
    .btn-secondary { background: #94a3b8; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
    
    .grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2rem; }
    .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); transition: transform 0.3s; }
    .card:hover { transform: translateY(-5px); }
    .card-img { width: 100%; height: 180px; object-fit: cover; }
    .card-body { padding: 1.5rem; }
    .badge { background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
    h4 { margin: 1rem 0 0.5rem; color: #1e293b; }
    p { color: #64748b; font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.5; }
    .card-actions { display: flex; justify-content: space-between; border-top: 1px solid #f1f5f9; padding-top: 1rem; }
    .btn-edit { background: none; border: none; color: #3b82f6; cursor: pointer; font-weight: 600; }
    .btn-delete { background: none; border: none; color: #ef4444; cursor: pointer; font-weight: 600; }
    
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class ActiviteManagerComponent implements OnInit {
  activites: Activite[] = [];
  showForm = false;
  editMode = false;
  currentActivite: Activite = { titre: '', description: '', image: '', type: 'THERAPIE' };

  // Simulation. Remplacer par l'ID réel après auth
  private doctorId = 1;

  constructor(private activiteService: ActiviteService) { }

  ngOnInit() {
    this.loadActivites();
  }

  loadActivites() {
    this.activiteService.getActivitesByDoctor(this.doctorId).subscribe({
      next: (data) => this.activites = data,
      error: (err) => console.error("Erreur chargement activites", err)
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.resetForm();
    }
  }

  editActivite(activite: Activite) {
    this.currentActivite = { ...activite };
    this.editMode = true;
    this.showForm = true;
  }

  saveActivite() {
    // Ajouter id doctor
    this.currentActivite.doctor = { id: this.doctorId };
    this.activiteService.createActivite(this.currentActivite).subscribe(() => {
      this.loadActivites();
      this.showForm = false;
      this.resetForm();
    });
  }

  deleteActivite(id: number) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette activité ?")) {
      this.activiteService.deleteActivite(id).subscribe(() => {
        this.loadActivites();
      });
    }
  }

  resetForm() {
    this.currentActivite = { titre: '', description: '', image: '', type: 'THERAPIE' };
    this.editMode = false;
  }
}
