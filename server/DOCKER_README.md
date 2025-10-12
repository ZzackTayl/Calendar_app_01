# Calendar Mobile Server - Docker Setup

This document explains how to run the Calendar Mobile Serverpod server using Docker.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

1. **Build and start all services:**
   ```bash
   docker-compose up --build
   ```

2. **Start in detached mode:**
   ```bash
   docker-compose up -d --build
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f server
   docker-compose logs -f database
   ```

4. **Stop services:**
   ```bash
   docker-compose down
   ```

## Services

### Database (PostgreSQL)
- **Image:** postgres:14
- **Port:** 5432
- **Database:** calendar_dev
- **Username:** postgres
- **Password:** example

### Server (Serverpod)
- **Port:** 8080
- **Environment:** development
- **Built from:** Local Dockerfile

### Redis (Optional)
- **Image:** redis:7-alpine
- **Port:** 6379
- **Used for:** Caching and session management

## Configuration

The server uses the `config/development.yaml` file which is configured for Docker:

```yaml
server:
  port: 8080
  publicHost: localhost
  publicPort: 8080
  publicScheme: http

database:
  host: database
  port: 5432
  name: calendar_dev
  username: postgres
  password: example
```

## Database Initialization

The database is automatically initialized with:
- Calendar table with sample events
- User table with sample users
- Proper indexes for performance

## API Endpoints

Once running, the server will be available at:
- **Base URL:** http://localhost:8080
- **Health Check:** http://localhost:8080/health

## Development

### Rebuilding the server:
```bash
docker-compose build server
docker-compose up server
```

### Accessing the database:
```bash
docker exec -it calendar_db psql -U postgres -d calendar_dev
```

### Viewing container status:
```bash
docker-compose ps
```

## Troubleshooting

### Server won't start:
1. Check if the database is healthy: `docker-compose ps`
2. View server logs: `docker-compose logs server`
3. Ensure port 8080 is not in use

### Database connection issues:
1. Wait for database health check to pass
2. Check database logs: `docker-compose logs database`
3. Verify database credentials in config/development.yaml

### Rebuilding everything:
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```