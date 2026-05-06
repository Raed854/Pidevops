package MemorIA.controller;

import MemorIA.service.BadWordService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/badwords")
public class BadWordController {

    private final BadWordService badWordService;

    public BadWordController(BadWordService badWordService) {
        this.badWordService = badWordService;
    }

    @PostMapping("/import")
    public ResponseEntity<?> importExcel(@RequestParam("file") MultipartFile file) {
        try {
            badWordService.importFromExcel(file);
            return ResponseEntity.ok(Map.of("success", true, "message", "Fichier importé avec succès."));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erreur d'import : " + e.getMessage()));
        }
    }
}
