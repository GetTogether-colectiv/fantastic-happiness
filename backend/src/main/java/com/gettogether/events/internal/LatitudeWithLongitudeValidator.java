package com.gettogether.events.internal;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class LatitudeWithLongitudeValidator implements ConstraintValidator<LatitudeWithLongitude, CreateEventRequest> {

    private static final String LATITUDE_FIELD = "latitude";

    @Override
    public boolean isValid(CreateEventRequest request, ConstraintValidatorContext context) {
        boolean hasLatitude = request.latitude() != null;
        boolean hasLongitude = request.longitude() != null;
        if (hasLatitude == hasLongitude) {
            return true;
        }
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
                .addPropertyNode(LATITUDE_FIELD)
                .addConstraintViolation();
        return false;
    }
}
