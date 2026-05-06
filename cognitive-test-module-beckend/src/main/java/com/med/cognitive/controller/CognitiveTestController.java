package com.med.cognitive.controller;

import com.med.cognitive.entity.CognitiveTest;
import com.med.cognitive.service.CognitiveTestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cognitive-tests")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CognitiveTestController {

    private final CognitiveTestService service;

    @GetMapping
    public ResponseEntity<List<CognitiveTest>> getAll(
            @RequestParam(required = false) CognitiveTest.TypeTest type,
            @RequestParam(required = false) CognitiveTest.DifficultyLevel difficulty,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(service.getFiltered(type, difficulty, isActive, search));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CognitiveTest> getById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<CognitiveTest> create(@Valid @RequestBody CognitiveTest test) {
        return new ResponseEntity<>(service.create(test), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CognitiveTest> update(@PathVariable("id") Long id, @Valid @RequestBody CognitiveTest test) {
        return ResponseEntity.ok(service.update(id, test));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<Void> activate(@PathVariable("id") Long id) {
        service.activateTest(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<CognitiveTest> duplicate(@PathVariable("id") Long id) {
        return new ResponseEntity<>(service.duplicateTest(id), HttpStatus.CREATED);
    }

    @GetMapping("/types")
    public ResponseEntity<List<CognitiveTest.TypeTest>> getAllTypes() {
        return ResponseEntity.ok(service.getDistinctTypes());
    }
}
