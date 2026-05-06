package com.med.cognitive.config;

import com.med.cognitive.dto.AssignationRequest;
import com.med.cognitive.entity.Accompagnant;
import com.med.cognitive.entity.AssignStatus;
import com.med.cognitive.entity.Patient;
import com.med.cognitive.entity.PatientTestAssign;
import com.med.cognitive.entity.Soignant;
import com.med.cognitive.entity.TestAnswer;
import com.med.cognitive.entity.TestResult;
import com.med.cognitive.repository.CognitiveTestRepository;
import com.med.cognitive.repository.PatientTestAssignRepository;
import com.med.cognitive.repository.TestResultRepository;
import com.med.cognitive.service.AssignationService;
import com.med.cognitive.service.CognitiveTestService;
import com.med.cognitive.service.UserModuleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Order(2) // Run after UserRegistrationInitializer
@Slf4j
public class AssignationDataInitializer implements CommandLineRunner {

    private final AssignationService assignationService;
    private final PatientTestAssignRepository assignRepository;
    private final CognitiveTestRepository testRepository;
    private final UserModuleService userService;
    private final TestResultRepository resultRepository;

    @Override
    public void run(String... args) throws Exception {
        if (assignRepository.count() > 0) {
            return;
        }

        // 1. Fetch real entities from the DB
        var robert = userService.getPatientById(1L);
        var drSimon = userService.getSoignantById(101L);
        var alice = userService.getAccompagnantById(201L);

        var marguerite = userService.getPatientById(2L);
        var drVidal = userService.getSoignantById(102L);
        var thomas = userService.getAccompagnantById(202L);

        var henri = userService.getPatientById(3L);
        var marie = userService.getPatientById(4L);
        var drBernard = userService.getSoignantById(103L);

        // We need at least one test
        testRepository.findAll().stream().findFirst().ifPresent(test -> {
            // 1. Robert
            if (robert != null && drSimon != null) {
                AssignationRequest req1 = new AssignationRequest();
                req1.setPatientId(robert.getId());
                req1.setTestId(test.getId());
                req1.setSoignantId(drSimon.getId());
                if (alice != null)
                    req1.setAccompagnantId(alice.getId());
                req1.setDateLimite(LocalDate.now().plusDays(7));
                req1.setInstructions("Merci de faire passer ce test en fin de journée.");
                assignationService.createAssignation(req1);
            }

            // 2. Marguerite
            if (marguerite != null && drVidal != null) {
                AssignationRequest req2 = new AssignationRequest();
                req2.setPatientId(marguerite.getId());
                req2.setTestId(test.getId());
                req2.setSoignantId(drVidal.getId());
                if (thomas != null)
                    req2.setAccompagnantId(thomas.getId());
                req2.setDateLimite(LocalDate.now().minusDays(2));
                req2.setInstructions("Test de routine mensuel.");
                PatientTestAssign assign2 = assignationService.createAssignation(req2);

                if (thomas != null) {
                    TestResult result = assignationService.startTest(assign2.getId(), thomas.getId());
                    List<TestAnswer> fakeAnswers = new ArrayList<>();
                    if (test.getQuestions() != null && !test.getQuestions().isEmpty()) {
                        test.getQuestions().forEach(q -> {
                            TestAnswer ans = new TestAnswer();
                            ans.setQuestion(q);
                            ans.setAnswerText("Réponse automatique");
                            ans.setPointsObtained(q.getScore());
                            ans.setIsCorrect(true);
                            fakeAnswers.add(ans);
                        });
                    }
                    assignationService.finishTest(result.getId(), fakeAnswers, "Patient très collaboratif.");
                }
            }

            // 3. Henri
            if (henri != null && drSimon != null) {
                AssignationRequest req3 = new AssignationRequest();
                req3.setPatientId(henri.getId());
                req3.setTestId(test.getId());
                req3.setSoignantId(drSimon.getId());
                req3.setDateLimite(LocalDate.now().plusDays(5));
                req3.setInstructions("Observation de l'attention visuelle.");
                assignationService.createAssignation(req3);
            }

            // 4. Marie
            if (marie != null && drBernard != null) {
                AssignationRequest req4 = new AssignationRequest();
                req4.setPatientId(marie.getId());
                req4.setTestId(test.getId());
                req4.setSoignantId(drBernard.getId());
                req4.setDateLimite(LocalDate.now().plusWeeks(1));
                req4.setInstructions("Test de dépistage initial.");
                assignationService.createAssignation(req4);
            }
        });
    }
}
