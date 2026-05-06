package com.med.cognitive.controller;

import com.med.cognitive.entity.TestQuestion;
import com.med.cognitive.service.TestQuestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TestQuestionController {

    private final TestQuestionService service;

    @GetMapping("/cognitive-tests/{testId}/questions")
    public ResponseEntity<List<TestQuestion>> getByTestId(@PathVariable Long testId) {
        return ResponseEntity.ok(service.getAllByTestId(testId));
    }

    @PostMapping("/cognitive-tests/{testId}/questions")
    public ResponseEntity<TestQuestion> create(@PathVariable Long testId, @Valid @RequestBody TestQuestion question) {
        return new ResponseEntity<>(service.create(testId, question), HttpStatus.CREATED);
    }

    @PutMapping("/questions/{id}")
    public ResponseEntity<TestQuestion> update(@PathVariable Long id, @Valid @RequestBody TestQuestion question) {
        return ResponseEntity.ok(service.update(id, question));
    }

    @DeleteMapping("/questions/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/test-questions/by-type/{type}")
    public ResponseEntity<List<TestQuestion>> getByTestType(
            @PathVariable com.med.cognitive.entity.CognitiveTest.TypeTest type) {
        return ResponseEntity.ok(service.getByTestType(type));
    }
}
