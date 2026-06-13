# Tools

Local Docker services for testing dtk-generated projects, particularly the `example` project.

## Services

### Redis (`redis/`)

Runs a Redis instance on the default port `6379`.

```bash
cd tools/redis
docker compose up -d
```

Set the following in your project's `.env`:

```
REDIS_URL=redis://localhost:6379
```

### Postgres (`postgres/`)

Runs a Postgres instance on the default port `5432`.

```bash
cd tools/postgres
docker compose up -d
```

Set the following in your project's `.env`:

```
SQL_CONNECTION_STRING=postgresql://dtk:dtk@localhost:5432/dtk
```

Credentials: user `dtk`, password `dtk`, database `dtk`.

## Stopping services

```bash
docker compose down
```

To also remove volumes (clears all data):

```bash
docker compose down -v
```
