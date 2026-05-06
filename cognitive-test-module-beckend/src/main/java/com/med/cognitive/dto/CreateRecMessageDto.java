package com.med.cognitive.dto;

import com.med.cognitive.entity.RecMessage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO pour créer un nouveau message de recommandation
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateRecMessageDto {

    @NotBlank(message = "Le texte du message ne peut pas être vide")
    private String text;

    @NotNull(message = "Le type d'expéditeur est requis")
    private RecMessage.SenderType from;

    @NotNull(message = "La priorité du message est requise")
    private RecMessage.MessagePriority priority;
}
