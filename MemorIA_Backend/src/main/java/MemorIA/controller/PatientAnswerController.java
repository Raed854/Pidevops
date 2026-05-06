package MemorIA.controller;

import MemorIA.entity.diagnostic.PatientAnswer;
import MemorIA.service.PatientAnswerService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/patient-answers")
public class PatientAnswerController {

    private final PatientAnswerService patientAnswerService;

    public PatientAnswerController(PatientAnswerService patientAnswerService) {
        this.patientAnswerService = patientAnswerService;
    }

    @GetMapping
    public ResponseEntity<List<PatientAnswer>> getAllPatientAnswers() {
        List<PatientAnswer> patientAnswers = patientAnswerService.getAllPatientAnswers();
        return ResponseEntity.ok(patientAnswers);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PatientAnswer> getPatientAnswerById(@PathVariable Long id) {
        return patientAnswerService.getPatientAnswerById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<PatientAnswer> createPatientAnswer(@RequestBody PatientAnswer patientAnswer) {
        PatientAnswer savedPatientAnswer = patientAnswerService.savePatientAnswer(patientAnswer);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedPatientAnswer);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PatientAnswer> updatePatientAnswer(@PathVariable Long id, @RequestBody PatientAnswer patientAnswer) {
        try {
            PatientAnswer updatedPatientAnswer = patientAnswerService.updatePatientAnswer(id, patientAnswer);
            return ResponseEntity.ok(updatedPatientAnswer);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePatientAnswer(@PathVariable Long id) {
        patientAnswerService.deletePatientAnswer(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/diagnostic/{diagnosticId}")
    public ResponseEntity<List<PatientAnswer>> getPatientAnswersByDiagnosticId(@PathVariable Long diagnosticId) {
        List<PatientAnswer> patientAnswers = patientAnswerService.getPatientAnswersByDiagnosticId(diagnosticId);
        return ResponseEntity.ok(patientAnswers);
    }

    @GetMapping("/question/{questionId}")
    public ResponseEntity<List<PatientAnswer>> getPatientAnswersByQuestionId(@PathVariable Long questionId) {
        List<PatientAnswer> patientAnswers = patientAnswerService.getPatientAnswersByQuestionId(questionId);
        return ResponseEntity.ok(patientAnswers);
    }

    @GetMapping("/diagnostic/{diagnosticId}/question/{questionId}")
    public ResponseEntity<List<PatientAnswer>> getPatientAnswersByDiagnosticAndQuestion(
            @PathVariable Long diagnosticId, 
            @PathVariable Long questionId) {
        List<PatientAnswer> patientAnswers = patientAnswerService.getPatientAnswersByDiagnosticAndQuestion(diagnosticId, questionId);
        return ResponseEntity.ok(patientAnswers);
    }
}
