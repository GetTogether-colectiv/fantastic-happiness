package com.gettogether.events.internal;

import com.gettogether.participation.ParticipationStatus;
import jakarta.validation.constraints.NotNull;

record ParticipationRequest(@NotNull ParticipationStatus status) {
}
