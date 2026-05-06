package MemorIA.service;

import MemorIA.dto.QuestionRequest;
import MemorIA.entity.User;
import MemorIA.entity.diagnostic.Question;
import MemorIA.entity.diagnostic.QuestionType;
import MemorIA.repository.QuestionRepository;
import MemorIA.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QuestionServiceTest {

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private QuestionService questionService;

    private User user;
    private Question question;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setNom("Doe");
        user.setPrenom("John");

        question = new Question();
        question.setId(10L);
        question.setQuestionText("What day is it?");
        question.setType(QuestionType.DAY_CHECK);
        question.setUser(user);
    }

    @Test
    @DisplayName("getAllQuestions: returns all questions from repository")
    void getAllQuestions_returnsAll() {
        when(questionRepository.findAll()).thenReturn(List.of(question));

        List<Question> result = questionService.getAllQuestions();

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("getQuestionById: returns Optional from repository")
    void getQuestionById_returnsOptional() {
        when(questionRepository.findById(10L)).thenReturn(Optional.of(question));

        Optional<Question> result = questionService.getQuestionById(10L);

        assertTrue(result.isPresent());
        assertEquals(question, result.get());
    }

    @Test
    @DisplayName("saveQuestion: persists question via repository")
    void saveQuestion_persists() {
        when(questionRepository.save(question)).thenReturn(question);

        Question result = questionService.saveQuestion(question);

        assertEquals(question, result);
        verify(questionRepository).save(question);
    }

    @Test
    @DisplayName("createQuestion: builds question from request and links to user")
    void createQuestion_buildsAndSaves() {
        QuestionRequest req = new QuestionRequest("Quel jour ?", "DAY_CHECK", 1L);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(questionRepository.save(any(Question.class))).thenAnswer(inv -> inv.getArgument(0));

        Question result = questionService.createQuestion(req);

        assertEquals("Quel jour ?", result.getQuestionText());
        assertEquals(QuestionType.DAY_CHECK, result.getType());
        assertEquals(user, result.getUser());
    }

    @Test
    @DisplayName("createQuestion: throws when user is missing")
    void createQuestion_throwsWhenUserMissing() {
        QuestionRequest req = new QuestionRequest("Q", "TEXT", 999L);
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> questionService.createQuestion(req));
        assertTrue(ex.getMessage().contains("User not found"));
    }

    @Test
    @DisplayName("createQuestion: rejects invalid type")
    void createQuestion_rejectsInvalidType() {
        QuestionRequest req = new QuestionRequest("Q", "BAD_TYPE", 1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        assertThrows(IllegalArgumentException.class,
                () -> questionService.createQuestion(req));
    }

    @Test
    @DisplayName("updateQuestion: updates text and type")
    void updateQuestion_updates() {
        Question updates = new Question();
        updates.setQuestionText("New text");
        updates.setType(QuestionType.TEXT);

        when(questionRepository.findById(10L)).thenReturn(Optional.of(question));
        when(questionRepository.save(any(Question.class))).thenAnswer(inv -> inv.getArgument(0));

        Question result = questionService.updateQuestion(10L, updates);

        assertEquals("New text", result.getQuestionText());
        assertEquals(QuestionType.TEXT, result.getType());
    }

    @Test
    @DisplayName("updateQuestion: throws when question is missing")
    void updateQuestion_throwsWhenMissing() {
        when(questionRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> questionService.updateQuestion(404L, new Question()));
    }

    @Test
    @DisplayName("deleteQuestion: delegates to repository")
    void deleteQuestion_delegates() {
        questionService.deleteQuestion(10L);
        verify(questionRepository).deleteById(10L);
    }

    @Test
    @DisplayName("getQuestionsByUserId: returns questions filtered by user id")
    void getQuestionsByUserId_returnsList() {
        when(questionRepository.findByUserId(1L)).thenReturn(List.of(question));

        List<Question> result = questionService.getQuestionsByUserId(1L);

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("getQuestionsByUserIdOrdered: returns questions ordered by date")
    void getQuestionsByUserIdOrdered_returnsList() {
        when(questionRepository.findByUserIdOrderByDateCreationDesc(1L))
                .thenReturn(List.of(question));

        List<Question> result = questionService.getQuestionsByUserIdOrdered(1L);

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("getRandomQuestions: returns empty list when no questions exist")
    void getRandomQuestions_returnsEmptyWhenNone() {
        when(questionRepository.findAllWithReponses()).thenReturn(new ArrayList<>());

        List<Question> result = questionService.getRandomQuestions();

        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("getRandomQuestions: caps results to 10 items")
    void getRandomQuestions_capsAt10() {
        List<Question> many = new ArrayList<>();
        for (int i = 0; i < 25; i++) {
            Question q = new Question();
            q.setId((long) i);
            q.setQuestionText("Q" + i);
            q.setType(QuestionType.TEXT);
            q.setPatientAnswers(new ArrayList<>());
            many.add(q);
        }
        when(questionRepository.findAllWithReponses()).thenReturn(many);

        List<Question> result = questionService.getRandomQuestions();

        assertEquals(10, result.size());
    }

    @Test
    @DisplayName("getRandomQuestions: returns all questions when fewer than 10")
    void getRandomQuestions_returnsAllWhenSmall() {
        List<Question> few = new ArrayList<>(Arrays.asList(question, question, question));
        when(questionRepository.findAllWithReponses()).thenReturn(few);

        List<Question> result = questionService.getRandomQuestions();

        assertEquals(3, result.size());
    }
}
