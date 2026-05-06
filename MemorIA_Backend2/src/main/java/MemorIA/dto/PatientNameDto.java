package MemorIA.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PatientNameDto {
    private Long id;
    private String prenom;
    private String nom;
    private String telephone;
    private String email;
}
