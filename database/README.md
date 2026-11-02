# Database scripts

Every `.sql` file in this folder is run by Postgres, in alphabetical order, when the container starts.

- `00_init.sql` is the base script.
- Each module has its own script, so feature owners never edit the same file. Prefix it with the next free number: `01_users.sql`, `02_events.sql`, `03_chat.sql`.
- Scripts run **only on an empty volume**. After changing a script, recreate the database:

```bash
docker compose down -v
docker compose up -d
```
