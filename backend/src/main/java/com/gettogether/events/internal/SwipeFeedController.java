package com.gettogether.events.internal;

import com.gettogether.events.EventSummary;
import com.gettogether.users.CurrentUserProvider;
import jakarta.validation.constraints.Min;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/participation/feed")
class SwipeFeedController {

    private static final int DEFAULT_FEED_SIZE = 10;

    private final SwipeFeedService swipeFeedService;
    private final CurrentUserProvider currentUserProvider;

    SwipeFeedController(SwipeFeedService swipeFeedService, CurrentUserProvider currentUserProvider) {
        this.swipeFeedService = swipeFeedService;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping
    List<EventSummary> findFeed(@RequestParam(defaultValue = "" + DEFAULT_FEED_SIZE) @Min(1) int size) {
        return swipeFeedService.findFeed(currentUserProvider.currentUserId(), size);
    }
}
