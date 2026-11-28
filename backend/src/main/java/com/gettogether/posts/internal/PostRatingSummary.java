package com.gettogether.posts.internal;

import java.math.BigDecimal;

interface PostRatingSummary {

    BigDecimal getAverageRating();

    long getCount();
}
