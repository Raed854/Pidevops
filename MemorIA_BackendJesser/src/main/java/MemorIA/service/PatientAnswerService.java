package MemorIA.service;

import MemorIA.entity.diagnostic.PatientAnswer;
import MemorIA.entity.diagnostic.Question;
import MemorIA.repository.PatientAnswerRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class PatientAnswerService {

    private final PatientAnswerRepository patientAnswerRepository;
    private final AnswerVerificationService verificationService;

    public PatientAnswerService(PatientAnswerRepository patientAnswerRepository,
                                AnswerVerificationService verificationService) {
        this.patientAnswerRepository = patientAnswerRepository;
        this.verificationService = verificationService;
    }

    public List<PatientAnswer> getAllPatientAnswers() {
        return patientAnswerRepository.findAll();
    }

    public Optional<PatientAnswer> getPatientAnswerById(Long id) {
        return patientAnswerRepository.findById(id);
    }

    /**
     * Sauvegarde une réponse patient avec vérification automatique du score
     */
    public PatientAnswer savePatientAnswer(PatientAnswer patientAnswer) {
        // Vérifier automatiquement la réponse si applicable
        Question question = patientAnswer.getQuestion();
        if (question != null) {
            Double autoScore = verificationService.verifyAnswer(question, patientAnswer.getReponseText());
            
            // Si un score automatique est calculé, l'utiliser
            if (autoScore != null) {
                patientAnswer.setScoreObtenu(autoScore);
            }
            // Sinon, utiliser le score fourni (ou null)
        }
        
        return patientAnswerRepository.save(patientAnswer);
    }

    public PatientAnswer updatePatientAnswer(Long id, PatientAnswer patientAnswerDetails) {
        PatientAnswer patientAnswer = patientAnswerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("PatientAnswer not found with id: " + id));
        
        patientAnswer.setReponseText(patientAnswerDetails.getReponseText());
        patientAnswer.setScoreObtenu(patientAnswerDetails.getScoreObtenu());
        patientAnswer.setTempsReponseSecondes(patientAnswerDetails.getTempsReponseSecondes());
        patientAnswer.setDiagnostic(patientAnswerDetails.getDiagnostic());
        patientAnswer.setQuestion(patientAnswerDetails.getQuestion());
        
        return patientAnswerRepository.save(patientAnswer);
    }

    public void deletePatientAnswer(Long id) {
        patientAnswerRepository.deleteById(id);
    }

    public List<PatientAnswer> getPatientAnswersByDiagnosticId(Long diagnosticId) {
        return patientAnswerRepository.findByDiagnosticIdDiagnostic(diagnosticId);
    }

    public List<PatientAnswer> getPatientAnswersByQuestionId(Long questionId) {
        return patientAnswerRepository.findByQuestionId(questionId);
    }

    public List<PatientAnswer> getPatientAnswersByDiagnosticAndQuestion(Long diagnosticId, Long questionId) {
        return patientAnswerRepository.findByDiagnosticIdDiagnosticAndQuestionId(diagnosticId, questionId);
    }
}
