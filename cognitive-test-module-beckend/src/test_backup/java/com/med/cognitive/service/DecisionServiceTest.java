package com.med.cognitive.service;

import com.med.cognitive.entity.Decision;
import com.med.cognitive.entity.TestResult;
import com.med.cognitive.repository.DecisionRepository;
import com.med.cognitive.repository.TestResultRepository;
import com.med.cognitive.validator.DecisionValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DecisionServiceTest {

    @Mock
    private DecisionRepository repository;

    @Mock
    private TestResultRepository testResultRepository;

    @Mock
    private DecisionValidator validator;

    @InjectMocks
    private DecisionService service;

    private TestResult resultMock;

    @BeforeEach
    void setUp() {
        resultMock = new TestResult();
        resultMock.setId(1L);
        resultMock.setPatientId("1");
        resultMock.setSeverityLevel(TestResult.SeverityLevel.NORMAL);
    }

    @Test
    void shouldCreateAutoDecisionForNormalResult() {
        // Given
        when(testResultRepository.findById(1L)).thenReturn(Optional.of(resultMock));
        when(repository.save(any(Decision.class))).thenAnswer(i -> {
            Decision d = (Decision) i.getArguments()[0];
            d.setId(10L);
            return d;
        });

        // When
        Decision decision = service.createAutoDecision(1L);

        // Then
        assertNotNull(decision);
        assertEquals(Decision.DecisionType.SURVEILLANCE, decision.getDecisionType());
        assertEquals(Decision.RiskLevel.FAIBLE, decision.getRiskLevel());
        verify(validator, times(1)).validate(any(Decision.class));
        verify(repository, times(1)).save(any(Decision.class));
    }
}
