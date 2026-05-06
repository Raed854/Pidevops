package MemorIA.service;

import MemorIA.dto.DiagnosticSubmissionRequest;
import MemorIA.dto.DiagnosticSubmissionResponse;
import MemorIA.dto.PatientAnswerSubmission;
import MemorIA.entity.User;
import MemorIA.entity.diagnostic.Diagnostic;
import MemorIA.entity.diagnostic.Notification;
import MemorIA.entity.diagnostic.PatientAnswer;
import MemorIA.entity.diagnostic.Question;
import MemorIA.entity.diagnostic.Rapport;
import MemorIA.repository.DiagnosticRepository;
import MemorIA.repository.NotificationRepository;
import MemorIA.repository.PatientAnswerRepository;
import MemorIA.repository.QuestionRepository;
import MemorIA.repository.RapportRepository;
import MemorIA.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Service pour gérer la soumission complète d'un diagnostic avec calcul automatique des scores
 */
@Service
public class DiagnosticSubmissionService {

    private final UserRepository userRepository;
    private final DiagnosticRepository diagnosticRepository;
    private final QuestionRepository questionRepository;
    private final PatientAnswerRepository patientAnswerRepository;
    private final RapportRepository rapportRepository;
    private final NotificationRepository notificationRepository;
    private final AnswerVerificationService verificationService;

    public DiagnosticSubmissionService(
            UserRepository userRepository,
            DiagnosticRepository diagnosticRepository,
            QuestionRepository questionRepository,
            PatientAnswerRepository patientAnswerRepository,
            RapportRepository rapportRepository,
            NotificationRepository notificationRepository,
            AnswerVerificationService verificationService) {
        this.userRepository = userRepository;
        this.diagnosticRepository = diagnosticRepository;
        this.questionRepository = questionRepository;
        this.patientAnswerRepository = patientAnswerRepository;
        this.rapportRepository = rapportRepository;
        this.notificationRepository = notificationRepository;
        this.verificationService = verificationService;
    }

    /**
     * Soumet un diagnostic complet avec toutes les réponses du patient
     * 
     * @param request La requête contenant userId, titre et liste des réponses
     * @return La réponse avec le diagnostic créé, les réponses enregistrées et les scores calculés
     */
    @Transactional
    public DiagnosticSubmissionResponse submitDiagnostic(DiagnosticSubmissionRequest request) {
        // Valider les données d'entrée
        if (request.getUserId() == null) {
            throw new IllegalArgumentException("User ID est requis");
        }
        if (request.getReponses() == null || request.getReponses().isEmpty()) {
            throw new IllegalArgumentException("Au moins une réponse est requise");
        }

        // Vérifier que l'utilisateur existe
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec ID: " + request.getUserId()));

        LocalDateTime startTime = LocalDateTime.now();

        // 1. Créer automatiquement le diagnostic
        Diagnostic diagnostic = new Diagnostic();
        diagnostic.setTitre(request.getTitre() != null ? request.getTitre() : "Diagnostic - " + startTime);
        diagnostic.setDateDebut(startTime);
        diagnostic.setDateDiagnostic(new Date());
        diagnostic.setUser(user);
        diagnostic = diagnosticRepository.save(diagnostic);

        // 2. Traiter toutes les réponses et calculer les scores
        List<PatientAnswer> patientAnswers = new ArrayList<>();
        double scoreTotal = 0.0;
        double scoreMaximum = 0.0;
        int questionCount = 0;
        int autoScoredCount = 0;

        for (PatientAnswerSubmission answerSubmission : request.getReponses()) {
            // Récupérer la question
            Question question = questionRepository.findById(answerSubmission.getQuestionId())
                    .orElseThrow(() -> new RuntimeException("Question non trouvée avec ID: " + answerSubmission.getQuestionId()));

            // Créer la réponse du patient
            PatientAnswer patientAnswer = new PatientAnswer();
            patientAnswer.setDiagnostic(diagnostic);
            patientAnswer.setQuestion(question);
            patientAnswer.setReponseText(answerSubmission.getReponseText());
            patientAnswer.setTempsReponseSecondes(answerSubmission.getTempsReponseSecondes());

            // Calculer le score automatiquement
            Double score = verificationService.verifyAnswer(question, answerSubmission.getReponseText());

            if (score != null) {
                // Ajuster le score en fonction du temps de réponse
                Double adjustedScore = adjustScoreBasedOnTime(score, answerSubmission.getTempsReponseSecondes());
                patientAnswer.setScoreObtenu(adjustedScore);
                scoreTotal += adjustedScore;
                scoreMaximum += 5.0; // Seules les questions auto-évaluées comptent dans le maximum
                autoScoredCount++;
            } else {
                // Score manuel requis - ne pas compter dans le pourcentage automatique
                patientAnswer.setScoreObtenu(null);
            }

            // Sauvegarder la réponse
            patientAnswer = patientAnswerRepository.save(patientAnswer);
            patientAnswers.add(patientAnswer);

            questionCount++;
        }

        // 3. Finaliser le diagnostic avec les statistiques
        LocalDateTime endTime = LocalDateTime.now();
        diagnostic.setDateFin(endTime);
        
        long durationMinutes = ChronoUnit.MINUTES.between(startTime, endTime);
        diagnostic.setDureeMinutes((double) durationMinutes);

        // Calculer le pourcentage de réussite
        double pourcentageReussite = (scoreMaximum > 0) ? (scoreTotal / scoreMaximum * 100.0) : 0.0;
        diagnostic.setPourcentageAlzeimer(100.0 - pourcentageReussite); // Inverse pour le risque

        // Déterminer le niveau de risque
        String riskLevel = determineRiskLevel(pourcentageReussite);
        diagnostic.setRiskLevel(riskLevel);

        // Score AI = réponses + bonus labyrinthe (+10 si complété), plafonné à 100
        boolean mazeBonus = Boolean.TRUE.equals(request.getMazeCompleted());
        double aiScore = Math.min(100.0, pourcentageReussite + (mazeBonus ? 10.0 : 0.0));
        diagnostic.setAiScore(aiScore);

        diagnostic = diagnosticRepository.save(diagnostic);

        // 4. Créer automatiquement le rapport
        Rapport rapport = createRapport(diagnostic, scoreTotal, scoreMaximum, pourcentageReussite, patientAnswers.size());

        // 5. Envoyer des notifications aux docteurs pour validation
        int notificationsSent = sendNotificationsToDoctors(rapport, user);

        // 6. Préparer la réponse
        DiagnosticSubmissionResponse response = new DiagnosticSubmissionResponse();
        response.setDiagnostic(diagnostic);
        response.setRapport(rapport);
        response.setPatientAnswers(patientAnswers);
        response.setScoreTotal(scoreTotal);
        response.setScoreMaximum(scoreMaximum);
        response.setPourcentageReussite(pourcentageReussite);
        response.setNotificationsSent(notificationsSent);
        response.setMessage(String.format(
                "Diagnostic créé avec succès. %d réponses enregistrées. Score: %.2f/%.2f (%.1f%%). Rapport généré et %d notification(s) envoyée(s) aux docteurs.",
                questionCount, scoreTotal, scoreMaximum, pourcentageReussite, notificationsSent
        ));

        return response;
    }

