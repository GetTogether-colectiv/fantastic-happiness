package com.gettogether.users.internal;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

record RegisterRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Email @Size(max = EmailAddress.MAX_LENGTH) String email,
        @NotBlank @Pattern(regexp = "(?s)(?!.*\\p{Cs})(?=.*\\p{Lu})(?=.*\\p{Ll})(?=.*\\p{Nd})(?=.*[\\p{P}\\p{S}]).{8,}",
                message = "Use at least 8 characters, including an uppercase letter, a lowercase letter, a digit, and a special character.")
        String password) {

    RegisterRequest {
        if (name != null) {
            name = name.strip();
        }
        email = EmailAddress.normalize(email);
    }
}
