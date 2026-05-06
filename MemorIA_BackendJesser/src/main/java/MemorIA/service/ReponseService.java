package MemorIA.service;

import MemorIA.dto.ReponseRequest;
import MemorIA.entity.diagnostic.Question;
import MemorIA.entity.diagnostic.Reponse;
import MemorIA.repository.QuestionRepository;
import MemorIA.repository.ReponseRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ReponseService {

    private final ReponseRepository reponseRepository;
    private final QuestionRepository questionRepository;

    public ReponseService(ReponseRepository reponseRepository, QuestionRepository questionRepository) {
        this.reponseRepository = reponseRepository;
        this.questionRepository = questionRepository;
    }

    public List<Reponse> getAllReponses() {
        return reponseRepository.findAll();
    }

    public Optional<Reponse> getReponseById(Long id) {
        return reponseRepository.findById(id);
    }

    public Reponse saveReponse(Reponse reponse) {
        return reponseRepository.save(reponse);
    }

    public Reponse createReponse(ReponseRequest request) {
        Question question = questionRepository.findById(request.getQuestionId())
                .orElseThrow(() -> new RuntimeException("Question not found with id: " + request.getQuestionId()));

        Reponse reponse = new Reponse();
        reponse.setReponseText(request.getReponseText());
        reponse.setReponse(request.getReponse());
        reponse.setQuestion(question);
        reponse.setDateReponse(LocalDateTime.now());

        return reponseRepository.save(reponse);
    }

    public Reponse updateReponse(Long id, Reponse reponseDetails) {
        Reponse reponse = reponseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reponse not found with id: " + id));
        
        reponse.setReponse(reponseDetails.getReponse());
        reponse.setReponseText(reponseDetails.getReponseText());
        reponse.setTempsReponse(reponseDetails.getTempsReponse());
        reponse.setDateReponse(reponseDetails.getDateReponse());
        
        return reponseRepository.save(reponse);
    }

    public void deleteReponse(Long id) {
        reponseRepository.deleteById(id);
    }

    public List<Reponse> getReponsesByQuestionId(Long idQuestion) {
        return reponseRepository.findByQuestionId(idQuestion);
    }

    public List<Reponse> getReponsesByAnswer(Boolean reponse) {
        return reponseRepository.findByReponse(reponse);
    }
}
