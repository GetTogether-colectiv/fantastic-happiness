package com.gettogether.events.internal;

import com.gettogether.participation.ParticipationStatus;

record ParticipationResponse(ParticipationStatus status, int goingCount, Integer capacity) {
}
