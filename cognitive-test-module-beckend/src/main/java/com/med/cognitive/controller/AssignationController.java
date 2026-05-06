package com.med.cognitive.controller;

import com.med.cognitive.dto.*;
import com.med.cognitive.entity.PatientTestAssign;
import com.med.cognitive.entity.TestAnswer;
import com.med.cognitive.entity.TestResult;
import com.med.cognitive.mysql.entity.User;
import com.med.cognitive.repository.PatientTestAssignRepository;
import com.med.cognitive.mysql.repository.UserRepository;
import com.med.cognitive.service.AssignationService;
import com.med.cognitive.service.CognitiveTestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/assignations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AssignationController {

    private final AssignationService assignationService;
    private final UserRepository userRepository;
    private final PatientTestAssignRepository assignRepository;
    private final CognitiveTestService testService;

    @GetMapping
    public ResponseEntity<List<PatientTestAssign>> getAll() {
        return ResponseEntity.ok(assignRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<PatientTestAssign> create(@RequestBody AssignationRequest request) {
        return ResponseEntity.ok(assignationService.createAssignation(request));
    }

    @PostMapping("/personalized")
    public ResponseEntity<PatientTestAssign> createPersonalized(@Valid @RequestBody PersonalizedTestRequest request) {
        return ResponseEntity.ok(assignationService.createPersonalizedAssignation(request));
    }

    @GetMapping("/medecin/{soignantId}")
    public ResponseEntity<List<PatientTestAssign>> getByMedecin(@PathVariable Long soignantId) {
        return ResponseEntity.ok(assignationService.getAssignationsByMedecin(soignantId));
    }

    @GetMapping("/all")
    public ResponseEntity<List<PatientTestAssign>> getAllAssignations() {
        return ResponseEntity.ok(assignRepository.findAll());
    }

    @GetMapping("/medecin/{soignantId}/patients")
    public ResponseEntity<List<UserDTO>> getPatientsByMedecin(@PathVariable Long soignantId) {
        List<User> patients = userRepository.findAll().stream()
                .filter(u -> "PATIENT".equals(u.getRole()) && 
                        u.getSoignant() != null && 
                        u.getSoignant().getId().equals(soignantId))
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(patients.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList()));
    }

    @GetMapping("/patients/all")
    public ResponseEntity<List<Map<String, Object>>> getAllPatients() {
        return ResponseEntity.ok(userRepository.findByRole("PATIENT").stream()
                .map(p -> Map.of(
                    "id", (Object) p.getId(),
                    "nom", (Object) p.getNom(),
                    "prenom", (Object) p.getPrenom(),
                    "email", (Object) (p.getEmail() != null ? p.getEmail() : "")
                ))
                .collect(Collectors.toList()));
    }

    @GetMapping("/patients")
    public ResponseEntity<List<Map<String, Object>>> getPatients() {
        return ResponseEntity.ok(userRepository.findByRole("PATIENT").stream()
                .map(p -> Map.of(
                    "id", (Object) p.getId(),
                    "nom", (Object) p.getNom(),
                    "prenom", (Object) p.getPrenom(),
                    "email", (Object) (p.getEmail() != null ? p.getEmail() : ""),
                    "age", (Object) 65,
                    "score", (Object) 24,
                    "stage", (Object) "Stable"
                ))
                .collect(Collectors.toList()));
    }

    @GetMapping("/patients/with-medecin")
    public ResponseEntity<List<Map<String, Object>>> getPatientsWithMedecin() {
        List<User> patients = userRepository.findByRole("PATIENT");
        return ResponseEntity.ok(patients.stream()
                .map(p -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("id", p.getId());
                    map.put("nom", p.getNom());
                    map.put("prenom", p.getPrenom());
                    map.put("email", p.getEmail());
                    map.put("age", 65);
                    map.put("score", 24);
                    map.put("stage", "Stable");
                    map.put("aidants", p.getRelation() != null ? p.getRelation() : "");
                    if (p.getSoignant() != null) {
                        map.put("medecin", Map.of(
                            "id", p.getSoignant().getId(),
                            "nom", p.getSoignant().getNom(),
                            "prenom", p.getSoignant().getPrenom()
                        ));
                    }
                    return map;
                })
                .collect(Collectors.toList()));
    }

    @GetMapping("/soignants/all")
    public ResponseEntity<List<Map<String, Object>>> getAllSoignantsList() {
        return ResponseEntity.ok(userRepository.findByRole("SOIGNANT").stream()
                .map(s -> {
                    Map<String, Object> m = new java.util.HashMap<>();
                    m.put("id", s.getId());
                    m.put("nom", s.getNom());
                    m.put("prenom", s.getPrenom());
                    m.put("email", s.getEmail() != null ? s.getEmail() : "");
                    m.put("specialite", s.getSpecialite() != null ? s.getSpecialite() : "Médecin");
                    return m;
                })
                .collect(Collectors.toList()));
    }

    @GetMapping("/patient/{patientId}/tests")
    public ResponseEntity<List<PatientTestAssign>> getTestsByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(assignationService.getAssignationsByPatient(patientId));
    }

    @GetMapping("/aidant/{accompagnantId}/a-faire")
    public ResponseEntity<List<PatientTestAssign>> getByAidant(@PathVariable Long accompagnantId) {
        return ResponseEntity.ok(assignationService.getAssignationsByAidant(accompagnantId));
    }

    @GetMapping("/aidant/{accompagnantId}/planning")
    public ResponseEntity<List<AidantPlanningItemDto>> getPlanningByAidant(@PathVariable Long accompagnantId) {
        List<AidantPlanningItemDto> dto = assignationService.getPlanningByAidant(accompagnantId).stream()
                .map(a -> new AidantPlanningItemDto(
                        a.getId(),
                        a.getPatientId(),
                        a.getAccompagnantId(),
                        a.getSoignantId(),
                        a.getTest() != null ? a.getTest().getId() : null,
                        a.getTest() != null ? a.getTest().getTitre() : null,
                        a.getTest() != null && a.getTest().getType() != null ? a.getTest().getType().name() : null,
                        a.getStatus() != null ? a.getStatus().name() : null,
                        a.getDateAssignation(),
                        a.getDateLimite()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(dto);
    }

    @PostMapping("/demarrer/{assignId}")
    public ResponseEntity<TestResult> start(@PathVariable Long assignId, @RequestParam Long accompagnantId) {
        return ResponseEntity.ok(assignationService.startTest(assignId, accompagnantId));
    }

    @PostMapping("/terminer/{resultId}")
    public ResponseEntity<TestResult> finish(@PathVariable Long resultId,
            @RequestBody Map<String, Object> payload) {
        List<TestAnswer> answers = (List<TestAnswer>) payload.get("answers");
        String observations = (String) payload.get("observations");
        return ResponseEntity.ok(assignationService.finishTest(resultId, answers, observations));
    }

    /**
     * Convert User entity to UserDTO
     */
    private UserDTO convertToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setNom(user.getNom());
        dto.setPrenom(user.getPrenom());
        dto.setEmail(user.getEmail());
        dto.setTelephone(user.getTelephone());
        dto.setRole(user.getRole());
        dto.setActif(user.getActif());
        dto.setAdresse(user.getAdresse());
        dto.setDateNaissance(user.getDateNaissance());
        dto.setSexe(user.getSexe());
        dto.setSpecialite(user.getSpecialite());
        dto.setMatricule(user.getMatricule());
        dto.setRelation(user.getRelation());
        dto.setProfileCompleted(user.getProfileCompleted());
        if (user.getSoignant() != null) {
            dto.setSoignantId(user.getSoignant().getId());
        }
        if (user.getPatient() != null) {
            dto.setPatientId(user.getPatient().getId());
        }
        return dto;
    }
}
