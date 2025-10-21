# Docker MCP Server - Complete Guide

## Overview

The Docker MCP Server provides AI agents with direct control over local Docker environment for container lifecycle management[28][31][34][43].

**Developer**: Alex Andru (QuantGeekDev)  
**Scope**: Local-only - interacts with Docker instance on your machine  
**Package**: docker-mcp-server  
**Key Feature**: Focused simplicity - covers 90% of daily container management needs

---

## Installation and Setup

### Via npm
```bash
npm install -g docker-mcp-server
```

### Configuration

```json
{
  "mcpServers": {
    "docker": {
      "command": "npx",
      "args": ["-y", "docker-mcp-server"]
    }
  }
}
```

### Prerequisites
- Docker Desktop or Docker Engine installed
- Docker daemon running
- User has Docker permissions (added to docker group on Linux)

---

## Complete Command Reference

### 1. create-container

**Purpose**: Instantly spinning up single services like databases for local testing

**Example**:
```
create-container image='postgres:15' name='test-db' environment='{"POSTGRES_PASSWORD":"mysecret"}'
```

**Parameters**:
- `image` (Required): Docker image name and tag
- `name` (Required): Container name
- `ports` (Optional): Port mappings (e.g., "5432:5432")
- `environment` (Optional): Environment variables as JSON object

**Warning**: Security risk - Use human-in-the-loop approval for sensitive operations

**When to Use**:
- Quick database setup for development
- Testing with specific service versions
- Isolated environment for experiments
- Temporary services for debugging

**Example Use Cases**:
- PostgreSQL: `create-container image='postgres:15' name='db' ports='5432:5432'`
- Redis: `create-container image='redis:7' name='cache' ports='6379:6379'`
- MongoDB: `create-container image='mongo:6' name='mongo' ports='27017:27017'`

---

### 2. deploy-compose

**Purpose**: Deploying complex, multi-container stacks from docker-compose.yml via single prompt

**Example**:
```
deploy-compose project_name='my-app-stack' compose_yaml='version: "3.8"
services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret'
```

**Parameters**:
- `project_name` (Required): Name for the Docker Compose project
- `compose_yaml` (Required): Full YAML content escaped as string

**Warning**: compose_yaml parameter must contain full YAML content escaped as string

**When to Use**:
- Multi-service application stacks
- Orchestrating dependencies (app + db + cache)
- Development environment setup
- Integration testing scenarios

**Pro Tip**: Let AI generate the compose YAML for you:
```
"Create a docker-compose file with nginx, postgres, and redis, then deploy it"
```

---

### 3. get-logs

**Purpose**: Real-time debugging and error analysis of a failing container

**Example**:
```
get-logs container_name='api-service' and summarize the latest 20 log lines
```

**Parameters**:
- `container_name` (Required): Name or ID of container

**Warning**: Logging visibility depends on container's configuration

**When to Use**:
- Debugging application errors
- Monitoring container startup
- Investigating crashes
- Analyzing behavior patterns

**Advanced**: Can ask AI to:
- Summarize errors
- Identify patterns
- Suggest fixes based on logs
- Compare logs across containers

---

### 4. list-containers

**Purpose**: Monitor the local Docker environment and check health overview

**Example**:
```
list-containers
```
or
```
List all my running Docker containers and their status
```

**Parameters**: None ({})

**Output Example**:
```
Name: web-server | Image: nginx:latest | Status: Up 2 hours | Ports: 0.0.0.0:80->80/tcp
Name: postgres-db | Image: postgres:15 | Status: Up 30 minutes | Ports: 5432/tcp
Name: redis-cache | Image: redis:7 | Status: Exited (0) 5 minutes ago
```

**Warning**: Advanced features like volume/network management typically not implemented

**When to Use**:
- Quick status check
- Before starting new containers
- Debugging port conflicts
- Resource usage overview

---

## Docker MCP Toolkit (Separate from Server)[34][37][40][43]

