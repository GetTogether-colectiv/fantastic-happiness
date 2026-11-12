package com.gettogether.events;

import com.gettogether.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.lessThanOrEqualTo;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class EventsTests {

    private static final long UNKNOWN_EVENT_ID = 999_999L;
    private static final int OVERSIZED_PAGE = 500;
    private static final int MAX_PAGE_SIZE = 200;
    private static final String FORM_SPACE = "Form Space";
    private static final String[] AROUND_FORM_SPACE = {"46.7737", "46.7747", "23.5783", "23.5793"};
    private static final String[] IN_THE_OCEAN = {"0", "1", "0", "1"};

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
    void filtersByMapArea() throws Exception {
        mockMvc.perform(inArea(AROUND_FORM_SPACE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", not(empty())))
                .andExpect(jsonPath("$.content[*].locationName", everyItem(is(FORM_SPACE))));
    }

    @Test
    void combinesTheMapAreaWithACategory() throws Exception {
        mockMvc.perform(inArea(AROUND_FORM_SPACE).param("category", "TECH"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", not(empty())))
                .andExpect(jsonPath("$.content[*].category", everyItem(is("TECH"))))
                .andExpect(jsonPath("$.content[*].locationName", everyItem(is(FORM_SPACE))));
    }

    @Test
    void returnsNothingForAnAreaWithoutEvents() throws Exception {
        mockMvc.perform(inArea(IN_THE_OCEAN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)))
                .andExpect(jsonPath("$.last").value(true));
    }

    @Test
    void rejectsAnIncompleteMapArea() throws Exception {
        mockMvc.perform(get("/events").param("minLatitude", "46.76").param("maxLatitude", "46.78"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.minLongitude").value("Give all four edges of the area, or none"));
    }

    @Test
    void rejectsAMapAreaWithSwappedEdges() throws Exception {
        mockMvc.perform(inArea("46.78", "46.76", "23.57", "23.59"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.maxLatitude").value("maxLatitude must not be below minLatitude"));
        mockMvc.perform(inArea("46.76", "46.78", "23.59", "23.57"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.maxLongitude").value("maxLongitude must not be below minLongitude"));
    }

    @Test
    void rejectsAMapAreaOutOfRange() throws Exception {
        mockMvc.perform(inArea("46.76", "91", "23.57", "23.59"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.maxLatitude").value("Latitude must be between -90 and 90"));
        mockMvc.perform(inArea("46.76", "46.78", "23.57", "181"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.maxLongitude").value("Longitude must be between -180 and 180"));
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

    private static MockHttpServletRequestBuilder inArea(String... edges) {
        return get("/events")
                .param("minLatitude", edges[0])
                .param("maxLatitude", edges[1])
                .param("minLongitude", edges[2])
                .param("maxLongitude", edges[3]);
    }
}
