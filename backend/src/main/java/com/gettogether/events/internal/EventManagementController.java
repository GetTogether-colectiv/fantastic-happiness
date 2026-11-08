package com.gettogether.events.internal;

import com.gettogether.events.EventDetails;
import com.gettogether.users.CurrentUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/events")
class EventManagementController {

    private final EventManagementService managementService;
    private final CurrentUserProvider currentUserProvider;

    EventManagementController(EventManagementService managementService, CurrentUserProvider currentUserProvider) {
        this.managementService = managementService;
        this.currentUserProvider = currentUserProvider;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create an event organized by the current user")
    EventDetails create(@Valid @RequestBody CreateEventRequest request) {
        return managementService.create(currentUserProvider.currentUserId(), request);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Edit an event. Only its organizer can do it")
    EventDetails update(@PathVariable Long id, @Valid @RequestBody CreateEventRequest request) {
        return managementService.update(id, currentUserProvider.currentUserId(), request);
    }
}