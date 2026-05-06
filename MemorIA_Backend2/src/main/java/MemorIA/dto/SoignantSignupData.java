package MemorIA.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.LocalDate;

public record SoignantSignupData(
        @NotBlank String numeroOrdre,
        @NotBlank String specialite,
        @NotBlank String hopital,
        String numeroTelephone2,
        String diplomes,
        @PositiveOrZero Integer anneesExperience,
        String biographie,
        LocalDate dateDebutExercice
) {}
