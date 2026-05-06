import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { PersonalizedTestItem } from '../models/cognitive-models';

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${environment.geminiApiKey}`;

@Injectable({ providedIn: 'root' })
export class GeminiService {
    private http = inject(HttpClient);

    generateTestItems(
        testType: string,
        stage: string,
        patientName: string,
        count: number = 3
    ): Observable<PersonalizedTestItem[]> {
        const prompt = this.buildPrompt(testType, stage, patientName, count);

        const body = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        };

        return this.http.post<any>(GEMINI_URL, body).pipe(
            map(res => {
                const text = res.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
                return this.parseItems(text, testType);
            })
        );
    }

    private buildPrompt(testType: string, stage: string, patientName: string, count: number): string {
        const stageDesc: Record<string, string> = {
            'STABLE': 'légère (stade précoce)',
            'MOYEN': 'modérée (stade intermédiaire)',
            'CRITIQUE': 'sévère (stade avancé)'
        };

        const typeContext: Record<string, string> = {
            'CROSSWORDS': `mots croisés adaptés à un patient Alzheimer au stade ${stageDesc[stage] || stage}. Génère ${count} mots simples avec leur indice/définition. Pour chaque mot, le score doit être entre 1 et 3.`,
            'SCENTS': `test de reconnaissance d'odeurs pour un patient Alzheimer au stade ${stageDesc[stage] || stage}. Génère ${count} odeurs courantes (café, lavande, citron...) avec une question et une réponse. Le score doit être entre 1 et 2.`,
            'SONGS': `test de mémoire musicale pour un patient Alzheimer au stade ${stageDesc[stage] || stage}. Génère ${count} questions sur des chansons françaises populaires des années 1950-1980 (adaptées aux personnes âgées). Le score doit être entre 1 et 3.`,
            'MEMORY': `test de mémoire visuelle (paires d'images) pour un patient Alzheimer au stade ${stageDesc[stage] || stage}. Génère ${count} paires d'objets simples du quotidien avec description. Le score doit être de 2 par paire.`,
            'FACES': `test de reconnaissance de visages pour un patient nommé ${patientName}, au stade ${stageDesc[stage] || stage}. Génère ${count} questions sur des personnes connues (médecin, famille, voisin). Le score doit être entre 1 et 3.`,
            'RELATIVES': `test de reconnaissance des proches pour ${patientName}, au stade ${stageDesc[stage] || stage}. Génère ${count} questions sur des proches (fils, fille, conjoint...). Le score doit être entre 1 et 3.`
        };

        return `Tu es un expert en neuropsychologie et en création de tests cognitifs pour les patients atteints d'Alzheimer.

Crée un ${typeContext[testType] || `test cognitif de type ${testType}`}

IMPORTANT : Réponds UNIQUEMENT avec un tableau JSON valide. Aucun texte avant ou après.
Format requis :
[
  {
    "question": "La question à poser au patient",
    "reponse": "La réponse attendue",
    "score": 2,
    "metadata": {}
  }
]

${testType === 'CROSSWORDS' ? `Pour les mots croisés, metadata doit contenir: {"direction": "HORIZONTAL", "position": "1,1"}` : ''}
${testType === 'SCENTS' ? `Pour les odeurs, metadata doit contenir: {"description": "contexte de l'odeur"}` : ''}
${testType === 'SONGS' ? `Pour les chansons, metadata doit contenir: {"titre": "titre chanson", "artiste": "artiste", "contexte": "période/contexte"}` : ''}
${testType === 'MEMORY' ? `Pour le memory, metadata doit contenir: {"description": "description de l'image"}` : ''}

Adapte le niveau de difficulté au stade ${stageDesc[stage] || stage} de la maladie.`;
    }

    private parseItems(text: string, testType: string): PersonalizedTestItem[] {
        try {
            // Extraire le JSON du texte (enlever les blocs markdown si présents)
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) return [];
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed.map((item: any) => ({
                question: item.question ?? '',
                reponse: item.reponse ?? '',
                score: item.score ?? 1,
                metadata: item.metadata ?? {}
            }));
        } catch {
            return [];
        }
    }
}
