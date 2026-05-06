import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ── POST /api/treatments body (matches TreatmentCreateRequest DTO) ──
export interface CreateTraitementBody {
  idUser: number;
  titre: string;
  alerteActive?: boolean;
  typeAlerte?: string;
}

// ── Response from GET /api/treatments ────────────
export interface TraitementResponse {
  idTraitement: number;
  titre?: string;
  alerteActive?: boolean;
  typeAlerte?: string;
  dateCreation?: string;
}

// ── Affectation response (includes embedded traitements object) ──
export interface AffectationResponse {
  idAffectation: number;
  traitements?: TraitementResponse;
  statut: string;
  dosage: string;
  frequence: string;
  voieAdministration: string;
  dateAffectation?: string;
  dateFinPrevue?: string;
  notes?: string;
}

// ── Display model for the component ──
export interface TraitementDisplay {
  idAffectation: number;
  idTraitement: number;
  titre: string;
  alerteActive: boolean;
  typeAlerte: string;
  dateCreation: string;
  patientNom: string;
  accompagnantNom: string;
  statut: string;
  dosage: string;
  frequence: string;
  voieAdministration: string;
  dateFinPrevue: string;
  notes: string;
}

// ── Full payload from the component ───
export interface CreateTraitementRequest {
  idUser: number;
  titre: string;
  alerteActive: boolean;
  typeAlerte?: string;
  patientId: number;
  accompagnantId: number;
  dosage: string;
  frequence: string;
  voieAdministration: string;
  dateFinPrevue?: string;   // ISO datetime e.g. 2026-05-12T00:00:00
  instructions?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TraitementService {
  private readonly apiUrl = `${environment.apiUrl}/api/treatments`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Crée le traitement PUIS l'affectation patient ↔ accompagnant.
   * 1) POST /api/treatments            → body {idUser, titre, alerteActive, typeAlerte}
   * 2) POST /api/treatments/patient-accompagnant  → query params
   */
  create(req: CreateTraitementRequest): Observable<AffectationResponse> {
    const body: CreateTraitementBody = {
      idUser:       req.idUser,
      titre:        req.titre,
      alerteActive: req.alerteActive,
      typeAlerte:   req.typeAlerte || undefined,
    };

    return this.http.post<TraitementResponse>(this.apiUrl, body).pipe(
      switchMap(traitement => {
        let params = new HttpParams()
          .set('treatmentId',        traitement.idTraitement.toString())
          .set('patientId',          req.patientId.toString())
          .set('accompagnantId',     req.accompagnantId.toString())
          .set('dosage',             req.dosage)
          .set('frequence',          req.frequence)
          .set('voieAdministration', req.voieAdministration);

        if (req.dateFinPrevue) params = params.set('dateFinPrevueStr', req.dateFinPrevue);
        if (req.instructions) params = params.set('instructions', req.instructions);
        if (req.notes) params = params.set('notes', req.notes);

        return this.http.post<AffectationResponse>(
          `${this.apiUrl}/patient-accompagnant`, null, { params }
        );
      })
    );
  }

  getAll(): Observable<TraitementResponse[]> {
    return this.http.get<TraitementResponse[]>(this.apiUrl);
  }

  /** GET /api/treatments/patient/{patientId} */
  getByPatient(patientId: number): Observable<AffectationResponse[]> {
    return this.http.get<AffectationResponse[]>(`${this.apiUrl}/patient/${patientId}`);
  }

  /** GET /api/treatments/accompagnant/{accompagnantId} */
  getByAccompagnant(accompagnantId: number): Observable<AffectationResponse[]> {
    return this.http.get<AffectationResponse[]>(`${this.apiUrl}/accompagnant/${accompagnantId}`);
  }

  /** GET /api/treatments/accompagnant/{accompagnantId}/patients/names */
  getPatientNamesByAccompagnant(accompagnantId: number): Observable<{id: number; nom: string; prenom: string; telephone?: string; email?: string}[]> {
    return this.http.get<{id: number; nom: string; prenom: string; telephone?: string; email?: string}[]>(
      `${this.apiUrl}/accompagnant/${accompagnantId}/patients/names`
    );
  }

  /** PATCH /api/treatments/affectation/{affectationId}/status?statut=TERMINE|ANNULE */
  updateAffectationStatus(affectationId: number, statut: string): Observable<AffectationResponse> {
    const params = new HttpParams().set('statut', statut);
    return this.http.patch<AffectationResponse>(
      `${this.apiUrl}/affectation/${affectationId}/status`, null, { params }
    );
  }

  /** DELETE /api/treatments/affectation/{affectationId} */
  deleteAffectation(affectationId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/affectation/${affectationId}`);
  }
}
