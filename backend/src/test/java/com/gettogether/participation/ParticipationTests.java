package com.gettogether.participation;

import com.gettogether.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@RecordApplicationEvents
@Transactional
class ParticipationTests {

    // Isolated IDs keep these persistence tests independent of the seeded participations.
    private static final long FIRST_USER = 999_991L;
    private static final long SECOND_USER = 999_992L;
    private static final long THIRD_USER = 999_993L;
    private static final long FIRST_EVENT = 999_991L;
    private static final long SECOND_EVENT = 999_992L;
    private static final long THIRD_EVENT = 999_993L;

    @Autowired
    private ParticipationApi participationApi;

    @Autowired
    private ApplicationEvents events;

    @Test
    void isGoingMatchesOnlyGoingParticipationForTheUserAndEvent() {
        assertThat(participationApi.isGoing(FIRST_USER, FIRST_EVENT)).isFalse();
        participationApi.setStatus(FIRST_USER, FIRST_EVENT, ParticipationStatus.NOT_INTERESTED);
        assertThat(participationApi.isGoing(FIRST_USER, FIRST_EVENT)).isFalse();
        participationApi.setStatus(FIRST_USER, FIRST_EVENT, ParticipationStatus.GOING);
        assertThat(participationApi.isGoing(FIRST_USER, FIRST_EVENT)).isTrue();
        assertThat(participationApi.isGoing(SECOND_USER, FIRST_EVENT)).isFalse();
        assertThat(participationApi.isGoing(FIRST_USER, SECOND_EVENT)).isFalse();
        participationApi.remove(FIRST_USER, FIRST_EVENT);
        assertThat(participationApi.isGoing(FIRST_USER, FIRST_EVENT)).isFalse();
    }

    @Test
    void listsOnlyGoingUsersForTheRequestedEvent() {
        participationApi.setStatus(FIRST_USER, FIRST_EVENT, ParticipationStatus.GOING);
        participationApi.setStatus(SECOND_USER, FIRST_EVENT, ParticipationStatus.GOING);
        participationApi.setStatus(THIRD_USER, FIRST_EVENT, ParticipationStatus.NOT_INTERESTED);
        participationApi.setStatus(THIRD_USER, SECOND_EVENT, ParticipationStatus.GOING);

        assertThat(participationApi.listGoingUserIds(FIRST_EVENT))
                .containsExactlyInAnyOrder(FIRST_USER, SECOND_USER);
        assertThat(participationApi.listGoingUserIds(THIRD_EVENT)).isEmpty();
    }

    @Test
    void listsOnlyTheUsersEventsWithTheRequestedStatus() {
        participationApi.setStatus(FIRST_USER, FIRST_EVENT, ParticipationStatus.GOING);
        participationApi.setStatus(FIRST_USER, SECOND_EVENT, ParticipationStatus.NOT_INTERESTED);
        participationApi.setStatus(SECOND_USER, THIRD_EVENT, ParticipationStatus.GOING);

        assertThat(participationApi.listEventsFor(FIRST_USER, ParticipationStatus.GOING)).containsExactly(FIRST_EVENT);
        assertThat(participationApi.listEventsFor(FIRST_USER, ParticipationStatus.NOT_INTERESTED))
                .containsExactly(SECOND_EVENT);
        assertThat(participationApi.listEventsFor(THIRD_USER, ParticipationStatus.GOING)).isEmpty();
    }

    @Test
    void publishesJoinedOnceForANewGoingParticipation() {
        participationApi.setStatus(FIRST_USER, FIRST_EVENT, ParticipationStatus.GOING);
        participationApi.setStatus(FIRST_USER, FIRST_EVENT, ParticipationStatus.GOING);

        assertThat(events.stream(EventJoined.class)).containsExactly(new EventJoined(FIRST_USER, FIRST_EVENT));
        assertThat(events.stream(EventLeft.class)).isEmpty();
    }

    @Test
    void publishesJoinedOnceWhenNotInterestedChangesToGoing() {
        participationApi.setStatus(FIRST_USER, FIRST_EVENT, ParticipationStatus.NOT_INTERESTED);
        events.clear();

        participationApi.setStatus(FIRST_USER, FIRST_EVENT, ParticipationStatus.GOING);
        participationApi.setStatus(FIRST_USER, FIRST_EVENT, ParticipationStatus.GOING);

        assertThat(events.stream(EventJoined.class)).containsExactly(new EventJoined(FIRST_USER, FIRST_EVENT));
        assertThat(events.stream(EventLeft.class)).isEmpty();
    }

    @Test
    void publishesLeftOnceWhenGoingChangesToNotInterested() {
        participationApi.setStatus(FIRST_USER, FIRST_EVENT, ParticipationStatus.GOING);
        events.clear();

        participationApi.setStatus(FIRST_USER, FIRST_EVENT, ParticipationStatus.NOT_INTERESTED);
        participationApi.setStatus(FIRST_USER, FIRST_EVENT, ParticipationStatus.NOT_INTERESTED);
        participationApi.remove(FIRST_USER, FIRST_EVENT);

        assertThat(events.stream(EventLeft.class)).containsExactly(new EventLeft(FIRST_USER, FIRST_EVENT));
        assertThat(events.stream(EventJoined.class)).isEmpty();
    }

    @Test
    void publishesLeftOnceWhenGoingIsDeleted() {
        participationApi.setStatus(FIRST_USER, FIRST_EVENT, ParticipationStatus.GOING);
        events.clear();

        participationApi.remove(FIRST_USER, FIRST_EVENT);
        participationApi.remove(FIRST_USER, FIRST_EVENT);

        assertThat(events.stream(EventLeft.class)).containsExactly(new EventLeft(FIRST_USER, FIRST_EVENT));
        assertThat(events.stream(EventJoined.class)).isEmpty();
    }

    @Test
    void publishesNothingForNotInterestedOrItsDeletion() {
        participationApi.setStatus(FIRST_USER, FIRST_EVENT, ParticipationStatus.NOT_INTERESTED);
        participationApi.setStatus(FIRST_USER, FIRST_EVENT, ParticipationStatus.NOT_INTERESTED);
        participationApi.remove(FIRST_USER, FIRST_EVENT);
        participationApi.remove(FIRST_USER, FIRST_EVENT);

        assertThat(events.stream(EventJoined.class)).isEmpty();
        assertThat(events.stream(EventLeft.class)).isEmpty();
    }

    @Test
    void publishesJoinedAgainAfterLeavingAndRejoining() {
        participationApi.setStatus(FIRST_USER, FIRST_EVENT, ParticipationStatus.GOING);
        participationApi.remove(FIRST_USER, FIRST_EVENT);
        participationApi.setStatus(FIRST_USER, FIRST_EVENT, ParticipationStatus.GOING);

        assertThat(events.stream(EventJoined.class)).containsExactly(
                new EventJoined(FIRST_USER, FIRST_EVENT), new EventJoined(FIRST_USER, FIRST_EVENT));
        assertThat(events.stream(EventLeft.class)).containsExactly(new EventLeft(FIRST_USER, FIRST_EVENT));
    }
}
