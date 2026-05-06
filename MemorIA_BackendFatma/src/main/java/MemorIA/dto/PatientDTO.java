package MemorIA.dto;

import lombok.Data;
import MemorIA.entity.AlzheimerStage;

import java.time.LocalDate;

@Data
public class PatientDTO {
    private Long id;
    private String nom;
    private String prenom;
    private Integer age;
    private String photo;
    private String initials;
    private AlzheimerStage stage;
    private Double adherenceRate;
    private LocalDate nextAppointment;
    private Boolean actif;
}

