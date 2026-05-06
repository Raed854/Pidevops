package MemorIA.service;

import MemorIA.entity.diagnostic.PatientAnswer;
import MemorIA.entity.diagnostic.Question;
import MemorIA.entity.diagnostic.QuestionType;
import MemorIA.repository.PatientAnswerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PatientAnswerServiceTest {

    @Mock
    private PatientAnswerRepository patientAnswerRepository;

    @Mock
    private AnswerVerificationService verificationService;

    @InjectMocks
    private PatientAnswerService patientAnswerService;

    private Question question;
    private PatientAnswer patientAnswer;

    @BeforeEach
    void setUp() {
        question = new Question();
        question.setId(1L);
        question.setType(QuestionType.TEXT);
        question.setQuestionText("Q?");

        patientAnswer = new PatientAnswer();
        patientAnswer.setId(10L);
        patientAnswer.setReponseText("Paris");
        patientAnswer.setQuestion(question);
    }

    @Test
    @DisplayName("getAllPatientAnswers: returns all from repository")
    void getAllPatientAnswers_returnsAll() {
        when(patientAnswerRepository.findAll()).thenReturn(List.of(patientAnswer));

        List<PatientAnswer> result = patientAnswerService.getAllPatientAnswers();

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("getPatientAnswerById: returns Optional from repository")
    void getPatientAnswerById_returnsOptional() {
        when(patientAnswerRepository.findById(10L)).thenReturn(Optional.of(patientAnswer));

        Optional<PatientAnswer> result = patientAnswerService.getPatientAnswerById(10L);

        assertTrue(result.isPresent());
    }

    @Test
    @DisplayName("savePatientAnswer: applies auto-verified score when service returns a value")
    void savePatientAnswer_appliesAutoScore() {
        when(verificationService.verifyAnswer(eq(question), eq("Paris"))).thenReturn(5.0);
        when(patientAnswerRepository.save(any(PatientAnswer.class))).thenAnswer(inv -> inv.getArgument(0));

        PatientAnswer result = patientAnswerService.savePatientAnswer(patientAnswer);

        assertEquals(5.0, result.getScoreObtenu());
    }

    @Test
    @DisplayName("savePatientAnswer: keeps existing score when verification returns null (manual scoring)")
    void savePatientAnswer_keepsManualScoreWhenNull() {
        patientAnswer.setScoreObtenu(2.5);
        when(verificationService.verifyAnswer(eq(question), eq("Paris"))).thenReturn(null);
        when(patientAnswerRepository.save(any(PatientAnswer.class))).thenAnswer(inv -> inv.getArgument(0));

        PatientAnswer result = patientAnswerService.savePatientAnswer(patientAnswer);

        assertEquals(2.5, result.getScoreObtenu());
    }

    @Test
    @DisplayName("savePatientAnswer: skips verification when question is null")
    void savePatientAnswer_skipsVerificationWithoutQuestion() {
        patientAnswer.setQuestion(null);
        patientAnswer.setScoreObtenu(1.0);
        when(patientAnswerRepository.save(any(PatientAnswer.class))).thenAnswer(inv -> inv.getArgument(0));

        PatientAnswer result = patientAnswerService.savePatientAnswer(patientAnswer);

        assertEquals(1.0, result.getScoreObtenu());
        verifyNoInteractions(verificationService);
    }

    @Test
    @DisplayName("updatePatientAnswer: updates fields and saves")
    void updatePatientAnswer_updates() {
        PatientAnswer updates = new PatientAnswer();
        updates.setReponseText("Lyon");
        updates.setScoreObtenu(3.5);
        updates.setTempsReponseSecondes(12.0);
        updates.setQuestion(question);

        when(patientAnswerRepository.findById(10L)).thenReturn(Optional.of(patientAnswer));
        when(patientAnswerRepository.save(any(PatientAnswer.class))).thenAnswer(inv -> inv.getArgument(0));

        PatientAnswer result = patientAnswerService.updatePatientAnswer(10L, updates);

        assertEquals("Lyon", result.getReponseText());
        assertEquals(3.5, result.getScoreObtenu());
        assertEquals(12.0, result.getTempsReponseSecondes());
    }

    @Test
    @DisplayName("updatePatientAnswer: throws when missing")
    void updatePatientAnswer_throwsWhenMissing() {
        when(patientAnswerRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> patientAnswerService.updatePatientAnswer(404L, new PatientAnswer()));
    }

    @Test
    @DisplayName("deletePatientAnswer: delegates to repository")
    void deletePatientAnswer_delegates() {
        patientAnswerService.deletePatientAnswer(10L);
        verify(patientAnswerRepository).deleteById(10L);
    }

    @Test
    @DisplayName("getPatientAnswersByDiagnosticId: returns answers for diagnostic")
    void getPatientAnswersByDiagnosticId_returnsList() {
        when(patientAnswerRepository.findByDiagnosticIdDiagnostic(7L))
                .thenReturn(List.of(patientAnswer));

        List<PatientAnswer> result = patientAnswerService.getPatientAnswersByDiagnosticId(7L);

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("getPatientAnswersByQuestionId: returns answers for question")
    void getPatientAnswersByQuestionId_returnsList() {
        when(patientAnswerRepository.findByQuestionId(1L))
                .thenReturn(List.of(patientAnswer));

        List<PatientAnswer> result = patientAnswerService.getPatientAnswersByQuestionId(1L);

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("getPatientAnswersByDiagnosticAndQuestion: returns matching answers")
    void getPatientAnswersByDiagnosticAndQuestion_returnsList() {
        when(patientAnswerRepository.findByDiagnosticIdDiagnosticAndQuestionId(7L, 1L))
                .thenReturn(List.of(patientAnswer));

        List<PatientAnswer> result = patientAnswerService
                .getPatientAnswersByDiagnosticAndQuestion(7L, 1L);

        assertEquals(1, result.size());
    }
}
