package MemorIA.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionCSVDTO {
    private String questionText;
    private String type;
    private Long userId;
}
