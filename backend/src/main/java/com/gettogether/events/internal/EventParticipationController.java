package com.gettogether.events.internal;

import com.gettogether.users.CurrentUserProvider;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/events/{id}/participation")
class EventParticipationController {

    private final EventParticipationService participationService;
    private final CurrentUserProvider currentUserProvider;

    EventParticipationController(EventParticipationService participationService, CurrentUserProvider currentUserProvider) {
        this.participationService = participationService;
        this.currentUserProvider = currentUserProvider;
    }

    @PutMapping
    ParticipationResponse setStatus(@PathVariable Long id, @Valid @RequestBody ParticipationRequest request) {
        return participationService.setStatus(currentUserProvider.currentUserId(), id, request.status());
    }

    @GetMapping
    ParticipationResponse findStatus(@PathVariable Long id) {
        return participationService.findStatus(currentUserProvider.currentUserId(), id);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void remove(@PathVariable Long id) {
        participationService.remove(currentUserProvider.currentUserId(), id);
    }
}
