package com.med.cognitive.entity.enums;

/**
 * Enum représentant l'origine/source d'une décision
 */
public enum DecisionSource {
    AI_MODEL("Décision générée par le modèle d'intelligence artificielle"),
    RULE_BASED("Décision basée sur des règles prédéfinies"),
    MANUAL("Décision saisie manuellement par un médecin"),
    HYBRID("Décision combinant IA et règles");

    private final String description;

    DecisionSource(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
