package com.gettogether.events.internal;

import com.gettogether.events.EventDetails;
import com.gettogether.events.EventSummary;
import com.gettogether.events.EventsApi;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Service
class EventsApiImpl implements EventsApi {

    private final EventRepository eventRepository;

    EventsApiImpl(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @Override
    public Optional<EventDetails> findById(Long id) {
        return eventRepository.findById(id).map(EventMapper::toDetails);
    }

    @Override
    public List<EventSummary> findByIds(Collection<Long> ids) {
        return eventRepository.findAllById(ids).stream().map(EventMapper::toSummary).toList();
    }

    @Override
    public boolean exists(Long id) {
        return eventRepository.existsById(id);
    }
}
