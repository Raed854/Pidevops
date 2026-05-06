package com.med.cognitive.config;

import com.med.cognitive.entity.CognitiveTest;
import com.med.cognitive.entity.TestQuestion;
import com.med.cognitive.repository.CognitiveTestRepository;
import com.med.cognitive.repository.TestQuestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class JpaDataInitializer implements CommandLineRunner {

        private final CognitiveTestRepository testRepository;
        private final TestQuestionRepository questionRepository;

        @Override
        @Transactional
        public void run(String... args) {
                log.info("Initializing PostgreSQL database with sample data...");
                initializeTests();
                log.info("Database initialization complete.");
        }

        private void initializeTests() {
                // --- STAGE STABLE (FACILE) ---
                createTestIfNotExists("MMSE (Mini Mental State Examination)", "Test d'évaluation globale.",
                                CognitiveTest.TypeTest.MEMORY, CognitiveTest.DifficultyLevel.FACILE, 15,
                                createMmseQuestions());
                createTestIfNotExists("Test d'Orientation", "Évaluation temporelle et spatiale.",
                                CognitiveTest.TypeTest.MEMORY,
                                CognitiveTest.DifficultyLevel.FACILE, 5, new ArrayList<>());
                createTestIfNotExists("Test des 5 mots", "Mémoire épisodique verbale.", CognitiveTest.TypeTest.MEMORY,
                                CognitiveTest.DifficultyLevel.FACILE, 5, new ArrayList<>());
                createTestIfNotExists("Mémoire des visages", "Reconnaissance visuelle.", CognitiveTest.TypeTest.MEMORY,
                                CognitiveTest.DifficultyLevel.FACILE, 10, new ArrayList<>());
                createTestIfNotExists("Fluence verbale", "Accès au lexique.", CognitiveTest.TypeTest.LANGUAGE,
                                CognitiveTest.DifficultyLevel.FACILE, 5, new ArrayList<>());
                createTestIfNotExists("Mots croisés faciles", "Vocabulaire et rappel.", CognitiveTest.TypeTest.LANGUAGE,
                                CognitiveTest.DifficultyLevel.FACILE, 15, new ArrayList<>());
                createTestIfNotExists("Test de l'horloge", "Fonctions visuo-spatiales.",
                                CognitiveTest.TypeTest.REFLECTION,
                                CognitiveTest.DifficultyLevel.FACILE, 5, new ArrayList<>());
                createTestIfNotExists("Association d'images", "Concepts visuels.", CognitiveTest.TypeTest.REFLECTION,
                                CognitiveTest.DifficultyLevel.FACILE, 5, new ArrayList<>());
                createTestIfNotExists("Jeu des 7 erreurs", "Attention sélective visuelle.",
                                CognitiveTest.TypeTest.ATTENTION,
                                CognitiveTest.DifficultyLevel.FACILE, 10, new ArrayList<>());

                // --- STAGE MOYEN (MOYEN) ---
                createTestIfNotExists("Test d'orientation simplifié", "Orientation de base.",
                                CognitiveTest.TypeTest.MEMORY,
                                CognitiveTest.DifficultyLevel.MOYEN, 5, new ArrayList<>());
                createTestIfNotExists("Répétition de phrases", "Mémoire de travail verbale.",
                                CognitiveTest.TypeTest.MEMORY,
                                CognitiveTest.DifficultyLevel.MOYEN, 5, new ArrayList<>());
                createTestIfNotExists("Memory", "Jeu de paires classiques.", CognitiveTest.TypeTest.MEMORY,
                                CognitiveTest.DifficultyLevel.MOYEN, 10, new ArrayList<>());
                createTestIfNotExists("Reconnaissance d'odeurs", "Mémoire sensorielle olfactive.",
                                CognitiveTest.TypeTest.MEMORY, CognitiveTest.DifficultyLevel.MOYEN, 10,
                                new ArrayList<>());
                createTestIfNotExists("Dénomination d'images", "Nommer des objets familiers.",
                                CognitiveTest.TypeTest.LANGUAGE,
                                CognitiveTest.DifficultyLevel.MOYEN, 5, new ArrayList<>());
                createTestIfNotExists("Mots fléchés faciles", "Grille de mots simplifiée.",
                                CognitiveTest.TypeTest.LANGUAGE,
                                CognitiveTest.DifficultyLevel.MOYEN, 15, new ArrayList<>());
                createTestIfNotExists("Test de l'horloge simplifié", "Dessin assisté de l'horloge.",
                                CognitiveTest.TypeTest.REFLECTION, CognitiveTest.DifficultyLevel.MOYEN, 5,
                                new ArrayList<>());
                createTestIfNotExists("Puzzles simples", "Assemblage de formes.", CognitiveTest.TypeTest.REFLECTION,
                                CognitiveTest.DifficultyLevel.MOYEN, 10, new ArrayList<>());
                createTestIfNotExists("Associations sémantiques", "Lier des objets par usage.",
                                CognitiveTest.TypeTest.REFLECTION, CognitiveTest.DifficultyLevel.MOYEN, 5,
                                new ArrayList<>());
                createTestIfNotExists("Tri par catégories", "Classer des éléments.", CognitiveTest.TypeTest.LOGIC,
                                CognitiveTest.DifficultyLevel.MOYEN, 10, new ArrayList<>());

                // --- STAGE CRITIQUE (AVANCE) ---
                createTestIfNotExists("Reconnaissance des proches", "Identifier la famille sur photo.",
                                CognitiveTest.TypeTest.MEMORY, CognitiveTest.DifficultyLevel.AVANCE, 10,
                                new ArrayList<>());
                createTestIfNotExists("Questions basiques", "Identité et besoins primaires.",
                                CognitiveTest.TypeTest.MEMORY,
                                CognitiveTest.DifficultyLevel.AVANCE, 5, new ArrayList<>());
                createTestIfNotExists("Album photo commenté", "Rappel de souvenirs personnels.",
                                CognitiveTest.TypeTest.MEMORY,
                                CognitiveTest.DifficultyLevel.AVANCE, 15, new ArrayList<>());
                createTestIfNotExists("Loto des images", "Reconnaissance visuelle simple.",
                                CognitiveTest.TypeTest.MEMORY,
                                CognitiveTest.DifficultyLevel.AVANCE, 10, new ArrayList<>());
                createTestIfNotExists("Désignation d'objets", "Montrer des objets nommés.",
                                CognitiveTest.TypeTest.REFLECTION,
                                CognitiveTest.DifficultyLevel.AVANCE, 5, new ArrayList<>());
                createTestIfNotExists("Atelier des sens", "Stimulation multi-sensorielle.",
                                CognitiveTest.TypeTest.REFLECTION,
                                CognitiveTest.DifficultyLevel.AVANCE, 15, new ArrayList<>());
                createTestIfNotExists("Massage relaxation", "Bien-être et conscience corporelle.",
                                CognitiveTest.TypeTest.REFLECTION, CognitiveTest.DifficultyLevel.AVANCE, 20,
                                new ArrayList<>());
                createTestIfNotExists("Tri d'objets réels", "Manipulation et classement tangible.",
                                CognitiveTest.TypeTest.LOGIC, CognitiveTest.DifficultyLevel.AVANCE, 10,
                                new ArrayList<>());
                createTestIfNotExists("Colorimage", "Coloriage thérapeutique guidé.", CognitiveTest.TypeTest.DRAWING,
                                CognitiveTest.DifficultyLevel.AVANCE, 15, new ArrayList<>());
                createTestIfNotExists("Loto sonore", "Identifier des bruits familiers.", CognitiveTest.TypeTest.AUDIO,
                                CognitiveTest.DifficultyLevel.AVANCE, 10, new ArrayList<>());
                createTestIfNotExists("Chansons connues", "Compléter des paroles.", CognitiveTest.TypeTest.AUDIO,
                                CognitiveTest.DifficultyLevel.AVANCE, 10, new ArrayList<>());
        }

        private void createTestIfNotExists(String titre, String desc, CognitiveTest.TypeTest type,
                        CognitiveTest.DifficultyLevel difficulty, int duration, List<TestQuestion> questions) {
                if (testRepository.findByTitreContainingIgnoreCase(titre).isEmpty()) {
                        CognitiveTest test = new CognitiveTest();
                        test.setTitre(titre);
                        test.setDescription(desc);
                        test.setType(type);
                        test.setDifficultyLevel(difficulty);
                        test.setDurationMinutes(duration);
                        test.setIsActive(true);
                        test.setIdUser("admin");

                        test = testRepository.save(test);

                        if (questions != null && !questions.isEmpty()) {
                                for (TestQuestion q : questions) {
                                        q.setTest(test);
                                }
                                List<TestQuestion> savedQuestions = questionRepository.saveAll(questions);
                                test.setQuestions(savedQuestions);
                                test.calculateTotalScore();
                                testRepository.save(test);
                        }
                }
        }

        private List<TestQuestion> createMmseQuestions() {
                List<TestQuestion> questions = new ArrayList<>();

                String[] qTexts = {
                                "Quelle est la date aujourd'hui ?",
                                "En quelle année sommes-nous ?",
                                "Quelle est la saison actuelle ?",
                                "Quel jour du mois sommes-nous ?",
                                "Quel jour de la semaine sommes-nous ?",
                                "Dans quel pays sommes-nous ?",
                                "Dans quelle ville/commune sommes-nous ?",
                                "Dans quel département/préfecture sommes-nous ?",
                                "Dans quel établissement sommes-nous ?",
                                "A quel étage sommes-nous ?",
                                "Je vais vous dire 3 mots : Cigare, Fleur, Porte. Répétez-les.",
                                "Comptez à rebours de 7 en 7 à partir de 100 (100-7).",
                                "Continuez (93-7).",
                                "Continuez (86-7).",
                                "Continuez (79-7).",
                                "Continuez (72-7).",
                                "Quels étaient les 3 mots que je vous ai demandé de retenir ?",
                                "Montrez une montre et demandez : Qu'est-ce que c'est ?",
                                "Montrez un crayon et demandez : Qu'est-ce que c'est ?",
                                "Répétez la phrase suivante : 'Pas de si, de et, ni de mais'.",
                                "Prenez ce papier avec la main droite.",
                                "Pliez-le en deux.",
                                "Posez-le par terre.",
                                "Lisez et faites ce qui est écrit : 'FERMEZ LES YEUX'.",
                                "Écrivez une phrase complète de votre choix.",
                                "Copiez le dessin des deux pentagones qui s'entrecroisent.",
                                "Question additionnelle 27 (Simulée)",
                                "Question additionnelle 28 (Simulée)",
                                "Question additionnelle 29 (Simulée)",
                                "Question additionnelle 30 (Simulée)"
                };

                for (int i = 0; i < qTexts.length; i++) {
                        TestQuestion q = new TestQuestion();
                        q.setQuestionText(qTexts[i]);
                        q.setQuestionType(i == 25 ? TestQuestion.QuestionType.DRAWING : TestQuestion.QuestionType.TEXT);
                        q.setScore(1);
                        q.setOrderIndex(i + 1);
                        q.setIsRequired(true);
                        questions.add(q);
                }

                return questions;
        }

        private List<TestQuestion> createMocaQuestions() {
                List<TestQuestion> questions = new ArrayList<>();
                TestQuestion q3 = new TestQuestion();
                q3.setQuestionText("Dessinez un cube.");
                q3.setQuestionType(TestQuestion.QuestionType.DRAWING);
                q3.setScore(3);
                q3.setOrderIndex(1);
                q3.setIsRequired(true);
                questions.add(q3);
                return questions;
        }
}
