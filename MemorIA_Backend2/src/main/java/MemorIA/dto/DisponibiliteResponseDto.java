package MemorIA.dto;

import MemorIA.entity.Traitements.Disponibilite;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DisponibiliteResponseDto {

    private Long id;
    private String date;
    private String heureDebut;
    private String heureFin;
    private String statut;
    private PatientInfo patient;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PatientInfo {
        private Long id;
        private String nom;
        private String prenom;
    }

    public static DisponibiliteResponseDto fromEntity(Disponibilite d) {
        DisponibiliteResponseDto dto = new DisponibiliteResponseDto();
        dto.setId(d.getIdDisponibilite());
        dto.setDate(d.getDate().toString());
        dto.setHeureDebut(d.getHeureDebut().toString());
        dto.setHeureFin(d.getHeureFin().toString());
        dto.setStatut(d.getStatut().name());
        if (d.getPatient() != null) {
            dto.setPatient(new PatientInfo(
                    d.getPatient().getId(),
                    d.getPatient().getNom(),
                    d.getPatient().getPrenom()
            ));
        }
        return dto;
    }
}
