#!/bin/bash
# Qwen3 MCP Setup Script

echo "Qwen3 MCP Server Setup for Dart/Flutter Development"

# Check if required dependencies are installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python3 is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed"
    exit 1
fi

# Start the MCP servers using the configuration
echo "Starting Qwen3 MCP servers..."
echo "Configuration located at: .mcp/config.json"
echo ""
echo "Available servers:"
echo "- dart-flutter: Filesystem access for Dart/Flutter context"
echo "- dcm: Filesystem access for DCM context"
echo ""
echo "To use with Qwen3 CLI, make sure the servers are running."
echo ""
echo "For WebSocket connections, use the MCP bridge script:"
echo "python3 tools/mcp_websocket_bridge.py --port 49000 -- [command]"