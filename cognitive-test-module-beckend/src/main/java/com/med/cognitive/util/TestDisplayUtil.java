package com.med.cognitive.util;

import com.med.cognitive.entity.CognitiveTest;
import com.med.cognitive.repository.CognitiveTestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@Order(2) // Run after JpaDataInitializer (which has default order 0)
@RequiredArgsConstructor
@Slf4j
public class TestDisplayUtil implements CommandLineRunner {

    private final CognitiveTestRepository testRepository;

    @Override
    public void run(String... args) {
        displayTestsByType();
    }

    public void displayTestsByType() {
        log.info("========================================");
        log.info("TESTS COGNITIFS - GROUPÉS PAR TYPE");
        log.info("========================================");

        List<CognitiveTest> allTests = testRepository.findAll();

        if (allTests.isEmpty()) {
            log.info("Aucun test trouvé dans la base de données.");
            return;
        }

        // Group tests by type
        Map<CognitiveTest.TypeTest, List<CognitiveTest>> testsByType = allTests.stream()
                .collect(Collectors.groupingBy(CognitiveTest::getType));

        // Display each type with its tests
        testsByType.forEach((type, tests) -> {
            log.info("");
            log.info("📋 TYPE: {}", type);
            log.info("   Nombre de tests: {}", tests.size());
            log.info("   Tests:");

            tests.forEach(test -> {
                log.info("      - {} (Difficulté: {}, Durée: {} min)",
                        test.getTitre(),
                        test.getDifficultyLevel(),
                        test.getDurationMinutes());
            });
        });

        log.info("");
        log.info("========================================");
        log.info("TOTAL: {} tests dans {} types différents", allTests.size(), testsByType.size());
        log.info("========================================");
    }
}