    /**
     * Crée automatiquement un rapport basé sur le diagnostic
     */
    private Rapport createRapport(Diagnostic diagnostic, double scoreTotal, double scoreMaximum, 
                                  double pourcentageReussite, int numberOfQuestions) {
        Rapport rapport = new Rapport();
        rapport.setTitre("Rapport - " + diagnostic.getTitre());
        rapport.setDiagnostic(diagnostic);
        rapport.setDateGeneration(LocalDateTime.now());
        rapport.setValideParMedecin(false); // En attente de validation
        
        // Générer un résumé automatique
        String resumer = generateRapportSummary(diagnostic, scoreTotal, scoreMaximum, 
                                               pourcentageReussite, numberOfQuestions);
        rapport.setResumer(resumer);
        
        // Générer une analyse détaillée
        String analyseDetaillee = generateDetailedAnalysis(diagnostic, scoreTotal, scoreMaximum, 
                                                           pourcentageReussite, numberOfQuestions);
        rapport.setAnalyseDetaillee(analyseDetaillee);
        
        return rapportRepository.save(rapport);
    }

    /**
     * Génère un résumé automatique du rapport
     */
    private String generateRapportSummary(Diagnostic diagnostic, double scoreTotal, double scoreMaximum,
                                         double pourcentageReussite, int numberOfQuestions) {
        StringBuilder summary = new StringBuilder();
        summary.append("Patient: ").append(diagnostic.getUser().getNom())
               .append(" ").append(diagnostic.getUser().getPrenom()).append("\n");
        summary.append("Date: ").append(diagnostic.getDateDiagnostic()).append("\n");
        summary.append("Nombre de questions: ").append(numberOfQuestions).append("\n");
        summary.append("Score obtenu: ").append(String.format("%.2f/%.2f", scoreTotal, scoreMaximum)).append("\n");
        summary.append("Taux de réussite: ").append(String.format("%.1f%%", pourcentageReussite)).append("\n");
        summary.append("Niveau de risque: ").append(diagnostic.getRiskLevel()).append("\n");
        summary.append("Durée du test: ").append(diagnostic.getDureeMinutes()).append(" minutes\n");
        
        return summary.toString();
    }

