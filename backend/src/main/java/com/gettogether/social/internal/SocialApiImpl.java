package com.gettogether.social.internal;

import com.gettogether.social.SocialApi;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
class SocialApiImpl implements SocialApi {

    private final FriendshipRepository friendshipRepository;

    SocialApiImpl(FriendshipRepository friendshipRepository) {
        this.friendshipRepository = friendshipRepository;
    }

    @Override
    public List<Long> friendIds(Long userId) {
        return friendshipRepository.findOtherUserIds(userId, FriendshipStatus.ACCEPTED);
    }
}
