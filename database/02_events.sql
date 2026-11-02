-- Dates are relative to the moment the database is created, so upcoming events stay upcoming
-- and past events stay past. The session runs in the Cluj-Napoca time zone, so "19 hours" is 19:00 local time.
SET timezone = 'Europe/Bucharest';

CREATE TABLE events (
    id            BIGSERIAL PRIMARY KEY,
    title         VARCHAR(150)     NOT NULL,
    description   TEXT,
    category      VARCHAR(20)      NOT NULL CHECK (category IN
                      ('MUSIC', 'SPORTS', 'ART', 'FOOD', 'TECH', 'NIGHTLIFE', 'OUTDOORS', 'EDUCATION', 'OTHER')),
    starts_at     TIMESTAMPTZ      NOT NULL,
    ends_at       TIMESTAMPTZ      NOT NULL,
    city          VARCHAR(100)     NOT NULL,
    location_name VARCHAR(200)     NOT NULL,
    latitude      DOUBLE PRECISION,
    longitude     DOUBLE PRECISION,
    image_url     VARCHAR(500),
    capacity      INT CHECK (capacity > 0),
    organizer_id  BIGINT           NOT NULL,
    created_at    TIMESTAMPTZ      NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at)
);

CREATE INDEX idx_events_starts_at ON events (starts_at);
CREATE INDEX idx_events_city_category ON events (city, category);

INSERT INTO events (title, description, category, starts_at, ends_at, city, location_name, latitude, longitude, capacity, organizer_id)
SELECT v.title,
       v.description,
       v.category,
       date_trunc('day', now()) + v.starts_in,
       date_trunc('day', now()) + v.starts_in + v.duration,
       'Cluj-Napoca',
       v.location_name,
       v.latitude,
       v.longitude,
       v.capacity,
       v.organizer_id
