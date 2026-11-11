package com.gettogether.users.internal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

record UpdateProfileRequest(
        @NotBlank @Size(max = 100) String displayName,
        @Size(max = 100) String city,
        @Size(max = 500) @Pattern(regexp = "^https?://\\S+$") String avatarUrl) {
}