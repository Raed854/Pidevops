package MemorIA.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageRequest {
    private String content;
    private String imageUrl;
    private String fileUrl;
    private String fileType;
    private String tags;
    private Long forwardedFromMessageId;
    private Long replyToMessageId;
}