FROM (VALUES
    -- MUSIC
    ('Indie Night at Form Space', 'Three local indie bands on one stage, with a DJ set to close the night.', 'MUSIC', INTERVAL '3 days 20 hours', INTERVAL '4 hours', 'Form Space', 46.7742, 23.5788, 400, 1),
    ('Symphonic Evening', 'The Cluj Philharmonic plays a program of Romanian and Viennese classics.', 'MUSIC', INTERVAL '10 days 19 hours', INTERVAL '2 hours', 'Opera Nationala', 46.7697, 23.5937, 700, 2),
    ('Rock Under the Stars', 'An open-air style rock concert with two headliners and a local opening act.', 'MUSIC', INTERVAL '21 days 20 hours', INTERVAL '5 hours', 'BT Arena', 46.7656, 23.5700, 5000, 3),
    ('Jazz in the Park', 'A relaxed jazz afternoon on the lawn. Bring a blanket.', 'MUSIC', INTERVAL '6 days 18 hours', INTERVAL '3 hours', 'Parcul Central', 46.7664, 23.5827, 300, 4),
    ('Acoustic Sessions', 'Intimate acoustic sets from singer-songwriters.', 'MUSIC', INTERVAL '-8 days 19 hours', INTERVAL '3 hours', 'Casa Tranzit', 46.7730, 23.5846, 80, 5),
    -- SPORTS
    ('Morning Run in the Park', 'A friendly 5 km group run, all paces welcome.', 'SPORTS', INTERVAL '2 days 8 hours', INTERVAL '2 hours', 'Parcul Central', 46.7664, 23.5827, 100, 6),
    ('CFR Cluj Home Match', 'League match at Cluj Arena. Come and support the home team.', 'SPORTS', INTERVAL '14 days 19 hours', INTERVAL '2 hours', 'Cluj Arena', 46.7687, 23.5720, 30000, 7),
    ('Basketball Friendly', 'Charity basketball game between local companies.', 'SPORTS', INTERVAL '9 days 18 hours', INTERVAL '3 hours', 'BT Arena', 46.7656, 23.5700, 2000, 8),
    ('Sunday Cycling Tour', 'A 30 km easy ride around the lakes of Cluj.', 'SPORTS', INTERVAL '-5 days 9 hours', INTERVAL '4 hours', 'Lacul Gheorgheni', 46.7595, 23.6069, 60, 9),
    ('Street Football Tournament', 'Five-a-side tournament with teams from all neighbourhoods.', 'SPORTS', INTERVAL '-15 days 14 hours', INTERVAL '6 hours', 'Cluj Arena', 46.7687, 23.5720, 200, 10),
    -- ART
    ('Contemporary Art Opening', 'Opening night of a new exhibition of young Transylvanian artists.', 'ART', INTERVAL '4 days 18 hours', INTERVAL '3 hours', 'Muzeul de Arta', 46.7695, 23.5897, 250, 11),
    ('Street Art Walk', 'Guided walk through the best murals of the city centre.', 'ART', INTERVAL '7 days 16 hours', INTERVAL '2 hours', 'Piata Unirii', 46.7693, 23.5899, 40, 12),
    ('Photography Exhibition: Old Cluj', 'Archive photographs of Cluj from the last century.', 'ART', INTERVAL '12 days 17 hours', INTERVAL '3 hours', 'Casa Tranzit', 46.7730, 23.5846, 120, 13),
    ('Ceramics Workshop', 'Learn the basics of the potter''s wheel and take your piece home.', 'ART', INTERVAL '-20 days 17 hours', INTERVAL '3 hours', 'Casa Tranzit', 46.7730, 23.5846, 15, 14),
    ('Sculpture Night', 'A late evening at the museum with live sculpting demos.', 'ART', INTERVAL '-3 days 19 hours', INTERVAL '3 hours', 'Muzeul de Arta', 46.7695, 23.5897, 150, 1),
    -- FOOD
    ('Transylvanian Food Festival', 'Traditional dishes, local producers and live cooking shows.', 'FOOD', INTERVAL '5 days 12 hours', INTERVAL '8 hours', 'Piata Unirii', 46.7693, 23.5899, 2000, 2),
    ('Wine in the Garden', 'A guided tasting of Transylvanian wines among the plants.', 'FOOD', INTERVAL '8 days 19 hours', INTERVAL '3 hours', 'Gradina Botanica', 46.7600, 23.5864, 80, 3),
    ('Street Food Weekend', 'Food trucks from all over the country in the middle of the park.', 'FOOD', INTERVAL '-10 days 12 hours', INTERVAL '9 hours', 'Parcul Central', 46.7664, 23.5827, 1500, 4),
    ('Pastry Masterclass', 'Bake three classic pastries with a professional chef.', 'FOOD', INTERVAL '15 days 17 hours', INTERVAL '3 hours', 'Casa Tranzit', 46.7730, 23.5846, 20, 5),
    -- TECH
    ('Cluj JS Meetup', 'Two talks about modern frontend and plenty of time to talk to other developers.', 'TECH', INTERVAL '3 days 18 hours', INTERVAL '3 hours', 'Form Space', 46.7742, 23.5788, 150, 6),
    ('AI in Healthcare Conference', 'Researchers and startups show what machine learning does in hospitals.', 'TECH', INTERVAL '16 days 9 hours', INTERVAL '9 hours', 'Universitatea Babes-Bolyai', 46.7677, 23.5912, 500, 7),
    ('Hackathon Weekend', 'Build a prototype in 30 hours. Teams of up to four.', 'TECH', INTERVAL '11 days 10 hours', INTERVAL '30 hours', 'Form Space', 46.7742, 23.5788, 120, 8),
    ('Startup Pitch Night', 'Ten early-stage startups pitch in front of local investors.', 'TECH', INTERVAL '-6 days 18 hours', INTERVAL '3 hours', 'Form Space', 46.7742, 23.5788, 200, 9),
    ('Cloud Native Workshop', 'Hands-on workshop: containers, Kubernetes and CI pipelines.', 'TECH', INTERVAL '-12 days 10 hours', INTERVAL '6 hours', 'Universitatea Babes-Bolyai', 46.7677, 23.5912, 60, 10),
    -- NIGHTLIFE
    ('Electronic Friday', 'House and techno until the morning, with two guest DJs.', 'NIGHTLIFE', INTERVAL '4 days 23 hours', INTERVAL '6 hours', 'Form Space', 46.7742, 23.5788, 600, 11),
    ('Karaoke Night', 'Pick a song and take the stage. Prizes for the best performance.', 'NIGHTLIFE', INTERVAL '2 days 21 hours', INTERVAL '4 hours', 'Flying Circus Pub', 46.7706, 23.5896, 120, 12),
    ('Silent Disco in the Square', 'Three channels, three DJs, headphones included.', 'NIGHTLIFE', INTERVAL '18 days 21 hours', INTERVAL '4 hours', 'Piata Unirii', 46.7693, 23.5899, 500, 13),
    ('Student Party', 'The biggest student party of the semester.', 'NIGHTLIFE', INTERVAL '-9 days 22 hours', INTERVAL '5 hours', 'Flying Circus Pub', 46.7706, 23.5896, 300, 14),
    -- OUTDOORS
    ('Cetatuia Sunset Hike', 'Easy hike to the Citadel Hill for the sunset over the city.', 'OUTDOORS', INTERVAL '3 days 17 hours', INTERVAL '3 hours', 'Cetatuia', 46.7747, 23.5946, 50, 1),
    ('Hoia Baciu Forest Walk', 'A guided walk through the legendary forest and its stories.', 'OUTDOORS', INTERVAL '15 days 10 hours', INTERVAL '4 hours', 'Padurea Hoia-Baciu', 46.7770, 23.5210, 30, 2),
    ('Botanical Garden Picnic', 'Bring food and games, the garden provides the rest.', 'OUTDOORS', INTERVAL '6 days 12 hours', INTERVAL '4 hours', 'Gradina Botanica', 46.7600, 23.5864, 100, 3),
    ('Sunrise Yoga by the Lake', 'A calm outdoor yoga class for all levels.', 'OUTDOORS', INTERVAL '-4 days 8 hours', INTERVAL '90 minutes', 'Lacul Gheorgheni', 46.7595, 23.6069, 40, 4),
    -- EDUCATION
    ('Public Speaking Workshop', 'Practical exercises to speak with confidence in front of any audience.', 'EDUCATION', INTERVAL '5 days 17 hours', INTERVAL '3 hours', 'Universitatea Babes-Bolyai', 46.7677, 23.5912, 40, 5),
    ('History of Cluj Lecture', 'From Napoca to the modern city: a lecture with rare maps.', 'EDUCATION', INTERVAL '9 days 18 hours', INTERVAL '2 hours', 'Casa Tranzit', 46.7730, 23.5846, 90, 6),
    ('Language Exchange Night', 'Practice English, Romanian, Hungarian or German with native speakers.', 'EDUCATION', INTERVAL '7 days 19 hours', INTERVAL '3 hours', 'Flying Circus Pub', 46.7706, 23.5896, 80, 7),
    ('Study Skills Seminar', 'How to plan your exams and remember more with less stress.', 'EDUCATION', INTERVAL '-14 days 16 hours', INTERVAL '2 hours', 'Universitatea Babes-Bolyai', 46.7677, 23.5912, 100, 8),
    -- OTHER
    ('Board Games Night', 'Dozens of board games and people to play them with.', 'OTHER', INTERVAL '2 days 19 hours', INTERVAL '4 hours', 'Casa Tranzit', 46.7730, 23.5846, 60, 9),
    ('Charity Flea Market', 'Second-hand books, clothes and crafts. All profit goes to local charities.', 'OTHER', INTERVAL '12 days 11 hours', INTERVAL '6 hours', 'Piata Unirii', 46.7693, 23.5899, 800, 10),
    ('Book Swap', 'Bring a book, take a book.', 'OTHER', INTERVAL '-7 days 15 hours', INTERVAL '3 hours', 'Parcul Central', 46.7664, 23.5827, 150, 11),
    ('Pet Adoption Day', 'Meet dogs and cats from local shelters looking for a home.', 'OTHER', INTERVAL '19 days 11 hours', INTERVAL '5 hours', 'Parcul Central', 46.7664, 23.5827, 300, 12)
) AS v(title, description, category, starts_in, duration, location_name, latitude, longitude, capacity, organizer_id);

UPDATE events
SET image_url = 'https://loremflickr.com/800/450/' ||
                CASE category
                    WHEN 'MUSIC' THEN 'concert'
                    WHEN 'SPORTS' THEN 'sport'
                    WHEN 'ART' THEN 'gallery'
                    WHEN 'FOOD' THEN 'food'
                    WHEN 'TECH' THEN 'technology'
                    WHEN 'NIGHTLIFE' THEN 'nightclub'
                    WHEN 'OUTDOORS' THEN 'hiking'
                    WHEN 'EDUCATION' THEN 'classroom'
                    ELSE 'festival'
                END || '?lock=' || id;
