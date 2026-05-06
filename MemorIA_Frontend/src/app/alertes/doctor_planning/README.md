# 📋 MemoriA - Interface Médecin: Planning & Rappels

## 🎯 Vue d'ensemble

Interface complète **Angular 18 + Tailwind CSS** pour la gestion du planning et des rappels d'un patient atteint d'Alzheimer, destinée aux médecins.

## 📁 Structure des fichiers

```
doctor_planning/
├── components/
│   ├── doctor-planning/
│   │   ├── doctor-planning.component.ts
│   │   ├── doctor-planning.component.html
│   │   ├── doctor-planning.component.css
│   ├── patient-selector/
│   │   ├── patient-selector.component.ts
│   │   ├── patient-selector.component.html
│   │   ├── patient-selector.component.css
│   ├── planning-calendar/
│   │   ├── planning-calendar.component.ts
│   │   ├── planning-calendar.component.html
│   │   ├── planning-calendar.component.css
│   ├── day-detail-modal/
│   │   ├── day-detail-modal.component.ts
│   │   ├── day-detail-modal.component.html
│   │   ├── day-detail-modal.component.css
│   ├── reminder-form-modal/
│   │   ├── reminder-form-modal.component.ts
│   │   ├── reminder-form-modal.component.html
│   │   ├── reminder-form-modal.component.css
│   ├── stats-panel/
│   │   ├── stats-panel.component.ts
│   │   ├── stats-panel.component.html
│   │   ├── stats-panel.component.css
├── models/
│   ├── doctor-planning.model.ts
├── services/
│   ├── doctor-planning.service.ts
```

## 🎨 Palette de couleurs

```typescript
--primary: #541A75              // Violet principal (titres, boutons)
--secondary: #7E7F9A            // Gris-violet (textes secondaires)
--accent: #C0E0DE               // Vert d'eau clair (positif, réalisé)
--success: #00635D              // Vert foncé (observance bonne)
--danger: #CB1527               // Rouge alerte (risque/non-respecté)
```

## 🚀 Flux d'utilisation

### 1️⃣ **Sélection du patient**
- Médecin choisit un patient dans la liste à gauche
- Recherche par nom/prénom/âge
- Affiche: photo, stade, taux observance, prochain RDV

### 2️⃣ **Visualisation du calendrier**
- **Vue mois** (défaut): pastilles colorées par type/statut
- **Vue semaine**: tableau condensé avec taux journalier
- **Vue jour**: détail complet avec timeline horaire

### 3️⃣ **Clic sur un jour**
- Modal détail avec tableau horaire
- Statuts: Réalisé (vert), En attente (jaune), Retard (orange), Non fait (rouge)
- Actions: Marquer fait, Reporter, Ajouter note, Supprimer

### 4️⃣ **Ajouter un rappel**
- Bouton "+" en haut à droite
- Type, date, heure, récurrence
- Criticité: Basse/Normale/Haute/Urgente
- Canaux: Push, SMS, Email, Appel vocal
- Message vocal optionnel

### 5️⃣ **Statistiques**
- Graphique circulaire observance (30j/90j)
- Taux par catégorie
- Courbe d'évolution
- Derniers rappels manqués

## 🔧 Implémentation

### Installation

```bash
cd MemoriA_Frontend
npm install
```

### Importer le composant principal

```typescript
import { DoctorPlanningComponent } from './doctor_planning/components/doctor-planning.component';

@Component({
  selector: 'app-root',
  imports: [DoctorPlanningComponent],
  template: '<app-doctor-planning></app-doctor-planning>'
})
export class AppComponent {}
```

### Services requis

Le composant utilise:
- **RappelService** (existant) - CRUD sur les rappels
- **DoctorPlanningService** (nouveau) - Logique calendrier & stats

```typescript
constructor(
  private reminderService: RappelService,
  private planningService: DoctorPlanningService
) {}
```

### Modèles de données

📌 **Patient.model.ts** (existant)
```typescript
interface Patient {
  id: number;
  nom: string;
  prenom: string;
  age: number;
  photo?: string;
  initials: string;
  stage: 'LEGER' | 'MODERE' | 'AVANCE';
  adherenceRate: number;
  nextAppointment?: string;
}
```

