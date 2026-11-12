package com.gettogether.events.internal;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class ValidMapAreaValidator implements ConstraintValidator<ValidMapArea, MapArea> {

    static final String INCOMPLETE_MESSAGE = "Give all four edges of the area, or none";
    static final String LATITUDES_SWAPPED_MESSAGE = "maxLatitude must not be below minLatitude";
    static final String LONGITUDES_SWAPPED_MESSAGE = "maxLongitude must not be below minLongitude";

    @Override
    public boolean isValid(MapArea area, ConstraintValidatorContext context) {
        if (!area.isGiven()) {
            return true;
        }
        if (!area.isComplete()) {
            return reject(context, firstMissingEdge(area), INCOMPLETE_MESSAGE);
        }
        if (area.maxLatitude() < area.minLatitude()) {
            return reject(context, "maxLatitude", LATITUDES_SWAPPED_MESSAGE);
        }
        if (area.maxLongitude() < area.minLongitude()) {
            return reject(context, "maxLongitude", LONGITUDES_SWAPPED_MESSAGE);
        }
        return true;
    }

    private static String firstMissingEdge(MapArea area) {
        if (area.minLatitude() == null) {
            return "minLatitude";
        }
        if (area.maxLatitude() == null) {
            return "maxLatitude";
        }
        return area.minLongitude() == null ? "minLongitude" : "maxLongitude";
    }

    private static boolean reject(ConstraintValidatorContext context, String field, String message) {
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(message)
                .addPropertyNode(field)
                .addConstraintViolation();
        return false;
    }
}
