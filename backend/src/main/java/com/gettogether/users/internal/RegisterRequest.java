package com.gettogether.users.internal;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

record RegisterRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Email @Size(max = EmailAddress.MAX_LENGTH) String email,
        @NotBlank @Pattern(regexp = "(?s)(?=.*[0-9]).{8,}",
                message = "Password must contain at least 8 characters and one digit") String password) {

    RegisterRequest {
        if (name != null) {
            name = name.strip();
        }
        email = EmailAddress.normalize(email);
    }
}
