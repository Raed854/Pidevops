package com.med.cognitive.controller;

import com.med.cognitive.dto.*;
import com.med.cognitive.entity.*;
import com.med.cognitive.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/test/5mots")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class Mots5Controller {

    private final Mots5TestRepository mots5TestRepository;
    private final Mot5ItemRepository mot5ItemRepository;
    private final Mots5ResponseRepository mots5ResponseRepository;
    private final CognitiveTestRepository cognitiveTestRepository;
    private final TestQuestionRepository testQuestionRepository;

    private static final Map<String, String> WORD_CATEGORIES = Map.of(
        "MUSÉE", "un lieu",
        "CITRON", "un fruit",
        "SAUTERELLE", "un insecte",
        "PASSOIRE", "un ustensile de cuisine",
        "CAMION", "un véhicule",
        "JARDIN", "un espace extérieur",
        "FOURCHETTE", "un couvert",
        "ÉLÉPHANT", "un animal",
        "CHAPEAU", "un vêtement",
        "MIROIR", "un objet de salle de bain"
    );

    @GetMapping("/questions")
    public ResponseEntity<Mots5QuestionsDto> getQuestions(
            @RequestParam("testId") Long testId,
            @RequestParam("patientId") Long patientId,
            @RequestParam(value = "assignationId", required = false) Long assignationId) {

        // Get or create test session
        Mots5Test testSession = mots5TestRepository
            .findByCognitiveTestIdAndPatientId(testId, patientId)
            .orElseGet(() -> createNewTestSession(testId, patientId, assignationId));

        // Get words for this test
        List<Mot5Item> items = mot5ItemRepository.findByMots5TestIdOrderByOrderIndexAsc(testSession.getId());

        // If no items yet, create them from test questions
        if (items.isEmpty()) {
            items = createMot5ItemsFromQuestions(testSession, testId);
        }

        List<Mots5QuestionsDto.Mot5WordDto> words = items.stream()
            .map(item -> Mots5QuestionsDto.Mot5WordDto.builder()
                .id(item.getId())
                .word(item.getWord())
                .category(item.getCategory())
                .orderIndex(item.getOrderIndex())
                .build())
            .collect(Collectors.toList());

        Mots5QuestionsDto response = Mots5QuestionsDto.builder()
            .testId(testSession.getId())
            .currentPhase(testSession.getCurrentPhase().name())
            .words(words)
            .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/reponse")
    public ResponseEntity<Map<String, Object>> saveResponse(@RequestBody Mots5ResponseDto responseDto) {
        Mots5Test testSession = mots5TestRepository.findById(responseDto.getMots5TestId())
            .orElseThrow(() -> new RuntimeException("Test session not found"));

        Mot5Item motItem = mot5ItemRepository.findById(responseDto.getMotItemId())
            .orElseThrow(() -> new RuntimeException("Mot item not found"));

        Mots5Response.ResponsePhase phase = Mots5Response.ResponsePhase.valueOf(responseDto.getPhase());

        // Calculate score
        int score = calculateScore(motItem.getWord(), responseDto.getAnswerText(), phase);

        Mots5Response response = new Mots5Response();
        response.setMots5Test(testSession);
        response.setMotItem(motItem);
        response.setAnswerText(responseDto.getAnswerText());
        response.setPhase(phase);
        response.setIsCorrect(score > 0);
        response.setScoreObtained(score);
        response.setTimeTakenSeconds(responseDto.getTimeTakenSeconds());
        response.setAnsweredAt(LocalDateTime.now());

        mots5ResponseRepository.save(response);

        // Update item status
        if (phase == Mots5Response.ResponsePhase.RAPPEL_IMMEDIAT || phase == Mots5Response.ResponsePhase.RAPPEL_LIBRE) {
            if (score == 2) {
                motItem.setRappelLibre(true);
                motItem.setScore(2);
            }
        } else if (phase == Mots5Response.ResponsePhase.RAPPEL_INDICE) {
            if (score >= 1) {
                motItem.setRappelIndice(true);
                motItem.setScore(Math.max(motItem.getScore(), 1));
            }
        }
        mot5ItemRepository.save(motItem);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("score", score);
        result.put("isCorrect", score > 0);

        return ResponseEntity.ok(result);
    }

    @PostMapping("/reponse/batch")
    public ResponseEntity<Map<String, Object>> saveBatchResponses(@RequestBody Mots5ResponseDto.BatchResponseDto batchDto) {
        Mots5Test testSession = mots5TestRepository.findById(batchDto.getMots5TestId())
            .orElseThrow(() -> new RuntimeException("Test session not found"));

        Mots5Response.ResponsePhase phase = Mots5Response.ResponsePhase.valueOf(batchDto.getPhase());

        int totalScore = 0;
        for (Mots5ResponseDto.SingleResponseDto resp : batchDto.getResponses()) {
            Mot5Item motItem = mot5ItemRepository.findById(resp.getMotItemId())
                .orElseThrow(() -> new RuntimeException("Mot item not found: " + resp.getMotItemId()));

            int score = calculateScore(motItem.getWord(), resp.getAnswerText(), phase);
            totalScore += score;

            Mots5Response response = new Mots5Response();
            response.setMots5Test(testSession);
            response.setMotItem(motItem);
            response.setAnswerText(resp.getAnswerText());
            response.setPhase(phase);
            response.setIsCorrect(score > 0);
            response.setScoreObtained(score);
            response.setTimeTakenSeconds(resp.getTimeTakenSeconds());
            response.setAnsweredAt(LocalDateTime.now());
            mots5ResponseRepository.save(response);

            // Update item
            if (phase == Mots5Response.ResponsePhase.RAPPEL_IMMEDIAT || phase == Mots5Response.ResponsePhase.RAPPEL_LIBRE) {
                if (score == 2) {
                    motItem.setRappelLibre(true);
                    motItem.setScore(2);
                }
            } else if (phase == Mots5Response.ResponsePhase.RAPPEL_INDICE) {
                if (score >= 1) {
                    motItem.setRappelIndice(true);
                    motItem.setScore(Math.max(motItem.getScore(), 1));
                }
            }
            mot5ItemRepository.save(motItem);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("totalScore", totalScore);
        result.put("responsesCount", batchDto.getResponses().size());

        return ResponseEntity.ok(result);
    }

    @PostMapping("/phase/{testResultId}")
    public ResponseEntity<Map<String, Object>> advancePhase(@PathVariable("testResultId") Long testResultId) {
        Mots5Test testSession = mots5TestRepository.findById(testResultId)
            .orElseThrow(() -> new RuntimeException("Test session not found"));

        Mots5Test.Mots5Phase currentPhase = testSession.getCurrentPhase();
        Mots5Test.Mots5Phase nextPhase = getNextPhase(currentPhase);

        testSession.setCurrentPhase(nextPhase);
        if (nextPhase == Mots5Test.Mots5Phase.TERMINE) {
            testSession.setIsCompleted(true);
            testSession.setCompletedAt(LocalDateTime.now());
            calculateTotalScore(testSession);
        }

        mots5TestRepository.save(testSession);

        Map<String, Object> result = new HashMap<>();
        result.put("previousPhase", currentPhase.name());
        result.put("currentPhase", nextPhase.name());
        result.put("isCompleted", testSession.getIsCompleted());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/resultats/{testResultId}")
    public ResponseEntity<Mots5ResultatsDto> getResultats(@PathVariable("testResultId") Long testResultId) {
        Mots5Test testSession = mots5TestRepository.findById(testResultId)
            .orElseThrow(() -> new RuntimeException("Test session not found"));

        List<Mot5Item> items = mot5ItemRepository.findByMots5TestIdOrderByOrderIndexAsc(testSession.getId());

        List<Mots5Response> responses = mots5ResponseRepository.findByMots5TestId(testSession.getId());
        Map<Long, List<Mots5Response>> responsesByItem = responses.stream()
            .collect(Collectors.groupingBy(r -> r.getMotItem().getId()));

        List<Mots5ResultatsDto.Mot5ResultDto> results = items.stream()
            .map(item -> {
                List<Mots5Response> itemResponses = responsesByItem.getOrDefault(item.getId(), Collections.emptyList());
                String rappelLibreResp = itemResponses.stream()
                    .filter(r -> r.getPhase() == Mots5Response.ResponsePhase.RAPPEL_LIBRE)
                    .findFirst()
                    .map(Mots5Response::getAnswerText)
                    .orElse(null);
                String rappelIndiceResp = itemResponses.stream()
                    .filter(r -> r.getPhase() == Mots5Response.ResponsePhase.RAPPEL_INDICE)
                    .findFirst()
                    .map(Mots5Response::getAnswerText)
                    .orElse(null);

                return Mots5ResultatsDto.Mot5ResultDto.builder()
                    .motItemId(item.getId())
                    .word(item.getWord())
                    .category(item.getCategory())
                    .rappelLibre(item.getRappelLibre())
                    .rappelIndice(item.getRappelIndice())
                    .score(item.getScore())
                    .rappelLibreReponse(rappelLibreResp)
                    .rappelIndiceReponse(rappelIndiceResp)
                    .build();
            })
            .collect(Collectors.toList());

        int scoreTotal = items.stream().mapToInt(Mot5Item::getScore).sum();
        String interpretation = scoreTotal >= 8 ? "Performance normale" : "Possible trouble mnésique";

        Mots5ResultatsDto result = Mots5ResultatsDto.builder()
            .mots5TestId(testSession.getId())
            .patientId(testSession.getPatientId())
            .currentPhase(testSession.getCurrentPhase().name())
            .isCompleted(testSession.getIsCompleted())
            .scoreTotal(scoreTotal)
            .scoreMax(10)
            .startedAt(testSession.getStartedAt())
            .completedAt(testSession.getCompletedAt())
            .interpretation(interpretation)
            .results(results)
            .build();

        return ResponseEntity.ok(result);
    }

    private Mots5Test createNewTestSession(Long testId, Long patientId, Long assignationId) {
        CognitiveTest cognitiveTest = cognitiveTestRepository.findById(testId)
            .orElseThrow(() -> new RuntimeException("Test not found"));

        Mots5Test testSession = new Mots5Test();
        testSession.setCognitiveTest(cognitiveTest);
        testSession.setPatientId(patientId);
        testSession.setAssignationId(assignationId);
        testSession.setCurrentPhase(Mots5Test.Mots5Phase.ENCODAGE);
        testSession.setStartedAt(LocalDateTime.now());
        testSession.setScoreTotal(0);
        testSession.setIsCompleted(false);

        return mots5TestRepository.save(testSession);
    }

    private List<Mot5Item> createMot5ItemsFromQuestions(Mots5Test testSession, Long testId) {
        List<TestQuestion> questions = testQuestionRepository.findByTestIdOrderByOrderIndexAsc(testId);

        List<Mot5Item> items = new ArrayList<>();
        int index = 0;
        
        // If no questions, create default 5 mots
        if (questions.isEmpty()) {
            String[] defaultWords = {"MUSÉE", "CITRON", "SAUTERELLE", "PASSOIRE", "CAMION"};
            for (String word : defaultWords) {
                String category = WORD_CATEGORIES.getOrDefault(word, "un objet");

                Mot5Item item = new Mot5Item();
                item.setMots5Test(testSession);
                item.setWord(word);
                item.setCategory(category);
                item.setOrderIndex(index++);
                item.setRappelLibre(false);
                item.setRappelIndice(false);
                item.setScore(0);

                items.add(mot5ItemRepository.save(item));
            }
        } else {
            for (TestQuestion q : questions) {
                String fullText = q.getQuestionText().trim();
                String word;
                
                // Extract word from patterns like "LISTE 1 - MOT 1 : MUSÉE"
                if (fullText.contains(":")) {
                    word = fullText.substring(fullText.indexOf(":") + 1).trim();
                } else {
                    word = fullText.toUpperCase();
                }
                
                String category = WORD_CATEGORIES.getOrDefault(word, "un objet");

                Mot5Item item = new Mot5Item();
                item.setMots5Test(testSession);
                item.setWord(word);
                item.setCategory(category);
                item.setOrderIndex(index++);
                item.setRappelLibre(false);
                item.setRappelIndice(false);
                item.setScore(0);

                items.add(mot5ItemRepository.save(item));
            }
        }

        return items;
    }

    private int calculateScore(String expectedWord, String answer, Mots5Response.ResponsePhase phase) {
        if (answer == null || answer.trim().isEmpty()) {
            return 0;
        }

        String normalizedExpected = expectedWord.toLowerCase().trim();
        String normalizedAnswer = answer.toLowerCase().trim();

        // Remove accents for comparison
        normalizedExpected = removeAccents(normalizedExpected);
        normalizedAnswer = removeAccents(normalizedAnswer);

        boolean isCorrect = normalizedAnswer.equals(normalizedExpected) ||
                           normalizedAnswer.contains(normalizedExpected) ||
                           normalizedExpected.contains(normalizedAnswer);

        if (isCorrect) {
            return (phase == Mots5Response.ResponsePhase.RAPPEL_INDICE) ? 1 : 2;
        }
        return 0;
    }

    private String removeAccents(String input) {
        return input.replaceAll("[àáâãäå]", "a")
                   .replaceAll("[èéêë]", "e")
                   .replaceAll("[ìíîï]", "i")
                   .replaceAll("[òóôõö]", "o")
                   .replaceAll("[ùúûü]", "u")
                   .replaceAll("[ç]", "c")
                   .replaceAll("[ñ]", "n");
    }

    private Mots5Test.Mots5Phase getNextPhase(Mots5Test.Mots5Phase current) {
        return switch (current) {
            case ENCODAGE -> Mots5Test.Mots5Phase.RAPPEL_IMMEDIAT;
            case RAPPEL_IMMEDIAT -> Mots5Test.Mots5Phase.DISTRACTEUR;
            case DISTRACTEUR -> Mots5Test.Mots5Phase.RAPPEL_LIBRE;
            case RAPPEL_LIBRE -> Mots5Test.Mots5Phase.RAPPEL_INDICE;
            case RAPPEL_INDICE -> Mots5Test.Mots5Phase.TERMINE;
            case TERMINE -> Mots5Test.Mots5Phase.TERMINE;
        };
    }

    private void calculateTotalScore(Mots5Test testSession) {
        List<Mot5Item> items = mot5ItemRepository.findByMots5TestIdOrderByOrderIndexAsc(testSession.getId());
        int total = items.stream().mapToInt(Mot5Item::getScore).sum();
        testSession.setScoreTotal(total);
    }
}
