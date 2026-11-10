package com.gettogether.users.internal;

import com.gettogether.shared.EventCategory;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String displayName;

    private String email;

    private String avatarUrl;

    private String city;

    private Instant createdAt;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "user_preferred_categories", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "category", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private Set<EventCategory> preferredCategories = new HashSet<>();

    protected User() {
    }

    public Long getId() {
        return id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getEmail() {
        return email;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public String getCity() {
        return city;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Set<EventCategory> getPreferredCategories() {
        return Set.copyOf(preferredCategories);
    }

    void updateProfile(String displayName, String city, String avatarUrl) {
        this.displayName = displayName;
        this.city = city;
        this.avatarUrl = avatarUrl;
    }

    void replacePreferredCategories(Set<EventCategory> categories) {
        preferredCategories.clear();
        preferredCategories.addAll(categories);
    }
}