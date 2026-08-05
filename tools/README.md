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

On first start, the init scripts in `postgres/init/` run automatically and create:

- `users` table with sample active and inactive rows (including a user at id=42 for the stored procedure demo)
- `accounts` table with two seeded rows (ids 1 and 2) for the transaction step
- `usp_activate_user` stored procedure

These scripts only run against a fresh data volume. To reset and re-run them:

```bash
docker compose down -v
docker compose up -d
```


### MongoDB (`mongodb/`)

Runs a MongoDB 6.0 (LTS) instance on the default port `27017`.

```bash
cd tools/mongodb
docker compose up -d
```

Set the following in your project's `.env`:

```
MONGODB_URI=mongodb://dtk:dtk@localhost:27017/dtk?authSource=admin
MONGODB_DATABASE=dtk
```

Credentials: user `dtk`, password `dtk`, database `dtk`.

On first start, the init script in `mongodb/init/` runs automatically and seeds:

- `users` collection with three sample documents
- `accounts` collection with two seeded documents

These scripts only run against a fresh data volume. To reset and re-run them:

```bash
docker compose down -v
docker compose up -d
```


### Kafka (`kafka/`)

Runs [Redpanda](https://redpanda.com/) — a Kafka-API-compatible broker — on port `19092`, plus Redpanda Console (UI) on port `8080`.

```bash
cd tools/kafka
docker compose up -d
```

Set the following in your project's `.env`:

```
KAFKA_BROKERS=localhost:19092
KAFKA_CLIENT_ID=dtk-client
```

Redpanda Console is available at http://localhost:8080 and lets you inspect topics, consumer groups, and messages.

### AWS (`aws/`)

No docker files. These include helper files to demo and test the runbooks.

- s3-test-file.txt: test file for running the aws-s3 example runbook
- s3-test-file-downloaded.txt: test file that may appear after running the aws-s3 example runbook as it contains a download step (it is gitignored and essentially a copy of the file above if that was used in the upload)

## Stopping services

```bash
docker compose down
```

To also remove volumes (clears all data):

```bash
docker compose down -v
```