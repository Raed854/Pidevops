package MemorIA.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReponseRequest {

    @NotBlank(message = "Answer text must not be blank")
    @Size(max = 500, message = "Answer text must not exceed 500 characters")
    private String reponseText;

    @NotNull(message = "Correct flag (reponse) is required")
    private Boolean reponse;

    @NotNull(message = "Question ID is required")
    @Positive(message = "Question ID must be a positive number")
    private Long questionId;
}
