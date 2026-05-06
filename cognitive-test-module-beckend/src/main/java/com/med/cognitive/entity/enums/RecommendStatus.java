package com.med.cognitive.entity.enums;

/**
 * Enum représentant le statut d'une recommandation
 */
public enum RecommendStatus {
    PENDING("En attente, l'aidant n'a pas encore commencé"),
    IN_PROGRESS("En cours, l'aidant a commencé l'action"),
    COMPLETED("Terminé, l'action a été réalisée"),
    DISMISSED("Ignorée, l'action ne sera pas réalisée");

    private final String description;

    RecommendStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
