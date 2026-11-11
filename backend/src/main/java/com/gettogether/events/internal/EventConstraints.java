package com.gettogether.events.internal;

final class EventConstraints {

    static final int TITLE_MAX_LENGTH = 150;
    static final int CITY_MAX_LENGTH = 100;
    static final int LOCATION_NAME_MAX_LENGTH = 200;
    static final int IMAGE_URL_MAX_LENGTH = 500;
    static final String LATITUDE_MIN = "-90";
    static final String LATITUDE_MAX = "90";
    static final String LONGITUDE_MIN = "-180";
    static final String LONGITUDE_MAX = "180";

    private EventConstraints() {
    }
}