package MemorIA.controller;

import MemorIA.dto.QuestionRequest;
import MemorIA.entity.diagnostic.Question;
import MemorIA.service.QuestionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/questions")
public class QuestionController {

    private final QuestionService questionService;

    public QuestionController(QuestionService questionService) {
        this.questionService = questionService;
    }

    @GetMapping
    public ResponseEntity<List<Question>> getAllQuestions() {
        List<Question> questions = questionService.getAllQuestions();
        return ResponseEntity.ok(questions);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Question> getQuestionById(@PathVariable Long id) {
        return questionService.getQuestionById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Question> createQuestion(@Valid @RequestBody QuestionRequest request) {
        Question savedQuestion = questionService.createQuestion(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedQuestion);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Question> updateQuestion(@PathVariable Long id, @RequestBody Question question) {
        try {
            Question updatedQuestion = questionService.updateQuestion(id, question);
            return ResponseEntity.ok(updatedQuestion);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteQuestion(@PathVariable Long id) {
        questionService.deleteQuestion(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Question>> getQuestionsByUserId(@PathVariable Long userId) {
        List<Question> questions = questionService.getQuestionsByUserId(userId);
        return ResponseEntity.ok(questions);
    }

    @GetMapping("/user/{userId}/ordered")
    public ResponseEntity<List<Question>> getQuestionsByUserIdOrdered(@PathVariable Long userId) {
        List<Question> questions = questionService.getQuestionsByUserIdOrdered(userId);
        return ResponseEntity.ok(questions);
    }

    @GetMapping("/random")
    public ResponseEntity<List<Question>> getRandomQuestions() {
        List<Question> questions = questionService.getRandomQuestions();
        return ResponseEntity.ok(questions);
    }
}
