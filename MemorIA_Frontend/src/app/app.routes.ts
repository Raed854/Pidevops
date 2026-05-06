import { Routes, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { HomeComponent } from './home/home.component';
import { DiagnosticComponent } from './diagnostic/diagnostic.component';
import { RapportComponent } from './rapport/rapport.component';
import { SignupComponent } from './signup/signup.component';
import { UsersComponent } from './users/users.component';
import { LoginComponent } from './login/login.component';
import { adminGuard } from './auth/admin.guard';
import { authGuard } from './auth/auth.guard';
import { roleGuard } from './auth/role.guard';
import { AuthService } from './auth/auth.service';
import { ProfilePatientComponent } from './profile-patient/profile-patient.component';
import { ProfileSoignantComponent } from './profile-soignant/profile-soignant.component';
import { ProfileAccompagnantComponent } from './profile-accompagnant/profile-accompagnant.component';
import { DashboardDiagnosticComponent } from './dashboard-diagnostic/dashboard-diagnostic.component';
import { StastiqueDiagnosticComponent } from './stastique-diagnostic/stastique-diagnostic.component';
import { ConfirmationComponent } from './confirmation/confirmation.component';
import { MapComponent } from './map/map.component';
import { TraitementComponent } from './traitement/traitement.component';
import { HistoriquePositionComponent } from './historique-position/historique-position.component';
import { DisponibiliteAccompagnantComponent } from './disponibilite-accompagnant/disponibilite-accompagnant.component';
import { DoctorStatsComponent } from './pages/doctor-stats/doctor-stats.component';
import { ManageSubscriptionsComponent } from './pages/manage-subscriptions/manage-subscriptions.component';
import { ManagePaymentComponent } from './pages/manage-payment/manage-payment.component';
import { ActivitiesFeedComponent } from './pages/activities-feed/activities-feed.component';
import { MessengerComponent } from './pages/messenger/messenger.component';
import { SubscribeComponent } from './pages/subscribe/subscribe.component';
import { CommunityComponent } from './pages/community/community.component';
import { PublicationsManageComponent } from './pages/publications-manage/publications-manage.component';
import { PublicationsFeedComponent } from './pages/publications-feed/publications-feed.component';
import { ActivitiesManageComponent } from './pages/activities-manage/activities-manage.component';
import { TestsCognitifsComponent } from './pagesos/tests-cognitifs/tests-cognitifs.component';
import { GestionTestsComponent } from './pagesos/gestion-tests/gestion-tests.component';
import { PersonalizedTestFormComponent } from './pagesos/personalized-test-form/personalized-test-form.component';
import { TestResultsComponent } from './pagesos/test-results/test-results.component';
import { CalendarViewComponent } from './pagesos/calendar-view/calendar-view.component';
import { TestRunnerComponent } from './pagesos/test-runner/test-runner.component';
import { Test5MotsComponent } from './pagesos/test-5mots/test-5mots.component';
import { TestVisagesComponent } from './pagesos/test-visages/test-visages.component';
import { MotsCroisesComponent } from './pagesos/mots-croises/mots-croises.component';
import { TestMmseComponent } from './pagesos/test-mmse/test-mmse.component';
import { TestOrientationSimplifieComponent } from './pagesos/test-orientation-simplifie/test-orientation-simplifie.component';
import { TestPuzzlesSimplesComponent } from './pagesos/test-puzzles-simples/test-puzzles-simples.component';
import { TestReconnaissanceProchesComponent } from './pagesos/test-reconnaissance-proches/test-reconnaissance-proches.component';
import { TestTriCategoriesComponent } from './pagesos/test-tri-categories/test-tri-categories.component';
import { TriObjetsComponent } from './pagesos/tri-objets/tri-objets.component';
import { AidantMetricsComponent } from './pagesos/aidant-metrics/aidant-metrics.component';
import { MedecinMetricsComponent } from './pagesos/medecin-metrics/medecin-metrics.component';
import { MedicalRecordComponent } from './medical-record/medical-record.component';
import { MedicalRecordFormComponent } from './medical-record-form/medical-record-form.component';

// Alertes and Planning Components
import { DoctorPlanningComponent } from './alertes/doctor_planning/components/doctor-planning/doctor-planning.component';
import { PatientPlanningComponent } from './alertes/doctor_planning/components/patient-planning/patient-planning.component';
import { CaregiverPlanningComponent } from './alertes/doctor_planning/components/caregiver-planning/caregiver-planning.component';
import { AlertesComponent } from './alertes/alertes.component';
import { DoctorAlertesComponent } from './alertes/doctor-alertes-page/doctor-alertes.component';
import { CaregiverAlertesComponent } from './alertes/caregiver-alertes-page/caregiver-alertes.component';
import { PatientAlertesComponent } from './alertes/patient-alertes-page/patient-alertes.component';
import { PatientListComponent } from './alertes/patient-list/patient-list.component';

// Helper function to normalize role names
const normalizeRole = (rawRole?: string | null): 'DOCTOR' | 'CAREGIVER' | 'PATIENT' | null => {
  if (!rawRole) {
    return null;
  }
  const role = rawRole.replace(/^ROLE_/i, '').toUpperCase();
  if (role === 'SOIGNANT' || role === 'DOCTOR') {
    return 'DOCTOR';
  }
  if (role === 'ACCOMPAGNANT' || role === 'CAREGIVER') {
    return 'CAREGIVER';
  }
  if (role === 'PATIENT') {
    return 'PATIENT';
  }
  return null;
};

// Custom guards for role-based redirects
const planningRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const role = normalizeRole(authService.getCurrentUser()?.role);

  if (role === 'DOCTOR') {
    return router.createUrlTree(['/doctor_planning']);
  }
  if (role === 'CAREGIVER') {
    return router.createUrlTree(['/caregiver_planning']);
  }
  if (role === 'PATIENT') {
    return router.createUrlTree(['/patient_planning']);
  }
  return router.createUrlTree(['/home']);
};

const alertsRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const role = normalizeRole(authService.getCurrentUser()?.role);

  if (role === 'DOCTOR') {
    return router.createUrlTree(['/doctor-alertes']);
  }
  if (role === 'CAREGIVER') {
    return router.createUrlTree(['/caregiver-alertes']);
  }
  if (role === 'PATIENT') {
    return router.createUrlTree(['/patient-alertes']);
  }
  return true;
};

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'diagnostic', component: DiagnosticComponent, canActivate: [authGuard, roleGuard('PATIENT')] },
  { path: 'rapport', component: RapportComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'users', component: UsersComponent, canActivate: [adminGuard] },
  { path: 'dashboard_diagnostic', component: DashboardDiagnosticComponent, canActivate: [authGuard, roleGuard('SOIGNANT')] },
  { path: 'statistiques', component: StastiqueDiagnosticComponent, canActivate: [authGuard, roleGuard('SOIGNANT')] },
  { path: 'profile/patient', component: ProfilePatientComponent, canActivate: [authGuard, roleGuard('PATIENT')] },
  { path: 'profile/soignant', component: ProfileSoignantComponent, canActivate: [authGuard, roleGuard('SOIGNANT')] },
  { path: 'profile/accompagnant', component: ProfileAccompagnantComponent, canActivate: [authGuard, roleGuard('ACCOMPAGNANT')] },
  { path: 'medical-record', component: MedicalRecordComponent, canActivate: [authGuard, roleGuard('PATIENT')] },
  { path: 'medical-record-form', component: MedicalRecordFormComponent, canActivate: [authGuard, roleGuard('PATIENT')] },
  { path: 'dossier-medical', component: MedicalRecordComponent, canActivate: [authGuard, roleGuard('PATIENT')] },
  { path: 'dossier-medical/patient/:patId', component: MedicalRecordComponent, canActivate: [authGuard, roleGuard('PATIENT')] },
  { path: 'dossier-medical/new', component: MedicalRecordFormComponent, canActivate: [authGuard, roleGuard('PATIENT')] },
  { path: 'dossier-medical/edit/:id', component: MedicalRecordFormComponent, canActivate: [authGuard, roleGuard('PATIENT')] },
  { path: 'confirmation', component: ConfirmationComponent, canActivate: [authGuard, roleGuard('PATIENT')] },
  { path: 'map', component: MapComponent },
  { path: 'traitement', component: TraitementComponent, canActivate: [authGuard, roleGuard('SOIGNANT')] },
  { path: 'historique-positions', component: HistoriquePositionComponent },
  { path: 'disponibilite', component: DisponibiliteAccompagnantComponent, canActivate: [authGuard, roleGuard('ACCOMPAGNANT')] },
  { path: 'doctor-stats', component: DoctorStatsComponent, canActivate: [authGuard, roleGuard('SOIGNANT')] },
  { path: 'manage-subscriptions', component: ManageSubscriptionsComponent, canActivate: [authGuard, roleGuard('SOIGNANT')] },
  { path: 'manage-payment', component: ManagePaymentComponent, canActivate: [authGuard, roleGuard('ACCOMPAGNANT')] },
  { path: 'subscribe', component: SubscribeComponent, canActivate: [authGuard, roleGuard('ACCOMPAGNANT')] },
  { path: 'activities-feed', component: ActivitiesFeedComponent, canActivate: [authGuard, roleGuard('ACCOMPAGNANT')] },
  { path: 'messenger', component: MessengerComponent, canActivate: [authGuard, roleGuard('ACCOMPAGNANT')] },
  { path: 'communaute', component: CommunityComponent, canActivate: [authGuard, roleGuard('SOIGNANT')] },
  { path: 'publications-manage', component: PublicationsManageComponent, canActivate: [authGuard, roleGuard('SOIGNANT')] },
  { path: 'publications-feed', component: PublicationsFeedComponent },
  { path: 'activities-manage', component: ActivitiesManageComponent, canActivate: [authGuard, roleGuard('SOIGNANT')] },

  // Planning Routes
  { path: 'planning', component: HomeComponent, canActivate: [authGuard, planningRedirectGuard] },
  { path: 'doctor_planning', component: DoctorPlanningComponent, canActivate: [authGuard, roleGuard('SOIGNANT')] },
  { path: 'doctor-planning', redirectTo: '/doctor_planning', pathMatch: 'full' },
  { path: 'patient_planning', component: PatientPlanningComponent, canActivate: [authGuard, roleGuard('PATIENT')] },
  { path: 'patient-planning', redirectTo: '/patient_planning', pathMatch: 'full' },
  { path: 'caregiver_planning', component: CaregiverPlanningComponent, canActivate: [authGuard, roleGuard('ACCOMPAGNANT')] },
  { path: 'caregiver-planning', redirectTo: '/caregiver_planning', pathMatch: 'full' },

  // Alertes Routes
  { path: 'alertes', component: AlertesComponent, canActivate: [authGuard, alertsRedirectGuard] },
  { path: 'doctor-alertes', component: DoctorAlertesComponent, canActivate: [authGuard, roleGuard('SOIGNANT')] },
  { path: 'doctor_alertes', redirectTo: '/doctor-alertes', pathMatch: 'full' },
  { path: 'patient-alertes', component: PatientAlertesComponent, canActivate: [authGuard, roleGuard('PATIENT')] },
  { path: 'patient_alertes', redirectTo: '/patient-alertes', pathMatch: 'full' },
  { path: 'caregiver-alertes', component: CaregiverAlertesComponent, canActivate: [authGuard, roleGuard('ACCOMPAGNANT')] },
  { path: 'caregiver_alertes', redirectTo: '/caregiver-alertes', pathMatch: 'full' },

  // Patient List Route
  { path: 'patient-list', component: PatientListComponent, canActivate: [authGuard] },
  { path: 'patient_list', redirectTo: '/patient-list', pathMatch: 'full' },
  
  // Cognitive Tests Routes
  { path: 'page-tests-cognitif', component: TestsCognitifsComponent },
  { path: 'personalized-test', component: PersonalizedTestFormComponent },
  { path: 'gestion-tests', component: GestionTestsComponent },
  { path: 'cognitive-test/1', component: TestMmseComponent },
  { path: 'cognitive-test/10', component: TestOrientationSimplifieComponent },
  { path: 'cognitive-test/17', component: TestPuzzlesSimplesComponent },
  { path: 'cognitive-test/19', component: TestTriCategoriesComponent },
  { path: 'cognitive-test/20', component: TestReconnaissanceProchesComponent },
  { path: 'cognitive-test/27', component: TriObjetsComponent },
  { path: 'cognitive-test/6', component: MotsCroisesComponent },
  { path: 'cognitive-test/:testId', component: TestRunnerComponent },
  { path: 'test-5mots', component: Test5MotsComponent },
  { path: 'test-visages', component: TestVisagesComponent },
  { path: 'test-mots-croises', component: MotsCroisesComponent },
  { path: 'test-tri-objets', component: TriObjetsComponent },
  { path: 'calendar', component: CalendarViewComponent },
  { path: 'aidant-metrics', component: AidantMetricsComponent },
  { path: 'medecin-metrics', component: MedecinMetricsComponent },
  { path: 'test-results/:sessionId', component: TestResultsComponent },

  // Wildcard route - must be last
  { path: '**', redirectTo: '/home' }
];
