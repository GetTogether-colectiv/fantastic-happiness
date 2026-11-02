package com.gettogether.events;

import com.gettogether.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.lessThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class EventsTests {

    private static final long UNKNOWN_EVENT_ID = 999_999L;
    private static final int OVERSIZED_PAGE = 500;
    private static final int MAX_PAGE_SIZE = 50;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EventsApi eventsApi;

    @Test
    void returnsTheFirstPageOrderedByStartTime() throws Exception {
        mockMvc.perform(get("/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(10)))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.last").value(false))
                .andExpect(jsonPath("$.content[0].startsAt").isNotEmpty());
    }

    @Test
    void combinesFilters() throws Exception {
        mockMvc.perform(get("/events").param("category", "TECH").param("city", "cluj-napoca"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].category", everyItem(is("TECH"))))
                .andExpect(jsonPath("$.content[*].city", everyItem(is("Cluj-Napoca"))));
    }

    @Test
    void filtersByStartTime() throws Exception {
        mockMvc.perform(get("/events").param("from", "2999-01-01T00:00:00Z"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)))
                .andExpect(jsonPath("$.last").value(true));
    }

    @Test
    void capsThePageSize() throws Exception {
        mockMvc.perform(get("/events").param("size", String.valueOf(OVERSIZED_PAGE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()", lessThanOrEqualTo(MAX_PAGE_SIZE)));
    }

    @Test
    void returnsEventDetails() throws Exception {
        mockMvc.perform(get("/events/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").isNotEmpty())
                .andExpect(jsonPath("$.organizerId").isNotEmpty());
    }

    @Test
    void returnsNotFoundForUnknownEvent() throws Exception {
        mockMvc.perform(get("/events/{id}", UNKNOWN_EVENT_ID))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void exposesEventsThroughEventsApi() {
        assertThat(eventsApi.exists(1L)).isTrue();
        assertThat(eventsApi.exists(UNKNOWN_EVENT_ID)).isFalse();
        assertThat(eventsApi.findById(1L)).isPresent();
        assertThat(eventsApi.findByIds(List.of(1L, 2L))).hasSize(2);
    }
}
