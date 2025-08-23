# PolyHarmony Docker Deployment Guide

This guide will help you deploy PolyHarmony using Docker containers.

## Prerequisites

- Docker installed and running
- Docker Compose installed
- Environment variables configured

## Quick Start

### 1. Environment Setup

Create a `.env` file in the root directory with your environment variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional: Other environment variables
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### 2. Development Mode

For development with hot reloading:

```bash
# Build and start development container
docker-compose -f docker-compose.dev.yml up --build

# Or run in background
docker-compose -f docker-compose.dev.yml up -d --build
```

Access your application at: http://localhost:3000

### 3. Production Deployment

#### Option A: Using the deployment script

```bash
# Make sure the script is executable
chmod +x deploy.sh

# Run the deployment
./deploy.sh
```

#### Option B: Manual deployment

```bash
# Build the production image
docker-compose build app

# Start the application
docker-compose up -d app

# Check logs
docker-compose logs -f app
```

#### Option C: Production with Nginx

```bash
# Start with nginx reverse proxy
docker-compose --profile production up -d
```

## Docker Commands

### Building Images

```bash
# Build production image
docker-compose build app

# Build development image
docker-compose -f docker-compose.dev.yml build app-dev
```

### Running Containers

```bash
# Start production
docker-compose up -d

# Start development
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f app

# Stop containers
docker-compose down
```

### Container Management

```bash
# View running containers
docker-compose ps

# Restart application
docker-compose restart app

# Update and restart
docker-compose pull && docker-compose up -d

# Remove containers and volumes
docker-compose down -v
```

## Health Checks

The application includes a health check endpoint at `/api/health`. Docker will automatically monitor this endpoint.

Check health manually:
```bash
curl http://localhost:3000/api/health
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | Yes |
| `NODE_ENV` | Environment (production/development) | No |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | No |

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using port 3000
   lsof -i :3000
   
   # Kill the process or change the port in docker-compose.yml
   ```

2. **Build fails**
   ```bash
   # Clean Docker cache
   docker system prune -a
   
   # Rebuild without cache
   docker-compose build --no-cache app
   ```

3. **Application not starting**
   ```bash
   # Check logs
   docker-compose logs app
   
   # Check environment variables
   docker-compose exec app env
   ```

4. **Database connection issues**
   - Verify your Supabase credentials
   - Check if your IP is whitelisted in Supabase
   - Ensure the database is accessible

### Logs and Debugging

```bash
# View application logs
docker-compose logs -f app

# View nginx logs (if using production profile)
docker-compose logs -f nginx

# Access container shell
docker-compose exec app sh

# Check container resources
docker stats
```

## Production Considerations

### Security

- Use HTTPS in production
- Set up proper firewall rules
- Use secrets management for sensitive data
- Regularly update base images

### Performance

- Use multi-stage builds (already implemented)
- Enable gzip compression (nginx config included)
- Set up proper caching headers
- Monitor resource usage

### Monitoring

- Set up logging aggregation
- Monitor application metrics
- Set up alerts for health check failures
- Use Docker's built-in monitoring

## Scaling

To scale the application:

```bash
# Scale to multiple instances
docker-compose up -d --scale app=3

# Use a load balancer
# Consider using Docker Swarm or Kubernetes for production scaling
```

## Backup and Recovery

```bash
# Backup application data
docker-compose exec app tar -czf backup.tar.gz /app/data

# Restore from backup
docker-compose exec app tar -xzf backup.tar.gz -C /app/
```

## Support

For issues related to:
- Docker setup: Check this guide and Docker documentation
- Application issues: Check the main README.md
- Database issues: Check Supabase documentation

## License

This deployment setup is part of the PolyHarmony project. See the main LICENSE file for details.
