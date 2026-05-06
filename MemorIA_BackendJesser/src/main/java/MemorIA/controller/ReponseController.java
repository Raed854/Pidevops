package MemorIA.controller;

import MemorIA.dto.ReponseRequest;
import MemorIA.entity.diagnostic.Reponse;
import MemorIA.service.ReponseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reponses")
public class ReponseController {

    private final ReponseService reponseService;

    public ReponseController(ReponseService reponseService) {
        this.reponseService = reponseService;
    }

    @GetMapping
    public ResponseEntity<List<Reponse>> getAllReponses() {
        List<Reponse> reponses = reponseService.getAllReponses();
        return ResponseEntity.ok(reponses);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Reponse> getReponseById(@PathVariable Long id) {
        return reponseService.getReponseById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Reponse> createReponse(@Valid @RequestBody ReponseRequest request) {
        Reponse savedReponse = reponseService.createReponse(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedReponse);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Reponse> updateReponse(@PathVariable Long id, @RequestBody Reponse reponse) {
        try {
            Reponse updatedReponse = reponseService.updateReponse(id, reponse);
            return ResponseEntity.ok(updatedReponse);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReponse(@PathVariable Long id) {
        reponseService.deleteReponse(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/question/{idQuestion}")
    public ResponseEntity<List<Reponse>> getReponsesByQuestionId(@PathVariable Long idQuestion) {
        List<Reponse> reponses = reponseService.getReponsesByQuestionId(idQuestion);
        return ResponseEntity.ok(reponses);
    }

    @GetMapping("/answer/{reponse}")
    public ResponseEntity<List<Reponse>> getReponsesByAnswer(@PathVariable Boolean reponse) {
        List<Reponse> reponses = reponseService.getReponsesByAnswer(reponse);
        return ResponseEntity.ok(reponses);
    }
}
