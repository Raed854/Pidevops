package com.med.cognitive.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.med.cognitive.entity.RecMessage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO pour représenter un message de recommandation
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecMessageDto {

    private Long id;

    private Long recId;

    private String text;

    private RecMessage.SenderType from;

    private RecMessage.MessagePriority priority;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime sentAt;

    private Boolean read;

    private Long readBy;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime readAt;

    /**
     * Convertit une entité RecMessage en DTO
     */
    public static RecMessageDto fromEntity(RecMessage message) {
        return RecMessageDto.builder()
            .id(message.getId())
            .recId(message.getRecId())
            .text(message.getText())
            .from(message.getFrom())
            .priority(message.getPriority())
            .sentAt(message.getSentAt())
            .read(message.getRead())
            .readBy(message.getReadBy())
            .readAt(message.getReadAt())
            .build();
    }
}
