# Database scripts

Postgres runs the top-level `.sql` files in alphabetical order when it initializes an empty volume.

- `00_init.sql` is the base script.
- Each module has its own script, so feature owners never edit the same file. Prefix it with the next free number: `01_users.sql`, `02_events.sql`, `03_chat.sql`.
- Apply scripts in `migrations/` explicitly to existing volumes. Follow the backup and upgrade instructions in the root README before applying the login and registration migration.
