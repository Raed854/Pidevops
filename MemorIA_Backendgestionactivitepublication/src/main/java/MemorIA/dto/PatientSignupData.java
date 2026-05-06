package MemorIA.dto;

import MemorIA.entity.role.GroupeSanguin;
import MemorIA.entity.role.Sexe;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record PatientSignupData(
        @NotNull LocalDate dateNaissance,
        @NotNull Sexe sexe,
        @NotBlank @Size(min = 1, max = 50) @Pattern(regexp = "^[0-9]{13,15}$", message = "Numéro de sécurité sociale must be 13 to 15 digits") String numeroSecuriteSociale,
        String adresse,
        String ville,
        GroupeSanguin groupeSanguin,
        String mutuelle,
        String numeroPoliceMutuelle
) {}
