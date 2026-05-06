package com.med.cognitive.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.med.cognitive.entity.CognitiveTest;
import com.med.cognitive.entity.TestResult;
import com.med.cognitive.repository.CognitiveTestRepository;
import com.med.cognitive.repository.TestResultRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
// Removed @Transactional as it's not standard for MongoDB integration tests unless specifically configured

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class TestResultControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TestResultRepository repository;

    @Autowired
    private CognitiveTestRepository testRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private TestResult resultEntity;
    private CognitiveTest testEntity;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
        testRepository.deleteAll();

        testEntity = new CognitiveTest();
        testEntity.setTitre("MMSE Test");
        testEntity.setType(CognitiveTest.TypeTest.MEMORY);
        testEntity = testRepository.save(testEntity);

        resultEntity = new TestResult();
        resultEntity.setPatientId("1"); // Using ID of seeded patient
        resultEntity.setTest(testEntity);
        resultEntity.setScoreTotale(28);
        resultEntity.setMaxPossibleScore(30);
        resultEntity.setSeverityLevel(TestResult.SeverityLevel.NORMAL);
        resultEntity = repository.save(resultEntity);
    }

    @Test
    void getByPatient_ShouldReturnResults() throws Exception {
        mockMvc.perform(get("/api/test-results/patient/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].scoreTotale").value(28));
    }

    @Test
    void create_ShouldReturnCreated() throws Exception {
        TestResult newResult = new TestResult();
        newResult.setPatientId("2");
        newResult.setTest(testEntity);
        newResult.setScoreTotale(25);

        mockMvc.perform(post("/api/test-results")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newResult)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.patientId").value("102"));
    }
}
