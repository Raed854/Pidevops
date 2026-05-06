package MemorIA.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;

public record ChatMessageDTO(
        Long patientId,
        Long senderUserId,
        String senderRole,
        String senderName,
        String content,
        LocalDateTime sentAt
) {
}

