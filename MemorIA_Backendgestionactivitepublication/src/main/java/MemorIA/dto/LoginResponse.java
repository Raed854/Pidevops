package MemorIA.dto;

public record LoginResponse(
        Long id,
        String email,
        String nom,
        String prenom,
        String role,
        Boolean actif,
        Boolean profileCompleted
) {}
