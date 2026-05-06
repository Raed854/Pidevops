package MemorIA.dto;

import MemorIA.entity.role.FrequenceAccompagnement;
import MemorIA.entity.role.LienPatient;
import MemorIA.entity.role.SituationPro;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record AccompagnantSignupData(
        @NotNull LienPatient lienPatient,
        @NotNull LocalDate dateNaissance,
        String adresse,
        String codePostal,
        String ville,
        String telephoneSecours,
        SituationPro situationPro,
        @NotNull FrequenceAccompagnement frequenceAccompagnement
) {}
