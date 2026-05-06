package MemorIA.service;

import MemorIA.entity.diagnostic.Question;
import MemorIA.entity.diagnostic.QuestionType;
import MemorIA.entity.diagnostic.Reponse;
import MemorIA.repository.ReponseRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;

@Service
public class AnswerVerificationService {

    private static final Logger logger = LoggerFactory.getLogger(AnswerVerificationService.class);

    private static final Double MAX_SCORE = 5.0;
    private static final Double NO_SCORE = 0.0;

    private final ReponseRepository reponseRepository;

    public AnswerVerificationService(ReponseRepository reponseRepository) {
        this.reponseRepository = reponseRepository;
    }

    /**
     * Vérifie automatiquement la réponse du patient selon le type de question
     * et compare avec les réponses prédéfinies ou les valeurs temporelles
     */
    public Double verifyAnswer(Question question, String reponseText) {
        logger.info("=== VERIFICATION DE REPONSE ===");
        logger.info("Question ID: {}, Type: {}", question.getId(), question.getType());
        logger.info("Reponse patient: '{}'", reponseText);
        
        if (reponseText == null || reponseText.trim().isEmpty()) {
            logger.warn("Reponse vide - Score: 0.0");
            return NO_SCORE;
        }

        QuestionType type = question.getType();
        logger.info("Type de question: {}", type);

        // --- Priorité 1 : types temporels ---
        // Toujours vérifier par rapport à la date/heure actuelle,
        // indépendamment de toute réponse prédéfinie en base (ex: importée par CSV).
        switch (type) {
            case DATE_CHECK: {
                Double score = verifyDate(reponseText);
                logger.info("Score calcule (DATE_CHECK): {}", score);
                return score;
            }
            case DAY_CHECK: {
                Double score = verifyDay(reponseText);
                logger.info("Score calcule (DAY_CHECK): {}", score);
                return score;
            }
            case MONTH_CHECK: {
                Double score = verifyMonth(reponseText);
                logger.info("Score calcule (MONTH_CHECK): {}", score);
                return score;
            }
            case YEAR_CHECK: {
                Double score = verifyYear(reponseText);
                logger.info("Score calcule (YEAR_CHECK): {}", score);
                return score;
            }
            case SEASON_CHECK: {
                Double score = verifySeason(reponseText);
                logger.info("Score calcule (SEASON_CHECK): {}", score);
                return score;
            }
            default:
                break;
        }

        // --- Priorité 2 : QCM / TEXT / IMAGE / AUDIO ---
        // Comparer contre les réponses prédéfinies stockées en base.
        List<Reponse> predefinedAnswers = reponseRepository.findByQuestionId(question.getId());
        logger.info("Nombre de reponses predefinies trouvees: {}",
                    predefinedAnswers != null ? predefinedAnswers.size() : 0);

        if (predefinedAnswers != null && !predefinedAnswers.isEmpty()) {
            for (Reponse r : predefinedAnswers) {
                logger.info("  - Reponse DB: '{}', Correcte: {}", r.getReponseText(), r.getReponse());
            }
            Double score = verifyAgainstPredefinedAnswers(reponseText, predefinedAnswers);
            logger.info("Score calcule (reponses predefinies): {}", score);
            return score;
        }

        // Aucune réponse prédéfinie → scoring manuel requis
        logger.info("Type {} sans reponses predefinies - Score manuel requis", type);
        return null;
    }

