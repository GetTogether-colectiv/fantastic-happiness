package com.gettogether.events;

public record EventCreated(Long eventId, String category, Long organizerId) {
}