package com.med.cognitive.validator;

import com.med.cognitive.entity.Decision;
import com.med.cognitive.entity.enums.DecisionSource;
import com.med.cognitive.exception.BusinessLogicException;
import org.springframework.stereotype.Component;

@Component
public class DecisionValidator {
    public void validate(Decision decision) {
        if (decision.getConfidence() != null) {
            if (decision.getConfidence() < 0.0 || decision.getConfidence() > 1.0) {
                throw new BusinessLogicException("Confidence must be between 0.0 and 1.0");
            }
        }

        if (decision.getSourceType() == DecisionSource.AI_MODEL && decision.getConfidence() == null) {
            throw new BusinessLogicException("AI decisions must have a confidence score");
        }
    }
}
