package MemorIA.service;

import MemorIA.entity.User;
import MemorIA.entity.diagnostic.Question;
import MemorIA.entity.diagnostic.QuestionType;
import MemorIA.entity.diagnostic.Reponse;
import MemorIA.repository.QuestionRepository;
import MemorIA.repository.ReponseRepository;
import MemorIA.repository.UserRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ExcelImportService {

    private static final Logger log = LoggerFactory.getLogger(ExcelImportService.class);

    private final QuestionRepository questionRepository;
    private final ReponseRepository reponseRepository;
    private final UserRepository userRepository;

    public ExcelImportService(QuestionRepository questionRepository,
                             ReponseRepository reponseRepository,
                             UserRepository userRepository) {
        this.questionRepository = questionRepository;
        this.reponseRepository = reponseRepository;
        this.userRepository = userRepository;
    }

    /**
     * Importe les questions ET réponses depuis un fichier Excel ligne par ligne.
     * Format attendu:
     *   Colonne A : question_text
     *   Colonne B : reponse_text
     *   Colonne C : type — optionnel, défaut = TEXT
     *   Colonne D : correct (true/false) — optionnel, défaut = false
     *
     * Si la même question apparaît sur plusieurs lignes, elle est créée une seule fois
     * et chaque ligne ajoute une réponse supplémentaire.
     *
     * @param file   Le fichier Excel (.xls ou .xlsx)
     * @param userId L'ID de l'utilisateur connecté
     */
    public Map<String, Object> importQuestionsWithReponsesFromExcel(MultipartFile file, Long userId) throws IOException {
        List<Question> importedQuestions = new ArrayList<>();
        List<Reponse> importedReponses = new ArrayList<>();
        Map<String, Question> questionMap = new HashMap<>();

        // Vérifier que l'utilisateur existe avant de commencer
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur avec ID " + userId + " non trouvé"));

        Workbook workbook = null;

        try (InputStream inputStream = file.getInputStream()) {
            String filename = file.getOriginalFilename();
            if (filename != null && filename.endsWith(".xlsx")) {
                workbook = new XSSFWorkbook(inputStream);
            } else if (filename != null && filename.endsWith(".xls")) {
                workbook = new HSSFWorkbook(inputStream);
            } else {
                throw new IOException("Format non supporté. Utilisez .xls ou .xlsx");
            }

            Sheet sheet = workbook.getSheetAt(0);

            // Détecter si la première ligne est un header
            boolean skipFirstRow = false;
            if (sheet.getPhysicalNumberOfRows() > 0) {
                Row firstRow = sheet.getRow(sheet.getFirstRowNum());
                if (firstRow != null) {
                    String firstCell = getCellValueAsString(firstRow.getCell(0)).toLowerCase();
                    if (firstCell.contains("question") || firstCell.contains("text")) {
                        skipFirstRow = true;
                    }
                }
            }

            int rowIndex = 0;
            for (Row row : sheet) {
                if (rowIndex == 0 && skipFirstRow) {
                    rowIndex++;
                    continue;
                }
                rowIndex++;

                if (row == null) {
                    continue;
                }

                // Colonne A : question_text
                String questionText = getCellValueAsString(row.getCell(0));
                // Colonne B : reponse_text
                String reponseText = getCellValueAsString(row.getCell(1));
                // Colonne C : type (optionnel, défaut = TEXT)
                String typeStr = getCellValueAsString(row.getCell(2));
                QuestionType questionType = QuestionType.TEXT; // Valeur par défaut
                
                if (!typeStr.isEmpty()) {
                    try {
                        questionType = QuestionType.valueOf(typeStr.toUpperCase());
                    } catch (IllegalArgumentException e) {
                        log.warn("Type invalide '{}' à la ligne {}. Utilisation de TEXT par défaut.", typeStr, rowIndex);
                        questionType = QuestionType.TEXT;
                    }
                }
                
                // Colonne D : correct (true/false), optionnel — défaut = true si vide
                String correctStr = getCellValueAsString(row.getCell(3));
                boolean isCorrect = correctStr.isEmpty()
                        || correctStr.equalsIgnoreCase("true")
                        || correctStr.equalsIgnoreCase("vrai")
                        || correctStr.equals("1");

                // Ignorer les lignes entièrement vides
                if (questionText.isEmpty() && reponseText.isEmpty()) {
                    continue;
                }

                try {
                    // --- Enregistrer la question ---
                    Question question = null;
                    if (!questionText.isEmpty()) {
                        question = questionMap.get(questionText);

                        if (question == null) {
                            question = new Question();
                            question.setQuestionText(questionText);
                            question.setType(questionType);
                            question.setUser(user);

                            question = questionRepository.save(question);
                            questionMap.put(questionText, question);
                            importedQuestions.add(question);
                        }
                    }

                    // --- Enregistrer la réponse ---
                    if (!reponseText.isEmpty() && question != null) {
                        Reponse reponse = new Reponse();
                        reponse.setReponseText(reponseText);
                        reponse.setReponse(isCorrect);
                        reponse.setQuestion(question);

                        Reponse savedReponse = reponseRepository.save(reponse);
                        importedReponses.add(savedReponse);
                    }
                } catch (Exception e) {
                    log.warn("Erreur ligne {} — ignorée: {}", rowIndex, e.getMessage());
                }
            }
        } finally {
            if (workbook != null) {
                workbook.close();
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("questionsCount", importedQuestions.size());
        result.put("reponsesCount", importedReponses.size());

        return result;
    }

    /**
     * Convertit une cellule en String
     */
    private String getCellValueAsString(Cell cell) {
        if (cell == null) {
            return "";
        }
        
        try {
            switch (cell.getCellType()) {
                case STRING:
                    String value = cell.getStringCellValue();
                    return value != null ? value.trim() : "";
                case NUMERIC:
                    if (DateUtil.isCellDateFormatted(cell)) {
                        return cell.getDateCellValue().toString();
                    } else {
                        double numValue = cell.getNumericCellValue();
                        // Vérifier si c'est un entier
                        if (numValue == (long) numValue) {
                            return String.valueOf((long) numValue);
                        } else {
                            return String.valueOf(numValue);
                        }
                    }
                case BOOLEAN:
                    return String.valueOf(cell.getBooleanCellValue());
                case FORMULA:
                    try {
                        return cell.getStringCellValue().trim();
                    } catch (IllegalStateException e) {
                        return String.valueOf(cell.getNumericCellValue());
                    }
                case BLANK:
                    return "";
                case _NONE:
                    return "";
                default:
                    return "";
            }
        } catch (Exception e) {
            System.err.println("Erreur lecture cellule: " + e.getMessage());
            return "";
        }
    }

    /**
     * Convertit une cellule en Long
     */
    private Long getCellValueAsLong(Cell cell) {
        if (cell == null) {
            return null;
        }
        
        try {
            switch (cell.getCellType()) {
                case NUMERIC:
                    return (long) cell.getNumericCellValue();
                case STRING:
                    return Long.parseLong(cell.getStringCellValue().trim());
                default:
                    return null;
            }
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Valide le format du fichier Excel
     */
    public boolean validateExcelFormat(MultipartFile file) {
        if (file.isEmpty()) {
            return false;
        }
        
        String filename = file.getOriginalFilename();
        if (filename == null) {
            return false;
        }
        
        return filename.endsWith(".xls") || filename.endsWith(".xlsx");
    }
}
