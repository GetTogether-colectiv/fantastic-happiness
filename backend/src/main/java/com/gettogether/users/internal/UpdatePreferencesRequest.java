package com.gettogether.users.internal;

import com.gettogether.shared.EventCategory;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.Set;

record UpdatePreferencesRequest(@NotEmpty Set<@NotNull EventCategory> categories) {
}