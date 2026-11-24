package com.gettogether.social;

import java.util.List;

public interface SocialApi {

    /**
     * IDs of the users with an accepted friendship with the given user. Pending requests are not included.
     */
    List<Long> friendIds(Long userId);
}
