package MemorIA.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank @Size(min = 2) String nom,
        @NotBlank @Size(min = 2) String prenom,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8) String telephone,
        @NotBlank String role,
        @NotBlank @Size(min = 6) String password
) {}
