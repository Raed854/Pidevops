package MemorIA.dto;

import MemorIA.entity.role.GroupeSanguin;
import MemorIA.entity.role.Sexe;

import java.time.LocalDate;

public record PatientSignupData(
        LocalDate dateNaissance,
        Sexe sexe,
        String numeroSecuriteSociale,
        String adresse,
        String ville,
        GroupeSanguin groupeSanguin,
        String mutuelle,
        String numeroPoliceMutuelle
) {}
