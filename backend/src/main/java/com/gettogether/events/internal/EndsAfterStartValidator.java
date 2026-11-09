package com.gettogether.events.internal;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class EndsAfterStartValidator implements ConstraintValidator<EndsAfterStart, CreateEventRequest> {

    private static final String END_FIELD = "endsAt";

    @Override
    public boolean isValid(CreateEventRequest request, ConstraintValidatorContext context) {
        if (request.startsAt() == null || request.endsAt() == null || request.endsAt().isAfter(request.startsAt())) {
            return true;
        }
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
                .addPropertyNode(END_FIELD)
                .addConstraintViolation();
        return false;
    }
}