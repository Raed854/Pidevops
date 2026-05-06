package com.med.cognitive.controller;

import com.med.cognitive.dto.AidantPatientTestDto;
import com.med.cognitive.dto.AccompagnantDTO;
import com.med.cognitive.entity.Accompagnant;
import com.med.cognitive.entity.Patient;
import com.med.cognitive.entity.PatientTestAssign;
import com.med.cognitive.repository.AccompagnantRepository;
import com.med.cognitive.repository.PatientTestAssignRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/aidant")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AidantController {

    private final AccompagnantRepository accompagnantRepository;
    private final PatientTestAssignRepository assignRepository;

    @GetMapping("/all")
    public ResponseEntity<List<AccompagnantDTO>> getAllAidants() {
        List<Accompagnant> aidants = accompagnantRepository.findAll();
        List<AccompagnantDTO> dtos = aidants.stream().map(a -> {
            AccompagnantDTO dto = new AccompagnantDTO();
            dto.setId(a.getId());
            dto.setNom(a.getNom());
            dto.setPrenom(a.getPrenom());
            dto.setEmail(a.getEmail());
            dto.setTelephone(a.getTelephone());
            dto.setRole(a.getRole());
            dto.setActif(a.isActif());
            dto.setRelation(a.getRelation());
            if (a.getPatient() != null) {
                dto.setPatientId(a.getPatient().getId());
            }
            return dto;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/patient-tests/{aidantId}")
    public ResponseEntity<List<AidantPatientTestDto>> getAidantPatientTests(@PathVariable Long aidantId) {
        // One patient has only one aidant: we use existing relationship Accompagnant -> Patient
        Accompagnant aidant = accompagnantRepository.findById(aidantId).orElse(null);
        if (aidant == null) {
            return ResponseEntity.notFound().build();
        }

        Patient patient = aidant.getPatient();
        if (patient == null || patient.getId() == null) {
            return ResponseEntity.ok(List.of());
        }

        List<PatientTestAssign> assignations = assignRepository.findByPatientId(patient.getId());

        String patientName = (patient.getPrenom() != null ? patient.getPrenom() : "")
                + (patient.getNom() != null ? " " + patient.getNom() : "");

        List<AidantPatientTestDto> dto = assignations.stream()
                .map(a -> new AidantPatientTestDto(
                        patient.getId(),
                        patientName.trim().isEmpty() ? ("Patient #" + patient.getId()) : patientName.trim(),
                        a.getTest() != null ? a.getTest().getId() : null,
                        a.getTest() != null ? a.getTest().getTitre() : null,
                        a.getStatus() != null ? a.getStatus().name() : null,
                        a.getDateAssignation()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(dto);
    }
}