**Not a server** - It's a management utility and gateway for running containerized MCP servers.

### What It Does[34]

- **Access to 200+ MCP servers** with one-click installation
- **Isolates MCP servers in containers** with security checks
- **Automatically configures AI assistants** (Goose, LM Studio, Claude Desktop)
- **Provides security checks** for both tool calls and outputs

### Key Commands

#### Run Gateway Over Network
```bash
docker mcp gateway run --transport sse
```
Exposes at `http://YOUR_IP:8811`

#### Connect Client
```bash
docker mcp client connect claude-desktop --global
```
Creates configuration automatically

#### Add Custom Server to Catalog
```bash
docker mcp catalog add my-custom-tools dice-roller ./dice_config.yaml
```

### Benefits[34][43]

> "Docker MCP Toolkit provides access to 200+ MCP servers with one-click installation"

> "Isolates MCP servers in containers with security checks for tool calls and outputs"

> "Much more organized than running multiple node.exe instances for each MCP server"

---

## Social Listening: Real-World Usage

### From Docker Blog[34]

> "The Docker MCP Catalog and Toolkit bring MCP servers to your local dev setup, making it easy and secure to supercharge AI agents and coding assistants."

### From YouTube[37]

> "Docker Just Made Using MCP Servers 100x Easier - One-click installation beats manual setup every time"

### From Skywork AI[28]

> "Docker MCP Server by QuantGeekDev: Your AI's Hands-On Guide - provides sandboxed isolation to prevent undesirable LLM behavior from damaging host"

### From Reddit r/mcp[31]

Community discussion highlights:
- "The beauty lies in focused simplicity - covers 90% of daily container management needs"
- "Granting AI control over host system requires extreme caution"
- "Human-in-the-loop approval is essential for production-like operations"

---

## Common Issues and Troubleshooting

### Issue 1: Permission Denied

**Problem**: Cannot connect to Docker daemon

**Linux Solution**:
```bash
sudo usermod -aG docker $USER
# Log out and back in
```

**Windows/Mac**: Ensure Docker Desktop is running

---

### Issue 2: Port Already in Use

**Problem**: Cannot create container due to port conflict

**Solution**:
```bash
# List what's using the port
docker ps | grep 5432

# Stop conflicting container
docker stop container-name

# Or use different port
create-container image='postgres:15' ports='5433:5432'
```

---

### Issue 3: Container Exits Immediately

**Problem**: Container starts but exits with code 1 or 137

**Common Causes**:
- Missing required environment variables
- Insufficient memory
- Configuration errors

**Debugging**:
```
1. get-logs container_name='failing-container'
2. Review error messages
3. Check environment variables
4. Verify image requirements
```

---

### Issue 4: Docker MCP Toolkit Catalog Too Small[31][43]

**Problem**: Only 110 servers in toolkit vs thousands in registries like Smithery

**Workaround**:
- Use Smithery for discovery
- Add custom servers to toolkit catalog manually
- Use standalone MCP servers when toolkit doesn't have what you need

---

### Issue 5: Windsurf/Cline Not Seeing Tools[31]

**Problem**: Client doesn't see configured MCP tools

**Status**: Known compatibility issue

**Solution**: Use different client (Cursor, Claude Desktop, VS Code) or contribute fix to community

---

## Security Best Practices

### 1. Human-in-the-Loop for Dangerous Operations[31][43]

**Never allow AI to**:
- Destroy containers without confirmation
- Access production Docker hosts
- Modify critical infrastructure containers
- Execute arbitrary commands in containers

**Implementation Pattern**:
```
AI: "I recommend stopping the database container"
Human: Reviews impact, approves/denies
AI: Executes only if approved
```

---

### 2. Network Isolation

Run Docker MCP server in restricted network:
```json
{
  "mcpServers": {
    "docker": {
      "command": "npx",
      "args": ["-y", "docker-mcp-server"],
      "env": {
        "DOCKER_HOST": "tcp://localhost:2375"
      }
    }
  }
}
```