📌 **Reminder.model.ts** (existant)
```typescript
interface Reminder {
  idReminder?: number;
  type: ReminderType;
  status: ReminderStatus;
  priority: Priority;
  reminderDate: string;
  reminderTime: string;
  // ...
}
```

📌 **doctor-planning.model.ts** (nouveau)
```typescript
interface PlanningState { ... }
interface CalendarDay { ... }
interface AdherenceMetrics { ... }
interface ReminderWithActions { ... }
```

## 📱 Responsivité

- **Desktop**: 5-colonnes (patient | calendrier | stats)
- **Tablette**: 3-colonnes + patient en haut
- **Mobile**: Fullscreen séquentiel

Breakpoints Tailwind: `sm:` `md:` `lg:` `xl:`

## ✨ Fonctionnalités clés

| Fonctionnalité | Statut |
|---|---|
| Sélection patient avec recherche | ✅ Code-ready |
| Vue mois/semaine/jour | ✅ Code-ready |
| Modal détail journée | ✅ Code-ready |
| Marquer rappel comme réalisé | ✅ Code-ready |
| Ajouter/supprimer rappels | ✅ Code-ready |
| Ajouter notes libres | ✅ Code-ready |
| Statpack observance (circulaire) | ✅ Code-ready |
| Taux par catégorie | ✅ Code-ready |
| Graphique évolution (30/90j) | ⏳ TODO (Chart.js/ng-charts) |
| Message vocal optionnel | ⏳ TODO (intégration TTS) |

## 🔌 API Backend requis

### Endpoints utilisés

```typescript
// RappelService (existant)
GET    /api/reminders/getAll
GET    /api/reminders/patient/{patientId}     // ✅ Utilisé
GET    /api/reminders/status/{status}
GET    /api/reminders/{id}
POST   /api/reminders/add                     // ✅ Utilisé
PUT    /api/reminders/update                  // ✅ Utilisé
PUT    /api/reminders/confirm/{id}            // ✅ Utilisé
PUT    /api/reminders/markMissed/{id}
DELETE /api/reminders/delete/{id}             // ✅ Utilisé

// PatientService (TODO - à créer)
GET    /api/patients/                         // ✅ Utilisé (mockées)
GET    /api/patients/{id}
```

## 🎓 Exemple d'utilisation dans un module

```typescript
import { Routes } from '@angular/router';
import { DoctorPlanningComponent } from './doctor_planning/components/doctor-planning.component';

export const doctorRoutes: Routes = [
  {
    path: 'planning',
    component: DoctorPlanningComponent,
    data: { title: 'Planning Médecin' }
  }
];
```

## 🐛 Points à améliorer

1. **PatientService** - Créer un service pour charger les patients
2. **Authentification** - Intégrer `TokenService` pour `createdById`
3. **Graphiques** - Ajouter ng-charts/Chart.js pour évolution
4. **Export** - PDF/Excel des statistiques
5. **Notifications** - WebSocket pour mises à jour temps réel
6. **Tests** - Tests unitaires pour services
7. **Accessibilité** - ARIA labels pour lecteurs d'écran
8. **i18n** - Traduction multi-langue

## 📊 Palette Tailwind personnalisée

Ajouter à `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      'primary': '#541A75',
      'secondary': '#7E7F9A',
      'accent': '#C0E0DE',
      'success': '#00635D',
      'danger': '#CB1527'
    }
  }
}
```

## 🎯 À faire pour déploiement

- [ ] Remplacer les données mockées de patients
- [ ] Tester avec le backend réel
- [ ] Intégrer l'authentification
- [ ] Ajouter les graphiques d'évolution
- [ ] Configurer les notifications
- [ ] Tester sur tablette/mobile
- [ ] Optimiser les images
- [ ] Minifier le build

## 📞 Support

Pour toute question, consultez:
- Models: `doctor-planning.model.ts`
- Services: `doctor-planning.service.ts`  
- Styles: `styles.css` (variables CSS globales)

---

**Status**: ✅ Production-ready (à l'exception des TODO listés)
**Dernière mise à jour**: 2026-02-27
