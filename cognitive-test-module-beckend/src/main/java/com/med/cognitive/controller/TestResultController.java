package com.med.cognitive.controller;

import com.med.cognitive.entity.TestResult;
import com.med.cognitive.service.TestResultService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/test-results")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TestResultController {

    private final TestResultService service;

    @GetMapping
    public ResponseEntity<List<TestResult>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<TestResult>> getByPatient(@PathVariable("patientId") String patientId) {
        return ResponseEntity.ok(service.getByPatientId(patientId));
    }

    @PostMapping
    public ResponseEntity<TestResult> create(@Valid @RequestBody TestResult result) {
        return new ResponseEntity<>(service.create(result), HttpStatus.CREATED);
    }

    @PostMapping("/{id}/recalculate")
    public ResponseEntity<TestResult> recalculate(@PathVariable("id") Long id) {
        return ResponseEntity.ok(service.calculateScores(id));
    }

    @PatchMapping("/{id}/review")
    public ResponseEntity<TestResult> review(@PathVariable("id") Long id,
            @RequestParam("reviewerId") String reviewerId) {
        return ResponseEntity.ok(service.review(id, reviewerId));
    }
}
