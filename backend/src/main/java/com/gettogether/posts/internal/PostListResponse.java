package com.gettogether.posts.internal;

import java.math.BigDecimal;
import java.util.List;

record PostListResponse(
        BigDecimal averageRating,
        long count,
        List<PostDto> posts) {
}
