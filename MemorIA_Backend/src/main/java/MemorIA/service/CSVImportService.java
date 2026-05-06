package MemorIA.service;

import MemorIA.entity.User;
import MemorIA.entity.diagnostic.Question;
import MemorIA.entity.diagnostic.QuestionType;
import MemorIA.entity.diagnostic.Reponse;
import MemorIA.repository.QuestionRepository;
import MemorIA.repository.ReponseRepository;
import MemorIA.repository.UserRepository;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class CSVImportService {

    private static final Logger log = LoggerFactory.getLogger(CSVImportService.class);

    private final QuestionRepository questionRepository;
    private final ReponseRepository reponseRepository;
    private final UserRepository userRepository;

    public CSVImportService(QuestionRepository questionRepository,
                           ReponseRepository reponseRepository,
                           UserRepository userRepository) {
        this.questionRepository = questionRepository;
        this.reponseRepository = reponseRepository;
        this.userRepository = userRepository;
    }

    /**
     * Importe les questions ET réponses depuis un fichier CSV
     * Format attendu: question_text,reponse_text,user_id
     */
    public Map<String, Object> importQuestionsWithReponsesFromCSV(MultipartFile file) throws IOException {
        List<Question> importedQuestions = new ArrayList<>();
        List<Reponse> importedReponses = new ArrayList<>();
        Map<String, Question> questionMap = new HashMap<>();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));
             CSVReader csvReader = new CSVReader(reader)) {

            List<String[]> rows;
            try {
                rows = csvReader.readAll();
            } catch (CsvException e) {
                throw new IOException("Failed to parse CSV file: " + e.getMessage(), e);
            }
            
            // Ignorer la première ligne (header)
            boolean isFirstRow = true;
            
            for (String[] row : rows) {
                if (isFirstRow) {
                    isFirstRow = false;
                    continue;
                }
                
                // Vérifier que la ligne a au moins 2 colonnes
                if (row.length < 2) {
                    continue;
                }
                
                try {
                    String questionText = row[0].trim();
                    String reponseText = row[1].trim();
                    
                    // Déterminer userId (final)
                    final Long userId = (row.length >= 3 && !row[2].trim().isEmpty()) 
                        ? Long.parseLong(row[2].trim()) 
                        : 1L; // Par défaut
                    
                    // Vérifier que l'utilisateur existe
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
                    
                    // Vérifier si la question existe déjà
                    Question question = questionMap.get(questionText);
                    
                    if (question == null) {
                        // Créer une nouvelle question
                        question = new Question();
                        question.setQuestionText(questionText);
                        question.setType(QuestionType.TEXT);
                        question.setUser(user);
                        
                        question = questionRepository.save(question);
                        questionMap.put(questionText, question);
                        importedQuestions.add(question);
                    }
                    
                    // Créer la réponse associée (seulement si reponseText n'est pas vide)
                    if (!reponseText.isEmpty()) {
                        Reponse reponse = new Reponse();
                        reponse.setReponseText(reponseText);
                        reponse.setReponse(true); // la colonne reponse_text du CSV est la bonne réponse
                        reponse.setQuestion(question);
                        
                        Reponse savedReponse = reponseRepository.save(reponse);
                        importedReponses.add(savedReponse);
                    }
                    
                } catch (NumberFormatException e) {
                    log.warn("Invalid user_id in row: {}", String.join(",", row));
                } catch (RuntimeException e) {
                    log.warn("Error processing row: {}", e.getMessage());
                }
            }
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("questionsCount", importedQuestions.size());
        result.put("reponsesCount", importedReponses.size());
        
        return result;
    }

    /**
     * Valide le format du fichier CSV
     */
    public boolean validateCSVFormat(MultipartFile file) {
        if (file.isEmpty()) {
            return false;
        }
        
        String filename = file.getOriginalFilename();
        return filename != null && filename.endsWith(".csv");
    }
}
