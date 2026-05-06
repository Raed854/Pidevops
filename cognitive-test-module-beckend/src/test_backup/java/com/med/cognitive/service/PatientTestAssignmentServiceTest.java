package com.med.cognitive.service;

import com.med.cognitive.entity.PatientTestAssignment;
import com.med.cognitive.entity.CognitiveTest;
import com.med.cognitive.repository.PatientTestAssignmentRepository;
import com.med.cognitive.repository.CognitiveTestRepository;
import com.med.cognitive.validator.TestAssignmentValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PatientTestAssignmentServiceTest {

    @Mock
    private PatientTestAssignmentRepository repository;

    @Mock
    private CognitiveTestRepository testRepository;

    @Mock
    private TestAssignmentValidator validator;

    @InjectMocks
    private PatientTestAssignmentService service;

    private CognitiveTest testMock;
    private PatientTestAssignment assignmentMock;

    @BeforeEach
    void setUp() {
        testMock = new CognitiveTest();
        testMock.setId(1L);
        testMock.setIsActive(true);

        assignmentMock = new PatientTestAssignment();
        assignmentMock.setId(1L);
        assignmentMock.setPatientId("101");
        assignmentMock.setTest(testMock);
        assignmentMock.setStatus(PatientTestAssignment.AssignmentStatus.ASSIGNED);
    }

    @Test
    void shouldAssignTestSuccessfully() {
        // Given
        when(testRepository.findById(1L)).thenReturn(Optional.of(testMock));
        when(repository.save(any(PatientTestAssignment.class))).thenReturn(assignmentMock);

        // When
        PatientTestAssignment result = service.assignTest("101", 1L, "99", LocalDateTime.now().plusDays(1));

        // Then
        assertNotNull(result);
        verify(validator, times(1)).validate(any(PatientTestAssignment.class));
        verify(repository, times(1)).save(any(PatientTestAssignment.class));
    }
}
