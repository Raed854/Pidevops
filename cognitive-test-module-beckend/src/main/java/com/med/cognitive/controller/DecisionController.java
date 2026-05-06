package com.med.cognitive.controller;

import com.med.cognitive.entity.Decision;
import com.med.cognitive.service.DecisionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/decisions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DecisionController {

    private final DecisionService service;

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Decision>> getByPatient(@PathVariable("patientId") String patientId) {
        return ResponseEntity.ok(service.getByPatientId(patientId));
    }

    @PostMapping("/from-result/{resultId}")
    public ResponseEntity<Decision> createAutoDecision(@PathVariable("resultId") Long resultId) {
        return new ResponseEntity<>(service.createAutoDecision(resultId), HttpStatus.CREATED);
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<Decision> approve(@PathVariable("id") Long id,
            @RequestParam("approverId") String approverId) {
        return ResponseEntity.ok(service.approveDecision(id, approverId));
    }
}
