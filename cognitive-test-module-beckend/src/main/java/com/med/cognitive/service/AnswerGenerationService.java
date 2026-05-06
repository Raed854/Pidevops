package com.med.cognitive.service;

import com.med.cognitive.entity.*;
import com.med.cognitive.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AnswerGenerationService {

    private final TestQuestionRepository questionRepository;
    private final QuestionAnswerRepository answerRepository;
    private final PatientTestAssignRepository assignRepository;
    private final PatientRepository patientRepository;

    @Transactional
    public int generateAnswersForTest(Long testId) {
        List<TestQuestion> questions = questionRepository.findByTestIdOrderByOrderIndexAsc(testId);
        int totalGenerated = 0;

        for (TestQuestion question : questions) {
            // Check if answers already exist
            List<QuestionAnswer> existingAnswers = answerRepository.findByQuestionId(question.getId());
            if (!existingAnswers.isEmpty()) {
                continue; // Skip if already has answers
            }

            List<QuestionAnswer> answers = generateAnswersForQuestion(question, testId);
            answerRepository.saveAll(answers);
            totalGenerated += answers.size();
        }

        return totalGenerated;
    }

    private List<QuestionAnswer> generateAnswersForQuestion(TestQuestion question, Long testId) {
        String questionText = question.getQuestionText().toLowerCase();
        LocalDateTime now = LocalDateTime.now();

        // Determine patient age if needed
        Integer patientAge = null;
        if (questionText.contains("âge") || questionText.contains("age")) {
            patientAge = calculatePatientAge(testId);
        }

        List<AnswerData> answerDataList;

        if (questionText.contains("année") || questionText.contains("annee")) {
            int currentYear = now.getYear();
            answerDataList = Arrays.asList(
                new AnswerData(String.valueOf(currentYear), true),
                new AnswerData(String.valueOf(currentYear - 1), false),
                new AnswerData(String.valueOf(currentYear + 1), false),
                new AnswerData(String.valueOf(currentYear - 2), false)
            );
        } else if (questionText.contains("mois")) {
            String currentMonth = getMonthName(now.getMonthValue());
            List<String> allMonths = Arrays.asList("Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
                "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre");
            answerDataList = generateMonthAnswers(currentMonth, allMonths);
        } else if (questionText.contains("date") && questionText.contains("aujourd'hui")) {
            String currentDate = now.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            String yesterday = now.minusDays(1).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            String tomorrow = now.plusDays(1).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            String twoDaysAgo = now.minusDays(2).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            answerDataList = Arrays.asList(
                new AnswerData(currentDate, true),
                new AnswerData(yesterday, false),
                new AnswerData(tomorrow, false),
                new AnswerData(twoDaysAgo, false)
            );
        } else if (questionText.contains("jour") && questionText.contains("semaine")) {
            String currentDay = getDayName(now.getDayOfWeek().getValue());
            List<String> allDays = Arrays.asList("Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche");
            answerDataList = generateDayAnswers(currentDay, allDays);
        } else if (questionText.contains("heure") || questionText.contains("temps")) {
            int currentHour = now.getHour();
            String correctHour = currentHour + "h";
            answerDataList = Arrays.asList(
                new AnswerData(correctHour, true),
                new AnswerData((currentHour - 2) + "h", false),
                new AnswerData((currentHour + 2) + "h", false),
                new AnswerData((currentHour - 4) + "h", false)
            );
        } else if (questionText.contains("saison")) {
            String currentSeason = getCurrentSeason(now.getMonthValue());
            List<String> allSeasons = Arrays.asList("Printemps", "Été", "Automne", "Hiver");
            answerDataList = generateSeasonAnswers(currentSeason, allSeasons);
        } else if (questionText.contains("matin") || questionText.contains("après-midi") || questionText.contains("soir")) {
            String currentPeriod = getTimeOfDay(now.getHour());
            List<String> allPeriods = Arrays.asList("Le matin", "L'après-midi", "Le soir", "La nuit");
            answerDataList = generateTimePeriodAnswers(currentPeriod, allPeriods);
        } else if (questionText.contains("pays")) {
            answerDataList = Arrays.asList(
                new AnswerData("France", true),
                new AnswerData("Belgique", false),
                new AnswerData("Italie", false),
                new AnswerData("Espagne", false)
            );
        } else if (questionText.contains("ville")) {
            answerDataList = Arrays.asList(
                new AnswerData("Paris", true),
                new AnswerData("Lyon", false),
                new AnswerData("Marseille", false),
                new AnswerData("Bordeaux", false)
            );
        } else if (questionText.contains("lieu") || questionText.contains("endroit")) {
            answerDataList = Arrays.asList(
                new AnswerData("À l'hôpital", true),
                new AnswerData("Au cabinet médical", false),
                new AnswerData("À domicile", false),
                new AnswerData("À la clinique", false)
            );
        } else if (questionText.contains("étage") || questionText.contains("etage")) {
            answerDataList = Arrays.asList(
                new AnswerData("Rez-de-chaussée", true),
                new AnswerData("1er étage", false),
                new AnswerData("2ème étage", false),
                new AnswerData("3ème étage", false)
            );
        } else if (questionText.contains("âge") || questionText.contains("age")) {
            if (patientAge != null) {
                answerDataList = Arrays.asList(
                    new AnswerData(patientAge + " ans", true),
                    new AnswerData((patientAge - 2) + " ans", false),
                    new AnswerData((patientAge + 2) + " ans", false),
                    new AnswerData((patientAge + 1) + " ans", false)
                );
            } else {
                answerDataList = Arrays.asList(
                    new AnswerData("75 ans", true),
                    new AnswerData("70 ans", false),
                    new AnswerData("80 ans", false),
                    new AnswerData("72 ans", false)
                );
            }
        } else {
            // Default generic answers
            answerDataList = Arrays.asList(
                new AnswerData("Oui", true),
                new AnswerData("Non", false),
                new AnswerData("Peut-être", false),
                new AnswerData("Je ne sais pas", false)
            );
        }

        return convertToQuestionAnswers(answerDataList, question);
    }

    private Integer calculatePatientAge(Long testId) {
        try {
            // Find assignment for this test to get patient
            List<PatientTestAssign> assigns = assignRepository.findByTestId(testId);
            if (assigns.isEmpty()) return null;

            PatientTestAssign assign = assigns.get(0);
            Optional<Patient> patientOpt = patientRepository.findById(assign.getPatientId());
            if (patientOpt.isEmpty()) return null;

            Patient patient = patientOpt.get();
            if (patient.getDateNaissance() == null) return null;

            return Period.between(patient.getDateNaissance(), LocalDate.now()).getYears();
        } catch (Exception e) {
            return null;
        }
    }

    private String getMonthName(int month) {
        String[] months = {"", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
            "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"};
        return months[month];
    }

    private String getDayName(int day) {
        String[] days = {"", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"};
        return days[day];
    }

    private String getCurrentSeason(int month) {
        if (month >= 3 && month <= 5) return "Printemps";
        if (month >= 6 && month <= 8) return "Été";
        if (month >= 9 && month <= 11) return "Automne";
        return "Hiver";
    }

    private String getTimeOfDay(int hour) {
        if (hour >= 5 && hour < 12) return "Le matin";
        if (hour >= 12 && hour < 18) return "L'après-midi";
        if (hour >= 18 && hour < 22) return "Le soir";
        return "La nuit";
    }

    private List<AnswerData> generateMonthAnswers(String correct, List<String> all) {
        List<AnswerData> answers = new ArrayList<>();
        answers.add(new AnswerData(correct, true));

        List<String> incorrect = new ArrayList<>(all);
        incorrect.remove(correct);
        Collections.shuffle(incorrect);
        for (int i = 0; i < 3 && i < incorrect.size(); i++) {
            answers.add(new AnswerData(incorrect.get(i), false));
        }
        return answers;
    }

    private List<AnswerData> generateDayAnswers(String correct, List<String> all) {
        List<AnswerData> answers = new ArrayList<>();
        answers.add(new AnswerData(correct, true));

        List<String> incorrect = new ArrayList<>(all);
        incorrect.remove(correct);
        Collections.shuffle(incorrect);
        for (int i = 0; i < 3 && i < incorrect.size(); i++) {
            answers.add(new AnswerData(incorrect.get(i), false));
        }
        return answers;
    }

    private List<AnswerData> generateSeasonAnswers(String correct, List<String> all) {
        List<AnswerData> answers = new ArrayList<>();
        answers.add(new AnswerData(correct, true));

        List<String> incorrect = new ArrayList<>(all);
        incorrect.remove(correct);
        Collections.shuffle(incorrect);
        for (int i = 0; i < 3 && i < incorrect.size(); i++) {
            answers.add(new AnswerData(incorrect.get(i), false));
        }
        return answers;
    }

    private List<AnswerData> generateTimePeriodAnswers(String correct, List<String> all) {
        List<AnswerData> answers = new ArrayList<>();
        answers.add(new AnswerData(correct, true));

        List<String> incorrect = new ArrayList<>(all);
        incorrect.remove(correct);
        Collections.shuffle(incorrect);
        for (int i = 0; i < 3 && i < incorrect.size(); i++) {
            answers.add(new AnswerData(incorrect.get(i), false));
        }
        return answers;
    }

    private List<QuestionAnswer> convertToQuestionAnswers(List<AnswerData> answerDataList, TestQuestion question) {
        List<QuestionAnswer> answers = new ArrayList<>();
        for (int i = 0; i < answerDataList.size(); i++) {
            AnswerData data = answerDataList.get(i);
            QuestionAnswer answer = new QuestionAnswer();
            answer.setQuestion(question);
            answer.setAnswerText(data.text);
            answer.setIsCorrect(data.isCorrect);
            answer.setOrderIndex(i);
            answers.add(answer);
        }
        return answers;
    }

    private record AnswerData(String text, boolean isCorrect) {}
}
