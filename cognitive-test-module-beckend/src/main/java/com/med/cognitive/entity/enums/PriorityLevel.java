package com.med.cognitive.entity.enums;

/**
 * Enum représentant les niveaux de priorité des recommandations
 */
public enum PriorityLevel {
    LOW("Priorité basse - action non urgente", "#00B050"),
    MEDIUM("Priorité moyenne - à faire sous quelques jours", "#FFC000"),
    HIGH("Priorité haute - à faire rapidement", "#FF8C00"),
    URGENT("Priorité urgente - action immédiate", "#FF0000");

    private final String description;
    private final String colorCode;

    PriorityLevel(String description, String colorCode) {
        this.description = description;
        this.colorCode = colorCode;
    }

    public String getDescription() {
        return description;
    }

    public String getColorCode() {
        return colorCode;
    }
}