    /**
     * Compare la réponse du patient avec les réponses prédéfinies (reponse_text).
     * Retourne MAX_SCORE si la réponse correspond, NO_SCORE sinon.
     */
    private Double verifyAgainstPredefinedAnswers(String patientAnswer, List<Reponse> predefinedAnswers) {
        if (patientAnswer == null || patientAnswer.trim().isEmpty()) {
            logger.debug("Patient answer est vide");
            return NO_SCORE;
        }

        String cleanPatientAnswer = normalizeText(patientAnswer);
        logger.debug("Reponse patient normalisee: '{}'", cleanPatientAnswer);

        // Sélectionner les réponses correctes (reponse == true)
        // Si aucune n'est marquée correcte, utiliser toutes les réponses en fallback
        List<Reponse> candidates = predefinedAnswers.stream()
                .filter(r -> Boolean.TRUE.equals(r.getReponse()))
                .toList();

        if (candidates.isEmpty()) {
            logger.warn("Aucune reponse marquee correcte (reponse=true). Comparaison contre toutes les reponses.");
            candidates = predefinedAnswers;
        }

        for (Reponse reponse : candidates) {
            String correctAnswer = reponse.getReponseText();
            if (correctAnswer == null || correctAnswer.trim().isEmpty()) {
                continue;
            }

            String cleanCorrectAnswer = normalizeText(correctAnswer);
            logger.debug("Comparaison vs reponse: patient='{}' vs '{}'",
                    cleanPatientAnswer, cleanCorrectAnswer);

            // Correspondance exacte (après normalisation)
            if (cleanPatientAnswer.equals(cleanCorrectAnswer)) {
                logger.info("MATCH EXACT! Score: {}", MAX_SCORE);
                return MAX_SCORE;
            }

            // Correspondance par contenance
            if (cleanCorrectAnswer.length() >= 3
                    && cleanPatientAnswer.contains(cleanCorrectAnswer)) {
                logger.info("MATCH CONTENANCE (patient contient la réponse)! Score: {}", MAX_SCORE);
                return MAX_SCORE;
            }
            if (cleanPatientAnswer.length() >= 3
                    && cleanCorrectAnswer.contains(cleanPatientAnswer)) {
                logger.info("MATCH CONTENANCE (réponse contient la réponse patient)! Score: {}", MAX_SCORE);
                return MAX_SCORE;
            }

            // Correspondance par similarité (>= 80%)
            double similarity = calculateSimilarity(cleanPatientAnswer, cleanCorrectAnswer);
            if (similarity >= 0.8) {
                logger.info("MATCH SIMILARITE ({})! Score: {}", similarity, MAX_SCORE);
                return MAX_SCORE;
            }
        }

        logger.info("Aucune correspondance trouvee. Score: 0.0");
        return NO_SCORE;
    }
    
    /**
     * Normalise le texte pour la comparaison:
     * - Supprime les espaces superflus
     * - Convertit en minuscules
     * - Supprime les accents
     * - Supprime la ponctuation
     */
    private String normalizeText(String text) {
        if (text == null) {
            return "";
        }

        // Convertir en minuscules et trim
        String normalized = text.trim().toLowerCase();

        // Supprimer les accents avec Normalizer (gère tous les caractères Unicode)
        normalized = Normalizer.normalize(normalized, Normalizer.Form.NFD)
                               .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");

        // Supprimer la ponctuation et caractères spéciaux (garder seulement lettres et chiffres)
        normalized = normalized.replaceAll("[^a-z0-9\\s]", "");

        // Remplacer les espaces multiples par un seul espace
        normalized = normalized.replaceAll("\\s+", " ").trim();

        return normalized;
    }
    
    /**
     * Calcule la similarité entre deux chaînes en utilisant la distance de Levenshtein
     * Retourne un score entre 0.0 (aucune similarité) et 1.0 (identiques)
     */
    private double calculateSimilarity(String s1, String s2) {
        if (s1 == null || s2 == null) {
            return 0.0;
        }
        
        if (s1.equals(s2)) {
            return 1.0;
        }
        
        int maxLength = Math.max(s1.length(), s2.length());
        if (maxLength == 0) {
            return 1.0;
        }
        
        int distance = levenshteinDistance(s1, s2);
        return 1.0 - ((double) distance / maxLength);
    }
    
    /**
     * Calcule la distance de Levenshtein entre deux chaînes
     */
    private int levenshteinDistance(String s1, String s2) {
        int[][] dp = new int[s1.length() + 1][s2.length() + 1];
        
        for (int i = 0; i <= s1.length(); i++) {
            dp[i][0] = i;
        }
        
        for (int j = 0; j <= s2.length(); j++) {
            dp[0][j] = j;
        }
        
        for (int i = 1; i <= s1.length(); i++) {
            for (int j = 1; j <= s2.length(); j++) {
                int cost = (s1.charAt(i - 1) == s2.charAt(j - 1)) ? 0 : 1;
                dp[i][j] = Math.min(
                    Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1),
                    dp[i - 1][j - 1] + cost
                );
            }
        }
        
