package com.med.cognitive.service;

import com.med.cognitive.entity.CognitiveTest;
import com.med.cognitive.repository.CognitiveTestRepository;
import com.med.cognitive.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CognitiveTestServiceTest {

    @Mock
    private CognitiveTestRepository repository;

    @InjectMocks
    private CognitiveTestService service;

    private CognitiveTest testMock;

    @BeforeEach
    void setUp() {
        testMock = new CognitiveTest();
        testMock.setId(1L);
        testMock.setTitre("MMSE");
        testMock.setType(CognitiveTest.TypeTest.MEMORY);
        testMock.setIsActive(true);
    }

    @Test
    void shouldReturnAllTestsWhenGetAll() {
        // Given
        when(repository.findAll()).thenReturn(List.of(testMock));

        // When
        List<CognitiveTest> result = service.getAll();

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        verify(repository, times(1)).findAll();
    }

    @Test
    void shouldReturnTestWhenGetByIdFound() {
        // Given
        when(repository.findById(1L)).thenReturn(Optional.of(testMock));

        // When
        CognitiveTest result = service.getById(1L);

        // Then
        assertNotNull(result);
        assertEquals("MMSE", result.getTitre());
        verify(repository, times(1)).findById(1L);
    }

    @Test
    void shouldThrowExceptionWhenTestNotFound() {
        // Given
        when(repository.findById(999L)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(ResourceNotFoundException.class, () -> service.getById(999L));
    }

    @Test
    void shouldCreateTestWhenValidData() {
        // Given
        when(repository.save(any(CognitiveTest.class))).thenReturn(testMock);

        // When
        CognitiveTest result = service.create(testMock);

        // Then
        assertNotNull(result);
        assertEquals(1L, result.getId());
        verify(repository, times(1)).save(testMock);
    }

    @Test
    void shouldDeactivateTest() {
        // Given
        when(repository.findById(1L)).thenReturn(Optional.of(testMock));
        when(repository.save(any(CognitiveTest.class))).thenAnswer(i -> i.getArguments()[0]);

        // When
        service.deactivateTest(1L);

        // Then
        assertFalse(testMock.getIsActive());
        verify(repository, times(1)).save(testMock);
    }
}
