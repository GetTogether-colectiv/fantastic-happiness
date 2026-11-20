package com.gettogether.users.internal;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Locale;

record RegisterRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Pattern(regexp = "(?s)(?=.*[0-9]).{8,}",
                message = "Password must contain at least 8 characters and one digit") String password) {

    RegisterRequest {
        if (name != null) {
            name = name.strip();
        }
        if (email != null) {
            email = email.strip().toLowerCase(Locale.ROOT);
        }
    }
}
