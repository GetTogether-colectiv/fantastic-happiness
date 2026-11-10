package com.gettogether.events.internal;

import com.gettogether.shared.EventCategory;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "events")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    private String description;

    @Enumerated(EnumType.STRING)
    private EventCategory category;

    private Instant startsAt;

    private Instant endsAt;

    private String city;

    private String locationName;

    private Double latitude;

    private Double longitude;

    private String imageUrl;

    private Integer capacity;

    private Long organizerId;

    private Instant createdAt;

    protected Event() {
    }

    Event(Long organizerId, CreateEventRequest request) {
        this.organizerId = organizerId;
        this.createdAt = Instant.now();
        apply(request);
    }

    void update(CreateEventRequest request) {
        apply(request);
    }

    private void apply(CreateEventRequest request) {
        this.title = request.title();
        this.description = request.description();
        this.category = request.category();
        this.startsAt = request.startsAt();
        this.endsAt = request.endsAt();
        this.city = request.city();
        this.locationName = request.locationName();
        this.imageUrl = request.imageUrl();
        this.capacity = request.capacity();
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public EventCategory getCategory() {
        return category;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public String getCity() {
        return city;
    }

    public String getLocationName() {
        return locationName;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public Long getOrganizerId() {
        return organizerId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}