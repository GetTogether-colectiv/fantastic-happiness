package com.gettogether.events.internal;

import com.gettogether.events.EventSummary;
import com.gettogether.events.EventsApi;
import com.gettogether.participation.ParticipationApi;
import com.gettogether.participation.ParticipationStatus;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SwipeFeedServiceTests {

    private static final long USER_ID = 1L;
    private static final long FIRST_EVENT = 11L;
    private static final long SECOND_EVENT = 12L;
    private static final int SIZE = 3;

    private final EventsApi eventsApi = mock(EventsApi.class);
    private final ParticipationApi participationApi = mock(ParticipationApi.class);
    private final SwipeFeedService service = new SwipeFeedService(eventsApi, participationApi);

    @Test
    void combinesBothStatusesAndDelegatesOrderingAndLimitingToEvents() {
        when(participationApi.listEventsFor(USER_ID, ParticipationStatus.GOING)).thenReturn(List.of(FIRST_EVENT));
        when(participationApi.listEventsFor(USER_ID, ParticipationStatus.NOT_INTERESTED))
                .thenReturn(List.of(SECOND_EVENT));
        List<EventSummary> result = List.of(mock(EventSummary.class));
        when(eventsApi.findUpcoming(Set.of(FIRST_EVENT, SECOND_EVENT), SIZE)).thenReturn(result);

        assertThat(service.findFeed(USER_ID, SIZE)).isSameAs(result);
        verify(eventsApi).findUpcoming(Set.of(FIRST_EVENT, SECOND_EVENT), SIZE);
    }

    @Test
    void supportsAUserWithoutRecordedDecisionsAndAnEmptyFeed() {
        when(participationApi.listEventsFor(USER_ID, ParticipationStatus.GOING)).thenReturn(List.of());
        when(participationApi.listEventsFor(USER_ID, ParticipationStatus.NOT_INTERESTED)).thenReturn(List.of());
        when(eventsApi.findUpcoming(Set.of(), SIZE)).thenReturn(List.of());

        assertThat(service.findFeed(USER_ID, SIZE)).isEmpty();
        verify(eventsApi).findUpcoming(Set.of(), SIZE);
    }
}
