package com.med.cognitive.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PersonalizedTestRequest {

    @NotNull(message = "L'identifiant du patient est obligatoire")
    private Long patientId;

    private Long soignantId;

    private Long accompagnantId;

    @NotBlank(message = "Le titre est obligatoire")
    @Size(min = 3, max = 255, message = "Le titre doit contenir entre 3 et 255 caractères")
    private String titre;

    @Size(max = 1000, message = "La description ne peut pas dépasser 1000 caractères")
    private String description;

    private String stage;

    @NotBlank(message = "La date limite est obligatoire")
    @JsonProperty("dateLimite")
    private String dateLimitString;

    @Size(max = 2000, message = "Les instructions ne peuvent pas dépasser 2000 caractères")
    private String instructions;

    @NotEmpty(message = "Le test doit contenir au moins un élément")
    @Valid
    private List<Item> items;

    public LocalDate getDateLimitAsLocalDate() {
        if (dateLimitString == null || dateLimitString.isEmpty()) {
            return null;
        }
        try {
            return LocalDate.parse(dateLimitString, DateTimeFormatter.ISO_DATE);
        } catch (Exception e) {
            return null;
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Item {

        @NotBlank(message = "La question de l'élément est obligatoire")
        private String question;

        @NotBlank(message = "La réponse de l'élément est obligatoire")
        private String reponse;

        @NotNull(message = "Le score de l'élément est obligatoire")
        @Min(value = 1, message = "Le score minimum est 1 point")
        @Max(value = 10, message = "Le score maximum est 10 points")
        private Integer score;

        private String imageUrl;

        @JsonProperty("metadata")
        private Map<String, Object> metadata;
    }
}
