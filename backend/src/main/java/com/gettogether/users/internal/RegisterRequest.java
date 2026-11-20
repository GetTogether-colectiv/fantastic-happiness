package com.gettogether.users.internal;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

record RegisterRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Email @Size(max = EmailAddress.MAX_LENGTH) String email,
        @NotBlank @Pattern(regexp = "(?s)(?!.*[\\x{D800}-\\x{DFFF}])(?=.*[A-Z])(?=.*[a-z])"
                + "(?=.*[0-9])(?=.*[!-/:-@\\x5B-\\x60{-~]).{8,}",
                message = "Use at least 8 characters, including A–Z, a–z, 0–9, and an ASCII symbol such as !, @, or #.")
        String password) {

    RegisterRequest {
        if (name != null) {
            name = name.strip();
        }
        email = EmailAddress.normalize(email);
    }
}
