package com.med.cognitive.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.med.cognitive.entity.CognitiveTest;
import com.med.cognitive.repository.CognitiveTestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class CognitiveTestControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CognitiveTestRepository repository;

    @Autowired
    private ObjectMapper objectMapper;

    private CognitiveTest testEntity;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
        testEntity = new CognitiveTest();
        testEntity.setTitre("MMSE Test");
        testEntity.setDescription("Mini Mental State Examination");
        testEntity.setType(CognitiveTest.TypeTest.MEMORY);
        testEntity.setDifficultyLevel(CognitiveTest.DifficultyLevel.AVANCE);
        testEntity = repository.save(testEntity);
    }

    @Test
    void getAll_ShouldReturnTests() throws Exception {
        mockMvc.perform(get("/api/cognitive-tests"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].titre").value("MMSE Test"));
    }

    @Test
    void getById_ShouldReturnTest() throws Exception {
        mockMvc.perform(get("/api/cognitive-tests/" + testEntity.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.titre").value("MMSE Test"));
    }

    @Test
    void create_ShouldReturnCreated() throws Exception {
        CognitiveTest newTest = new CognitiveTest();
        newTest.setTitre("MoCA Test");
        newTest.setType(CognitiveTest.TypeTest.REFLECTION);

        mockMvc.perform(post("/api/cognitive-tests")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newTest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.titre").value("MoCA Test"));
    }

    @Test
    void update_ShouldReturnUpdated() throws Exception {
        testEntity.setTitre("Updated Title");

        mockMvc.perform(put("/api/cognitive-tests/" + testEntity.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(testEntity)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.titre").value("Updated Title"));
    }

    @Test
    void delete_ShouldReturnNoContent() throws Exception {
        mockMvc.perform(delete("/api/cognitive-tests/" + testEntity.getId()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/cognitive-tests/" + testEntity.getId()))
                .andExpect(status().isNotFound());
    }
}
