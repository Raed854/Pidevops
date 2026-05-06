package com.med.cognitive.validator;

import com.med.cognitive.entity.TestResult;
import com.med.cognitive.exception.BusinessLogicException;
import org.springframework.stereotype.Component;

@Component
public class TestResultValidator {
    public void validate(TestResult result) {
        if (result.getCompletionRate() != null && result.getCompletionRate() < 50.0) {
            // Logic handled in service (flagging), but here we could throw if strictly
            // invalid
            // For now, let's say we validate score consistency
        }

        if (result.getScoreTotale() != null && result.getMaxPossibleScore() != null) {
            if (result.getScoreTotale() > result.getMaxPossibleScore()) {
                throw new BusinessLogicException("Score total cannot exceed max possible score");
            }
        }
    }
}
