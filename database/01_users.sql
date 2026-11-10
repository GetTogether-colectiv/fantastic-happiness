CREATE TABLE users
(
    id           BIGSERIAL PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    email        VARCHAR(255) NOT NULL UNIQUE,
    avatar_url   VARCHAR(500),
    city         VARCHAR(100),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE user_preferred_categories
(
    user_id  BIGINT REFERENCES users ON DELETE CASCADE,
    category VARCHAR(30) NOT NULL,
    PRIMARY KEY (user_id, category)
);

INSERT INTO users (display_name, email, avatar_url, city)
VALUES ('Alexandra Pop', 'alexandra.pop@gettogether.test',
        'https://i.pravatar.cc/150?u=alexandra.joldea@gettogether.test', 'Cluj-Napoca'),
       ('Iulia Dragomir', 'iulia.dragomir@gettogether.test', 'https://i.pravatar.cc/150?u=iulia.jurja@gettogether.test',
        'Cluj-Napoca'),
       ('Alexandra Mihailovici', 'alexandra.mihailovici@gettogether.test',
        'https://i.pravatar.cc/150?u=alexandra.mariasiu@gettogether.test', 'Cluj-Napoca'),
       ('George Enescu', 'george.enescu@gettogether.test', 'https://i.pravatar.cc/150?u=stefan.trifan@gettogether.test',
        'Cluj-Napoca'),
       ('Diana Printesa', 'diana.printesa@gettogether.test', 'https://i.pravatar.cc/150?u=diana.reut@gettogether.test',
        'Cluj-Napoca'),
       ('David Pop', 'david.pop@gettogether.test', 'https://i.pravatar.cc/150?u=david.popescu@gettogether.test',
        'Cluj-Napoca'),
       ('Ion Creanga', 'ion.creanga@gettogether.test', 'https://i.pravatar.cc/150?u=denisa.sas@gettogether.test',
        'Cluj-Napoca'),
       ('Ion Barbu', 'ion.barbu@gettogether.test', 'https://i.pravatar.cc/150?u=mihai.ratiu@gettogether.test',
        'Cluj-Napoca'),
       ('Mircea Cartarescu', 'mircea.cartarescu@gettogether.test',
        'https://i.pravatar.cc/150?u=andrei.pop@gettogether.test', 'Bucharest'),
       ('Maria Ionescu', 'maria.ionescu@gettogether.test', 'https://i.pravatar.cc/150?u=maria.ionescu@gettogether.test',
        'Bucharest'),
       ('Radu Dumitru', 'radu.dumitru@gettogether.test', 'https://i.pravatar.cc/150?u=radu.dumitru@gettogether.test',
        'Timisoara'),
       ('Elena Stan', 'elena.stan@gettogether.test', 'https://i.pravatar.cc/150?u=elena.stan@gettogether.test', 'Iasi'),
       ('Vlad Munteanu', 'vlad.munteanu@gettogether.test', 'https://i.pravatar.cc/150?u=vlad.munteanu@gettogether.test',
        'Brasov'),
       ('Ioana Radu', 'ioana.radu@gettogether.test', 'https://i.pravatar.cc/150?u=ioana.radu@gettogether.test',
        'Cluj-Napoca');



