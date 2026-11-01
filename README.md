# GetTogether

Mobile-first web application for discovering events and planning free time: swipeable event carousel, recommendations, maps, per-event chat, calendar integration, day itineraries, friends, reviews and an AI events recap.

## Structure

| Folder | Stack |
| --- | --- |
| `backend/` | Spring Boot 4 + Spring Modulith, Java 21, Gradle, JPA, PostgreSQL |
| `frontend/` | Angular 21, SCSS |

## Running locally

Database (needs Docker):

```bash
docker compose up -d
```

Backend (http://localhost:8080):

```bash
cd backend
./gradlew bootRun
```

Frontend (http://localhost:4200):

```bash
cd frontend
npm install
npm start
```

Tests: `./gradlew test` in `backend/` (the context test starts PostgreSQL through Testcontainers, so it needs Docker), `npm test` in `frontend/`. Lint: `npm run lint` in `frontend/`.

Each feature is a Spring Modulith module: a direct sub-package of `com.gettogether` (e.g. `com.gettogether.chat`). Other modules may only use what is in the module's root package; `ModularityTests` enforces this.

## Git rules

### Branches
- Nothing is pushed to `main`, only merged.
- Each feature has an epic branch named `#<ticket>/<title>` (e.g. `#10/chat`), merged into `main` when the whole feature is done.
- Each ticket has its own branch from the epic branch (e.g. `#123/multichat-user-add-button`), merged back into the epic branch when done.
- Every PR has one specific ticket. Anyone can create tickets (bugs, missed feature details).
- Merge into an epic branch: **one** review from a colleague.
- Merge into `main`: **two** reviews, one from the tech lead or project manager.
- After a merge into `main`, every dev updates their own epic branches.

### Commits
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), with the ticket number on the following line:

```
fix: UI message for chat when the user is offline
#213
```

### Pull requests
- Must contain the link to the ticket and a short description of the work done (see the PR template).
- Reviewer: reads and understands the code, comments or requests changes, and manually tests the features on the target branch.
- If a merged branch has bugs, the developer and the reviewer are both partially responsible.

## Coding rules
- No dead code.
- Comments only where needed (hard-to-understand parts, or language/framework specifics).
- No AI-generated code that is impossible to understand.
- No hardcoded constants, especially if used in more than one place: declare them once (e.g. `Integer MAXIMUM_LENGTH = 200;`).
- No redundant debugging logs merged into `main`.
- A linter will be added.
