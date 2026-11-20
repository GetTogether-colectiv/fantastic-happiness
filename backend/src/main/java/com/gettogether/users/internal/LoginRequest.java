package com.gettogether.users.internal;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

record LoginRequest(
        @NotBlank @Email @Size(max = EmailAddress.MAX_LENGTH) String email,
        @NotBlank String password) {

    LoginRequest {
        email = EmailAddress.normalize(email);
    }
}
