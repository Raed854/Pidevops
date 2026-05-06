package MemorIA.entity.Planning;

/**
 * Type de récurrence d'un rappel.
 * NONE    = rappel unique (pas de répétition)
 * DAILY   = se répète chaque jour à la même heure
 * WEEKLY  = se répète chaque semaine le même jour de la semaine
 * MONTHLY = se répète chaque mois le même jour du mois
 */
public enum RecurrenceType {
    NONE,
    DAILY,
    WEEKLY,
    MONTHLY
}

