package MemorIA.dto;

import MemorIA.entity.alerts.Alert;
import MemorIA.entity.alerts.AlertType;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

/**
 * Représentation d'une alerte pour affichage en carte (dashboard, liste)
 * Inclut le score de gravité calculé et l'explanation
 */
public record AlertCardDTO(
        Long id,
        Long patientId,
        String patientName,
        String title,
        String description,
        AlertType type,
        Alert.AlertStatus status,
        Alert.AlertSeverity severity,
        
        /**
         * Score de gravité dynamique (0-100)
         */
        @JsonProperty("gravity_score")
        Integer gravityScore,
        
        /**
         * Texte explicatif court du score
         */
        @JsonProperty("gravity_explanation")
        String gravityExplanation,
        
        /**
         * Indique si l'alerte a été escaladée
         */
        boolean escalated,
        
        /**
         * ID du reminder manqué (si applicable)
         */
        @JsonProperty("linked_reminder_id")
        Long linkedReminderId,
        
        /**
         * Type du reminder manqué
         */
        @JsonProperty("linked_reminder_type")
        String linkedReminderType,
        
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime assignedAt,
        LocalDateTime resolvedAt,
        
        @JsonProperty("is_read")
        boolean read,
        
        @JsonProperty("created_by_id")
        Long createdById,
        
        @JsonProperty("created_by_name")
        String createdByName,
        
        @JsonProperty("assigned_to_user_id")
        Long assignedToUserId,
        
        @JsonProperty("assigned_to_user_name")
        String assignedToUserName,
        
        /**
         * Note clinique si présente
         */
        @JsonProperty("clinical_note")
        String clinicalNote
) {
}