---

### 3. Use Docker MCP Toolkit for Additional Security[34][43]

**Built-in Security Features**:
- Container isolation
- Security checks for tool calls
- Output validation
- Curated catalog

**Why It's Safer**:
- Each MCP server runs in own container
- Limited host access
- Pre-vetted server implementations

---

### 4. Audit Logging

Enable Docker audit logging:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

---

### 5. Resource Limits

Prevent resource exhaustion:
```bash
docker run --memory="512m" --cpus="1.0" image-name
```

---

## Integration Patterns

### Pattern 1: Development Environment Setup
```
1. "Set up a full MEAN stack environment"
2. AI creates MongoDB container
3. AI creates Express backend container
4. AI creates Angular frontend container
5. AI creates Nginx reverse proxy
6. AI links all containers
7. Provides access URLs
```

### Pattern 2: Database Testing
```
1. "Spin up a PostgreSQL database for testing"
2. AI creates container with test data
3. Run integration tests
4. AI destroys container when done
```

### Pattern 3: Service Debugging
```
1. "My API container keeps crashing"
2. AI lists containers
3. AI retrieves logs from API container
4. AI analyzes error patterns
5. AI suggests fixes
6. AI recreates container with fixes
```

### Pattern 4: Multi-Environment Management
```
1. "Show me all running environments"
2. AI lists containers grouped by compose project
3. "Stop the staging environment"
4. AI stops all staging containers
```

---

## Example Prompts for Developers

### Setup Prompts
```
"Create a PostgreSQL 15 database container named 'dev-db' on port 5432"

"Deploy a docker-compose stack with Redis, PostgreSQL, and nginx"

"Spin up a MongoDB container for testing"

"Create a MySQL database with root password 'secret123'"
```

### Management Prompts
```
"List all running containers and their ports"

"Show me logs from the 'api-server' container"

"Stop all containers in the 'dev-stack' project"

"Restart the postgres container"
```

### Debugging Prompts
```
"Why did my 'web-server' container exit?"

"Show me the last 50 log lines from 'app' container"

"Which container is using port 3000?"

"List containers that have restarted more than 3 times"
```

---

## Best Practices for Junior Developers

### 1. Always Name Your Containers
```bash
# Bad
docker run postgres:15

# Good
docker run --name dev-postgres postgres:15
```

### 2. Use Environment Files
```bash
# Instead of
create-container environment='{"VAR1":"val1","VAR2":"val2"}'

# Use
.env file + docker-compose
```

### 3. Clean Up Regularly
```bash
docker system prune -a --volumes
```

### 4. Learn Docker Compose
Multi-container apps are easier with compose than individual containers

### 5. Check Logs First
Before recreating containers, check logs to understand failures

### 6. Use Official Images
Stick to official images from Docker Hub for security and reliability

---

## Comparison: Docker MCP Server vs Toolkit

| Feature | Docker MCP Server | Docker MCP Toolkit |
|---------|------------------|-------------------|
| Purpose | Control local Docker | Run MCP servers in containers |
| Manages | Your containers | MCP servers as containers |
| Commands | create, deploy, logs, list | gateway, client, catalog |
| Security | Depends on implementation | Built-in checks |
| Scope | Single machine | Can expose over network |
| Catalog | N/A | 200+ servers |

---

## Additional Resources

- [Docker MCP Server GitHub (QuantGeekDev)](https://github.com/QuantGeekDev/docker-mcp-server)
- [Docker MCP Toolkit Official](https://www.docker.com/blog/mcp-toolkit-mcp-servers-that-just-work/)
- [Docker MCP Security Issues](https://www.docker.com/blog/mcp-security-issues-threatening-ai-infrastructure/)
- [Skywork AI Guide](https://skywork.ai/skypage/en/docker-mcp-server-ai-guide/)
- [Docker Official Documentation](https://docs.docker.com/)

---

*Last Updated: October 2025*
