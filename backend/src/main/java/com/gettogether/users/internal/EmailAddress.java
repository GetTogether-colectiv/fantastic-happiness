package com.gettogether.users.internal;

import java.util.Locale;

final class EmailAddress {

    static final int MAX_LENGTH = 255;

    private EmailAddress() {
    }

    static String normalize(String email) {
        return email == null ? null : email.strip().toLowerCase(Locale.ROOT);
    }
}
