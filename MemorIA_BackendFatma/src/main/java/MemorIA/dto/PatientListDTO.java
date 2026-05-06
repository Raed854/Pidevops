package MemorIA.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientListDTO {
    private Long id;
    private String firstName;
    private String lastName;
    private Integer age;
    private String stage;
    private Double adherencePercentage;
    private String photoUrl;
    private String initials;
    private Long numberOfAlerts;
}

