package com.gettogether.events.internal;

import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

@ValidMapArea
public record MapArea(
        @Parameter(description = "Southern edge of the area. Give all four edges, or none")
        @DecimalMin(value = EventConstraints.LATITUDE_MIN, message = "Latitude must be between -90 and 90")
        @DecimalMax(value = EventConstraints.LATITUDE_MAX, message = "Latitude must be between -90 and 90")
        Double minLatitude,
        @Parameter(description = "Northern edge of the area")
        @DecimalMin(value = EventConstraints.LATITUDE_MIN, message = "Latitude must be between -90 and 90")
        @DecimalMax(value = EventConstraints.LATITUDE_MAX, message = "Latitude must be between -90 and 90")
        Double maxLatitude,
        @Parameter(description = "Western edge of the area")
        @DecimalMin(value = EventConstraints.LONGITUDE_MIN, message = "Longitude must be between -180 and 180")
        @DecimalMax(value = EventConstraints.LONGITUDE_MAX, message = "Longitude must be between -180 and 180")
        Double minLongitude,
        @Parameter(description = "Eastern edge of the area")
        @DecimalMin(value = EventConstraints.LONGITUDE_MIN, message = "Longitude must be between -180 and 180")
        @DecimalMax(value = EventConstraints.LONGITUDE_MAX, message = "Longitude must be between -180 and 180")
        Double maxLongitude) {

    boolean isGiven() {
        return minLatitude != null || maxLatitude != null || minLongitude != null || maxLongitude != null;
    }

    boolean isComplete() {
        return minLatitude != null && maxLatitude != null && minLongitude != null && maxLongitude != null;
    }
}
