package com.med.cognitive.entity.enums;

/**
 * Enum représentant les types de tests cognitifs
 */
public enum TypeTest {
    MEMORY("Test de mémoire (rappel de mots, reconnaissance)"),
    LANGUAGE("Test de langage (dénomination, compréhension)"),
    REFLECTION("Test de réflexion et raisonnement"),
    CONFUSION("Test d'évaluation de la confusion et de l'orientation");

    private final String description;

    TypeTest(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
