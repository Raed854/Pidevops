package MemorIA.dto;

import MemorIA.entity.role.FrequenceAccompagnement;
import MemorIA.entity.role.LienPatient;
import MemorIA.entity.role.SituationPro;

import java.time.LocalDate;

public record AccompagnantSignupData(
        LienPatient lienPatient,
        LocalDate dateNaissance,
        String adresse,
        String codePostal,
        String ville,
        String telephoneSecours,
        SituationPro situationPro,
        FrequenceAccompagnement frequenceAccompagnement
) {}