        return dp[s1.length()][s2.length()];
    }

    /**
     * Vérifie la date complète saisie manuellement au format DD/MM/YYYY.
     * Accepte aussi un simple numéro de jour (ex: "18", "1er").
     */
    private Double verifyDate(String answer) {
        if (answer == null || answer.trim().isEmpty()) {
            logger.debug("verifyDate: reponse vide");
            return NO_SCORE;
        }

        try {
            LocalDate today = LocalDate.now();

            // Format DD/MM/YYYY (saisie manuelle)
            String trimmed = answer.trim();
            if (trimmed.contains("/")) {
                String[] parts = trimmed.split("/");
                if (parts.length == 3) {
                    int day   = Integer.parseInt(parts[0].replaceAll("[^0-9]", ""));
                    int month = Integer.parseInt(parts[1].replaceAll("[^0-9]", ""));
                    int year  = Integer.parseInt(parts[2].replaceAll("[^0-9]", ""));
                    boolean isCorrect = (day == today.getDayOfMonth()
                            && month == today.getMonthValue()
                            && year  == today.getYear());
                    logger.info("verifyDate (DD/MM/YYYY): patient={}/{}/{}, actuel={}/{}/{}  -> {}",
                            day, month, year,
                            today.getDayOfMonth(), today.getMonthValue(), today.getYear(),
                            isCorrect ? "✓ CORRECT" : "✗ INCORRECT");
                    return isCorrect ? MAX_SCORE : NO_SCORE;
                }
            }

            // Fallback : simple numéro de jour (ex: "18", "1er")
            String cleanAnswer = trimmed.replaceAll("[^0-9]", "");
            if (cleanAnswer.isEmpty()) {
                logger.debug("verifyDate: aucun chiffre trouve dans '{}'", answer);
                return NO_SCORE;
            }
            int answerDay = Integer.parseInt(cleanAnswer);
            boolean isCorrect = (answerDay == today.getDayOfMonth());
            logger.info("verifyDate (jour seul): actuel={}, patient={} -> {}",
                    today.getDayOfMonth(), answerDay, isCorrect ? "✓ CORRECT" : "✗ INCORRECT");
            return isCorrect ? MAX_SCORE : NO_SCORE;

        } catch (NumberFormatException e) {
            logger.warn("verifyDate: Erreur de format pour '{}'", answer);
            return NO_SCORE;
        }
    }

    /**
     * Vérifie le jour de la semaine (Lundi, Mardi, etc.)
     */
    private Double verifyDay(String answer) {
        if (answer == null || answer.trim().isEmpty()) {
            logger.debug("verifyDay: reponse vide");
            return NO_SCORE;
        }
        
        LocalDate today = LocalDate.now();
        String currentDay = today.getDayOfWeek()
                .getDisplayName(TextStyle.FULL, Locale.FRENCH);
        
        // Normaliser les deux chaînes
        String cleanAnswer = normalizeText(answer);
        String cleanCurrentDay = normalizeText(currentDay);
        
        logger.info("verifyDay: Jour actuel='{}' -> '{}'", currentDay, cleanCurrentDay);
        logger.info("verifyDay: Reponse patient='{}' -> '{}'", answer, cleanAnswer);
        
        // Vérifier correspondance exacte ou similarité élevée (>= 85%)
        boolean exactMatch = cleanAnswer.equals(cleanCurrentDay);
        double similarity = calculateSimilarity(cleanAnswer, cleanCurrentDay);
        boolean similarMatch = similarity >= 0.85;
        
        logger.info("verifyDay: Match exact={}, Similarite={} (seuil=0.85)", 
                   exactMatch, similarity);
        
        if (exactMatch || similarMatch) {
            logger.info("verifyDay: ✓ CORRECT - Score: {}", MAX_SCORE);
            return MAX_SCORE;
        }
        
        logger.info("verifyDay: ✗ INCORRECT - Score: 0.0");
        return NO_SCORE;
    }

    /**
     * Vérifie le mois (Janvier, Février, etc.)
     */
    private Double verifyMonth(String answer) {
        if (answer == null || answer.trim().isEmpty()) {
            logger.debug("verifyMonth: reponse vide");
            return NO_SCORE;
        }
        
        LocalDate today = LocalDate.now();
        String currentMonth = today.getMonth()
                .getDisplayName(TextStyle.FULL, Locale.FRENCH);
        
        // Normaliser les deux chaînes
        String cleanAnswer = normalizeText(answer);
        String cleanCurrentMonth = normalizeText(currentMonth);
        
        logger.info("verifyMonth: Mois actuel='{}' -> '{}'", currentMonth, cleanCurrentMonth);
        logger.info("verifyMonth: Reponse patient='{}' -> '{}'", answer, cleanAnswer);
        
        // Vérifier correspondance exacte ou similarité élevée (>= 85%)
        boolean exactMatch = cleanAnswer.equals(cleanCurrentMonth);
        double similarity = calculateSimilarity(cleanAnswer, cleanCurrentMonth);
        boolean similarMatch = similarity >= 0.85;
        
        logger.info("verifyMonth: Match exact={}, Similarite={} (seuil=0.85)", 
                   exactMatch, similarity);
        
        if (exactMatch || similarMatch) {
            logger.info("verifyMonth: ✓ CORRECT - Score: {}", MAX_SCORE);
            return MAX_SCORE;
        }
        
        logger.info("verifyMonth: ✗ INCORRECT - Score: 0.0");
        return NO_SCORE;
    }

    /**
     * Vérifie l'année (2026, etc.)
     * Accepte aussi les années à 2 chiffres (ex: "26" pour 2026)
     */
    private Double verifyYear(String answer) {
        if (answer == null || answer.trim().isEmpty()) {
            logger.debug("verifyYear: reponse vide");
            return NO_SCORE;
        }
        
        try {
            LocalDate today = LocalDate.now();
            int currentYear = today.getYear();
            
            // Nettoyer la réponse - garder seulement les chiffres
            String cleanAnswer = answer.trim().replaceAll("[^0-9]", "");
            
            if (cleanAnswer.isEmpty()) {
                logger.debug("verifyYear: aucun chiffre trouve dans '{}'", answer);
                return NO_SCORE;
            }
            
            int answerYear = Integer.parseInt(cleanAnswer);
            
            // Gérer les années à 2 chiffres (ex: 26 pour 2026)
            if (answerYear < 100) {
                // Supposer que c'est pour le 21ème siècle
                answerYear += 2000;
            }
            
            logger.info("verifyYear: Annee actuelle={}, Annee patient={}", currentYear, answerYear);
            
            boolean isCorrect = (answerYear == currentYear);
            logger.info("verifyYear: {} - Score: {}", isCorrect ? "✓ CORRECT" : "✗ INCORRECT", 
                       isCorrect ? MAX_SCORE : NO_SCORE);
            return isCorrect ? MAX_SCORE : NO_SCORE;
        } catch (NumberFormatException e) {
            logger.warn("verifyYear: Erreur de format pour '{}'", answer);
            return NO_SCORE;
        }
    }

    /**
     * Vérifie la saison (Printemps, Été, Automne, Hiver)
     */
    private Double verifySeason(String answer) {
        if (answer == null || answer.trim().isEmpty()) {
            return NO_SCORE;
        }
        
        LocalDate today = LocalDate.now();
        String currentSeason = getCurrentSeason(today);
        
        // Normaliser les deux chaînes
        String cleanAnswer = normalizeText(answer);
        String cleanCurrentSeason = normalizeText(currentSeason);
        
        // Vérifier correspondance exacte ou similarité élevée (>= 85%)
        if (cleanAnswer.equals(cleanCurrentSeason) || 
            calculateSimilarity(cleanAnswer, cleanCurrentSeason) >= 0.85) {
            return MAX_SCORE;
        }
        
        return NO_SCORE;
    }

    /**
     * Détermine la saison actuelle
     */
    private String getCurrentSeason(LocalDate date) {
        int month = date.getMonthValue();
        
        if (month >= 3 && month <= 5) {
            return "printemps";
        } else if (month >= 6 && month <= 8) {
            return "été";
        } else if (month >= 9 && month <= 11) {
            return "automne";
        } else {
            return "hiver";
        }
    }
}
