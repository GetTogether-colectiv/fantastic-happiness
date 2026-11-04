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
SET image_url = CASE title
    WHEN 'Indie Night at Form Space' THEN 'https://images.pexels.com/photos/7715766/pexels-photo-7715766.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Symphonic Evening' THEN 'https://images.pexels.com/photos/35061324/pexels-photo-35061324.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Rock Under the Stars' THEN 'https://images.pexels.com/photos/15551843/pexels-photo-15551843.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Jazz in the Park' THEN 'https://images.pexels.com/photos/9002003/pexels-photo-9002003.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Acoustic Sessions' THEN 'https://images.pexels.com/photos/3914682/pexels-photo-3914682.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Morning Run in the Park' THEN 'https://images.pexels.com/photos/7348514/pexels-photo-7348514.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'CFR Cluj Home Match' THEN 'https://images.pexels.com/photos/31363728/pexels-photo-31363728.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Basketball Friendly' THEN 'https://images.pexels.com/photos/11831850/pexels-photo-11831850.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Sunday Cycling Tour' THEN 'https://images.pexels.com/photos/5807627/pexels-photo-5807627.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Street Football Tournament' THEN 'https://images.pexels.com/photos/28355092/pexels-photo-28355092.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Contemporary Art Opening' THEN 'https://images.pexels.com/photos/1604991/pexels-photo-1604991.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Street Art Walk' THEN 'https://images.pexels.com/photos/1853064/pexels-photo-1853064.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Photography Exhibition: Old Cluj' THEN 'https://images.pexels.com/photos/11489978/pexels-photo-11489978.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Ceramics Workshop' THEN 'https://images.pexels.com/photos/6693569/pexels-photo-6693569.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Sculpture Night' THEN 'https://images.pexels.com/photos/17203903/pexels-photo-17203903.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Transylvanian Food Festival' THEN 'https://images.pexels.com/photos/27668702/pexels-photo-27668702.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Wine in the Garden' THEN 'https://images.pexels.com/photos/29160034/pexels-photo-29160034.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Street Food Weekend' THEN 'https://images.pexels.com/photos/38015187/pexels-photo-38015187.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Pastry Masterclass' THEN 'https://images.pexels.com/photos/6287297/pexels-photo-6287297.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Cluj JS Meetup' THEN 'https://images.pexels.com/photos/34774349/pexels-photo-34774349.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'AI in Healthcare Conference' THEN 'https://images.pexels.com/photos/38786013/pexels-photo-38786013.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Hackathon Weekend' THEN 'https://images.pexels.com/photos/34774358/pexels-photo-34774358.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Startup Pitch Night' THEN 'https://images.pexels.com/photos/7413915/pexels-photo-7413915.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Cloud Native Workshop' THEN 'https://images.pexels.com/photos/4078342/pexels-photo-4078342.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Electronic Friday' THEN 'https://images.pexels.com/photos/7715628/pexels-photo-7715628.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Karaoke Night' THEN 'https://images.pexels.com/photos/4130659/pexels-photo-4130659.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Silent Disco in the Square' THEN 'https://images.pexels.com/photos/2240768/pexels-photo-2240768.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Student Party' THEN 'https://images.pexels.com/photos/9581008/pexels-photo-9581008.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Cetatuia Sunset Hike' THEN 'https://images.pexels.com/photos/38891479/pexels-photo-38891479.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Hoia Baciu Forest Walk' THEN 'https://images.pexels.com/photos/7624991/pexels-photo-7624991.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Botanical Garden Picnic' THEN 'https://images.pexels.com/photos/8121995/pexels-photo-8121995.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Sunrise Yoga by the Lake' THEN 'https://images.pexels.com/photos/9154500/pexels-photo-9154500.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Public Speaking Workshop' THEN 'https://images.pexels.com/photos/18999485/pexels-photo-18999485.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'History of Cluj Lecture' THEN 'https://images.pexels.com/photos/33990550/pexels-photo-33990550.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Language Exchange Night' THEN 'https://images.pexels.com/photos/7972533/pexels-photo-7972533.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Study Skills Seminar' THEN 'https://images.pexels.com/photos/16420458/pexels-photo-16420458.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Board Games Night' THEN 'https://images.pexels.com/photos/8111356/pexels-photo-8111356.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Charity Flea Market' THEN 'https://images.pexels.com/photos/15101871/pexels-photo-15101871.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Book Swap' THEN 'https://images.pexels.com/photos/22738054/pexels-photo-22738054.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    WHEN 'Pet Adoption Day' THEN 'https://images.pexels.com/photos/16465622/pexels-photo-16465622.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=800&h=450'
    ELSE image_url
END;
