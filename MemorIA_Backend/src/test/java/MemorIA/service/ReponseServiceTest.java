package MemorIA.service;

import MemorIA.dto.ReponseRequest;
import MemorIA.entity.diagnostic.Question;
import MemorIA.entity.diagnostic.Reponse;
import MemorIA.repository.QuestionRepository;
import MemorIA.repository.ReponseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReponseServiceTest {

    @Mock
    private ReponseRepository reponseRepository;

    @Mock
    private QuestionRepository questionRepository;

    @InjectMocks
    private ReponseService reponseService;

    private Question question;
    private Reponse reponse;

    @BeforeEach
    void setUp() {
        question = new Question();
        question.setId(1L);

        reponse = new Reponse();
        reponse.setIdReponse(5L);
        reponse.setReponseText("Lundi");
        reponse.setReponse(true);
        reponse.setQuestion(question);
        reponse.setDateReponse(LocalDateTime.now());
    }

    @Test
    @DisplayName("getAllReponses: returns all answers from repository")
    void getAllReponses_returnsAll() {
        when(reponseRepository.findAll()).thenReturn(List.of(reponse));

        List<Reponse> result = reponseService.getAllReponses();

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("getReponseById: returns Optional from repository")
    void getReponseById_returnsOptional() {
        when(reponseRepository.findById(5L)).thenReturn(Optional.of(reponse));

        Optional<Reponse> result = reponseService.getReponseById(5L);

        assertTrue(result.isPresent());
    }

    @Test
    @DisplayName("saveReponse: persists the response")
    void saveReponse_persists() {
        when(reponseRepository.save(reponse)).thenReturn(reponse);

        Reponse result = reponseService.saveReponse(reponse);

        assertEquals(reponse, result);
    }

    @Test
    @DisplayName("createReponse: builds reponse from request and links to question")
    void createReponse_builds() {
        ReponseRequest req = new ReponseRequest("Mardi", true, 1L);

        when(questionRepository.findById(1L)).thenReturn(Optional.of(question));
        when(reponseRepository.save(any(Reponse.class))).thenAnswer(inv -> inv.getArgument(0));

        Reponse result = reponseService.createReponse(req);

        assertEquals("Mardi", result.getReponseText());
        assertTrue(result.getReponse());
        assertEquals(question, result.getQuestion());
        assertNotNull(result.getDateReponse());
    }

    @Test
    @DisplayName("createReponse: throws when question is missing")
    void createReponse_throwsWhenQuestionMissing() {
        ReponseRequest req = new ReponseRequest("text", true, 999L);
        when(questionRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> reponseService.createReponse(req));
        assertTrue(ex.getMessage().contains("Question not found"));
    }

    @Test
    @DisplayName("updateReponse: updates the answer fields")
    void updateReponse_updatesFields() {
        Reponse updates = new Reponse();
        updates.setReponse(false);
        updates.setReponseText("Updated");
        updates.setTempsReponse(3.5);
        updates.setDateReponse(LocalDateTime.now());

        when(reponseRepository.findById(5L)).thenReturn(Optional.of(reponse));
        when(reponseRepository.save(any(Reponse.class))).thenAnswer(inv -> inv.getArgument(0));

        Reponse result = reponseService.updateReponse(5L, updates);

        assertEquals("Updated", result.getReponseText());
        assertFalse(result.getReponse());
        assertEquals(3.5, result.getTempsReponse());
    }

    @Test
    @DisplayName("updateReponse: throws when reponse is missing")
    void updateReponse_throwsWhenMissing() {
        when(reponseRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> reponseService.updateReponse(404L, new Reponse()));
    }

    @Test
    @DisplayName("deleteReponse: delegates to repository")
    void deleteReponse_delegates() {
        reponseService.deleteReponse(5L);
        verify(reponseRepository).deleteById(5L);
    }

    @Test
    @DisplayName("getReponsesByQuestionId: returns answers for given question")
    void getReponsesByQuestionId_returnsList() {
        when(reponseRepository.findByQuestionId(1L)).thenReturn(List.of(reponse));

        List<Reponse> result = reponseService.getReponsesByQuestionId(1L);

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("getReponsesByAnswer: returns answers filtered by correctness flag")
    void getReponsesByAnswer_returnsList() {
        when(reponseRepository.findByReponse(true)).thenReturn(List.of(reponse));

        List<Reponse> result = reponseService.getReponsesByAnswer(true);

        assertEquals(1, result.size());
    }
}
