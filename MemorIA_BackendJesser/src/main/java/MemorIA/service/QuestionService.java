package MemorIA.service;

import MemorIA.dto.QuestionRequest;
import MemorIA.entity.User;
import MemorIA.entity.diagnostic.Question;
import MemorIA.entity.diagnostic.QuestionType;
import MemorIA.repository.QuestionRepository;
import MemorIA.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final UserRepository userRepository;

    public QuestionService(QuestionRepository questionRepository, UserRepository userRepository) {
        this.questionRepository = questionRepository;
        this.userRepository = userRepository;
    }

    public List<Question> getAllQuestions() {
        return questionRepository.findAll();
    }

    public Optional<Question> getQuestionById(Long id) {
        return questionRepository.findById(id);
    }

    public Question saveQuestion(Question question) {
        return questionRepository.save(question);
    }

    public Question createQuestion(QuestionRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found with id: " + request.getUserId()));

        Question question = new Question();
        question.setQuestionText(request.getQuestionText());
        question.setType(QuestionType.valueOf(request.getType()));
        question.setUser(user);

        return questionRepository.save(question);
    }

    public Question updateQuestion(Long id, Question questionDetails) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found with id: " + id));
        
        question.setQuestionText(questionDetails.getQuestionText());
        question.setType(questionDetails.getType());
        
        return questionRepository.save(question);
    }

    public void deleteQuestion(Long id) {
        questionRepository.deleteById(id);
    }

    public List<Question> getQuestionsByUserId(Long userId) {
        return questionRepository.findByUserId(userId);
    }

    public List<Question> getQuestionsByUserIdOrdered(Long userId) {
        return questionRepository.findByUserIdOrderByDateCreationDesc(userId);
    }

    @Transactional(readOnly = true)
    public List<Question> getRandomQuestions() {
        List<Question> allQuestions = questionRepository.findAllWithReponses();

        if (allQuestions.isEmpty()) {
            return new ArrayList<>();
        }

        // Force initialization of lazy patientAnswers while session is open
        allQuestions.forEach(q -> {
            if (q.getPatientAnswers() != null) {
                q.getPatientAnswers().size();
            }
        });

        Collections.shuffle(allQuestions);

        int limit = Math.min(10, allQuestions.size());
        return allQuestions.stream()
                .limit(limit)
                .collect(Collectors.toList());
    }
}
