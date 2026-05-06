package MemorIA.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TreatmentCreateRequest {

    @NotBlank(message = "Le titre est obligatoire")
    private String titre;

    private Boolean alerteActive;

    private String typeAlerte;
}
