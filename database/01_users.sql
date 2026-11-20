CREATE TABLE users
(
    id            BIGSERIAL PRIMARY KEY,
    display_name  VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    avatar_url    VARCHAR(500),
    city          VARCHAR(100),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE user_preferred_categories
(
    user_id  BIGINT REFERENCES users ON DELETE CASCADE,
    category VARCHAR(30) NOT NULL,
    PRIMARY KEY (user_id, category)
);

INSERT INTO users (display_name, email, avatar_url, city, password_hash)
VALUES ('Alexandra Pop', 'alexandra.pop@gettogether.test',
        'https://i.pravatar.cc/150?u=alexandra.joldea@gettogether.test', 'Cluj-Napoca',
        '$2y$10$8RwEChWvA32vO5ycMdKDD.otPCR1PZ0LejeGqsh/nwRArp3GZvan.'),
       ('Iulia Dragomir', 'iulia.dragomir@gettogether.test', 'https://i.pravatar.cc/150?u=iulia.jurja@gettogether.test',
        'Cluj-Napoca', '$2y$10$8RwEChWvA32vO5ycMdKDD.otPCR1PZ0LejeGqsh/nwRArp3GZvan.'),
       ('Alexandra Mihailovici', 'alexandra.mihailovici@gettogether.test',
        'https://i.pravatar.cc/150?u=alexandra.mariasiu@gettogether.test', 'Cluj-Napoca',
        '$2y$10$8RwEChWvA32vO5ycMdKDD.otPCR1PZ0LejeGqsh/nwRArp3GZvan.'),
       ('George Enescu', 'george.enescu@gettogether.test', 'https://i.pravatar.cc/150?u=stefan.trifan@gettogether.test',
        'Cluj-Napoca', '$2y$10$8RwEChWvA32vO5ycMdKDD.otPCR1PZ0LejeGqsh/nwRArp3GZvan.'),
       ('Diana Printesa', 'diana.printesa@gettogether.test', 'https://i.pravatar.cc/150?u=diana.reut@gettogether.test',
        'Cluj-Napoca', '$2y$10$8RwEChWvA32vO5ycMdKDD.otPCR1PZ0LejeGqsh/nwRArp3GZvan.'),
       ('David Pop', 'david.pop@gettogether.test', 'https://i.pravatar.cc/150?u=david.popescu@gettogether.test',
        'Cluj-Napoca', '$2y$10$8RwEChWvA32vO5ycMdKDD.otPCR1PZ0LejeGqsh/nwRArp3GZvan.'),
       ('Ion Creanga', 'ion.creanga@gettogether.test', 'https://i.pravatar.cc/150?u=denisa.sas@gettogether.test',
        'Cluj-Napoca', '$2y$10$8RwEChWvA32vO5ycMdKDD.otPCR1PZ0LejeGqsh/nwRArp3GZvan.'),
       ('Ion Barbu', 'ion.barbu@gettogether.test', 'https://i.pravatar.cc/150?u=mihai.ratiu@gettogether.test',
        'Cluj-Napoca', '$2y$10$8RwEChWvA32vO5ycMdKDD.otPCR1PZ0LejeGqsh/nwRArp3GZvan.'),
       ('Mircea Cartarescu', 'mircea.cartarescu@gettogether.test',
        'https://i.pravatar.cc/150?u=andrei.pop@gettogether.test', 'Bucharest',
        '$2y$10$8RwEChWvA32vO5ycMdKDD.otPCR1PZ0LejeGqsh/nwRArp3GZvan.'),
       ('Maria Ionescu', 'maria.ionescu@gettogether.test', 'https://i.pravatar.cc/150?u=maria.ionescu@gettogether.test',
        'Bucharest', '$2y$10$8RwEChWvA32vO5ycMdKDD.otPCR1PZ0LejeGqsh/nwRArp3GZvan.'),
       ('Radu Dumitru', 'radu.dumitru@gettogether.test', 'https://i.pravatar.cc/150?u=radu.dumitru@gettogether.test',
        'Timisoara', '$2y$10$8RwEChWvA32vO5ycMdKDD.otPCR1PZ0LejeGqsh/nwRArp3GZvan.'),
       ('Elena Stan', 'elena.stan@gettogether.test', 'https://i.pravatar.cc/150?u=elena.stan@gettogether.test', 'Iasi',
        '$2y$10$8RwEChWvA32vO5ycMdKDD.otPCR1PZ0LejeGqsh/nwRArp3GZvan.'),
       ('Vlad Munteanu', 'vlad.munteanu@gettogether.test', 'https://i.pravatar.cc/150?u=vlad.munteanu@gettogether.test',
        'Brasov', '$2y$10$8RwEChWvA32vO5ycMdKDD.otPCR1PZ0LejeGqsh/nwRArp3GZvan.'),
       ('Ioana Radu', 'ioana.radu@gettogether.test', 'https://i.pravatar.cc/150?u=ioana.radu@gettogether.test',
        'Cluj-Napoca', '$2y$10$8RwEChWvA32vO5ycMdKDD.otPCR1PZ0LejeGqsh/nwRArp3GZvan.');



