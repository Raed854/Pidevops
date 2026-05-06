package MemorIA.controller;

import MemorIA.service.CSVImportService;
import MemorIA.service.ExcelImportService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/import")
public class ImportController {

    private final CSVImportService csvImportService;
    private final ExcelImportService excelImportService;

    public ImportController(CSVImportService csvImportService, ExcelImportService excelImportService) {
        this.csvImportService = csvImportService;
        this.excelImportService = excelImportService;
    }

    /**
     * Endpoint pour importer des questions + réponses depuis CSV
     * POST /api/import/questions-csv
     * 
     * Format CSV attendu:
     * question_text,reponse_text,user_id
     * Quelle est la capitale de la France?,Paris,1
     * Quelle est la capitale de la France?,Londres,1
     */
    @PostMapping("/questions-csv")
    public ResponseEntity<?> uploadQuestionsCSV(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();

        try {
            if (file.isEmpty()) {
                response.put("error", "File must not be empty.");
                return ResponseEntity.badRequest().body(response);
            }
            if (!csvImportService.validateCSVFormat(file)) {
                response.put("error", "Invalid file format. Please upload a CSV file.");
                return ResponseEntity.badRequest().body(response);
            }
            
            Map<String, Object> importResult = csvImportService.importQuestionsWithReponsesFromCSV(file);
            
            response.put("success", true);
            response.put("message", "Questions and Reponses imported successfully from CSV");
            response.putAll(importResult);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (IOException e) {
            response.put("error", "Error reading or parsing CSV file: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("error", "Unexpected error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Endpoint pour importer des questions + réponses depuis Excel
     * POST /api/import/questions-excel
     * 
     * Format Excel attendu (.xls ou .xlsx):
     * Colonne A: question_text | Colonne B: reponse_text
     * Les deux colonnes sont optionnelles
     * User ID provient de l'utilisateur connecté (paramètre userId)
     */
    @PostMapping("/questions-excel")
    public ResponseEntity<?> uploadQuestionsExcel(
            @RequestParam("file") MultipartFile file,
            @RequestParam("userId") Long userId) {
        Map<String, Object> response = new HashMap<>();

        try {
            if (file.isEmpty()) {
                response.put("error", "File must not be empty.");
                return ResponseEntity.badRequest().body(response);
            }
            if (userId <= 0) {
                response.put("error", "userId must be a positive number.");
                return ResponseEntity.badRequest().body(response);
            }
            if (!excelImportService.validateExcelFormat(file)) {
                response.put("error", "Invalid file format. Please upload an Excel file (.xls or .xlsx).");
                return ResponseEntity.badRequest().body(response);
            }
            
            Map<String, Object> importResult = excelImportService.importQuestionsWithReponsesFromExcel(file, userId);
            
            response.put("success", true);
            response.put("message", "Questions and Reponses imported successfully from Excel");
            response.putAll(importResult);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (IOException e) {
            response.put("error", "Error reading Excel file: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Runtime error";
            if (msg.contains("non trouvé") || msg.contains("not found")) {
                response.put("error", msg);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            response.put("error", "Unexpected error: " + msg);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        } catch (Exception e) {
            response.put("error", "Unexpected error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Endpoint universel pour importer depuis CSV ou Excel
     * POST /api/import/questions
     * 
     * Détecte automatiquement le format du fichier
     * Requiert userId de l'utilisateur connecté
     */
    @PostMapping("/questions")
    public ResponseEntity<?> uploadQuestions(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "userId", required = false) Long userId) {
        String filename = file.getOriginalFilename();
        
        if (filename != null && filename.endsWith(".csv")) {
            return uploadQuestionsCSV(file);
        } else if (filename != null && (filename.endsWith(".xls") || filename.endsWith(".xlsx"))) {
            if (userId == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("error", "userId parameter is required for Excel import.");
                return ResponseEntity.badRequest().body(response);
            }
            return uploadQuestionsExcel(file, userId);
        } else {
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Unsupported file format. Please upload CSV or Excel file.");
            return ResponseEntity.badRequest().body(response);
        }
    }
}