    /**
     * Génère une analyse détaillée du rapport
     */
    private String generateDetailedAnalysis(Diagnostic diagnostic, double scoreTotal, double scoreMaximum,
                                           double pourcentageReussite, int numberOfQuestions) {
        StringBuilder analysis = new StringBuilder();
        
        analysis.append("## ANALYSE DÉTAILLÉE DU DIAGNOSTIC\n\n");
        
        analysis.append("### 1. Informations générales\n");
        analysis.append("- Patient: ").append(diagnostic.getUser().getNom())
                .append(" ").append(diagnostic.getUser().getPrenom()).append("\n");
        analysis.append("- Email: ").append(diagnostic.getUser().getEmail()).append("\n");
        analysis.append("- Téléphone: ").append(diagnostic.getUser().getTelephone()).append("\n");
        analysis.append("- Date d'évaluation: ").append(diagnostic.getDateDiagnostic()).append("\n\n");
        
        analysis.append("### 2. Résultats du test\n");
        analysis.append("- Nombre de questions: ").append(numberOfQuestions).append("\n");
        analysis.append("- Score brut: ").append(String.format("%.2f/%.2f", scoreTotal, scoreMaximum)).append("\n");
        analysis.append("- Pourcentage de réussite: ").append(String.format("%.1f%%", pourcentageReussite)).append("\n");
        analysis.append("- Niveau de risque: **").append(diagnostic.getRiskLevel()).append("**\n");
        analysis.append("- Durée totale: ").append(diagnostic.getDureeMinutes()).append(" minutes\n\n");
        
        analysis.append("### 3. Interprétation\n");
        if ("LOW".equals(diagnostic.getRiskLevel())) {
            analysis.append("Les performances cognitives sont dans la norme. Aucun signe préoccupant détecté.\n");
        } else if ("MEDIUM".equals(diagnostic.getRiskLevel())) {
            analysis.append("Quelques difficultés mineures observées. Un suivi régulier est recommandé.\n");
        } else if ("HIGH".equals(diagnostic.getRiskLevel())) {
            analysis.append("Des difficultés significatives ont été observées. Une évaluation médicale approfondie est recommandée.\n");
        } else {
            analysis.append("Des difficultés importantes ont été détectées. Une consultation médicale urgente est fortement recommandée.\n");
        }
        
        analysis.append("\n### 4. Recommandations\n");
        analysis.append("- Validation médicale requise\n");
        analysis.append("- Suivi médical selon les résultats\n");
        analysis.append("- Réévaluation périodique si nécessaire\n");
        
        return analysis.toString();
    }

    /**
     * Envoie des notifications à tous les docteurs actifs pour valider le rapport
     * @return Le nombre de notifications envoyées
     */
    private int sendNotificationsToDoctors(Rapport rapport, User patient) {
        // Récupérer tous les soignants actifs
        List<User> doctors = userRepository.findByRoleAndActif("SOIGNANT", true);
        
        // Si aucun soignant actif trouvé, récupérer tous les soignants et filtrer
        if (doctors.isEmpty()) {
            doctors = userRepository.findByRole("SOIGNANT").stream()
                    .filter(u -> Boolean.TRUE.equals(u.getActif()))
                    .toList();
        }
        
        int notificationCount = 0;
        
        // Créer une notification pour chaque docteur
        for (User doctor : doctors) {
            Notification notification = new Notification();
            notification.setUser(doctor);
            notification.setRapport(rapport);
            notification.setDiagnostic(rapport.getDiagnostic());
            notification.setIsRead(false);
            notification.setMessage(String.format(
                    "Nouveau rapport à valider pour le patient %s %s. " +
                    "Score: %.1f%% - Risque: %s. Cliquez pour consulter et valider.",
                    patient.getNom(),
                    patient.getPrenom(),
                    rapport.getDiagnostic().getPourcentageAlzeimer() != null 
                        ? (100 - rapport.getDiagnostic().getPourcentageAlzeimer()) 
                        : 0.0,
                    rapport.getDiagnostic().getRiskLevel()
            ));
            
            notificationRepository.save(notification);
            notificationCount++;
        }
        
        return notificationCount;
    }

    /**
     * Ajuste le score en fonction du temps de réponse
     * Plus le patient prend de temps, plus le score peut être pénalisé (optionnel)
     */
    private Double adjustScoreBasedOnTime(Double baseScore, Double tempsReponseSecondes) {
        if (tempsReponseSecondes == null || baseScore == null || baseScore.equals(0.0)) {
            return baseScore;
        }

        // Temps de référence (en secondes)
        double tempsIdeal = 10.0; // 10 secondes
        double tempsMaximal = 60.0; // 60 secondes

        if (tempsReponseSecondes <= tempsIdeal) {
            // Réponse rapide - bonus léger
            return Math.min(5.0, baseScore * 1.1);
        } else if (tempsReponseSecondes <= tempsMaximal) {
            // Temps acceptable - pas de pénalité
            return baseScore;
        } else {
            // Réponse très lente - légère pénalité
            double penaltyFactor = Math.max(0.7, 1.0 - ((tempsReponseSecondes - tempsMaximal) / 120.0));
            return baseScore * penaltyFactor;
        }
    }

    /**
     * Détermine le niveau de risque en fonction du pourcentage de réussite
     */
   private String determineRiskLevel(double pourcentageReussite) {
    if (pourcentageReussite >= 80.0) {
        return "LOW";
    } else if (pourcentageReussite >= 40.0) {
        return "MEDIUM";
    } else {
        return "HIGH";
    }
}
    
}
