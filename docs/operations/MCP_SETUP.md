# MCP (Model Context Protocol) Setup for Qwen3 CLI

## Overview
This setup allows you to connect Qwen3 CLI to development tools for Dart/Flutter and DCM projects. The configuration is for development use only and should not be integrated into your production code.

## Configuration

The `.mcp/config.json` file contains the server configuration that connects to:

1. **dart**: Runs `dart mcp-server` to provide Dart language context
2. **dcm**: Runs `dcm start-mcp-server --client=qwen3` to provide DCM (Dart Component Model) context

## Usage

To use with Qwen3 CLI, ensure you have:

1. Dart SDK installed with the `dart` command available
2. DCM tools installed with the `dcm` command available
3. Python 3 and the required packages installed:
   ```bash
   python3 -m pip install qwen-agent mcp
   ```

## Important Notes

- This configuration is for development purposes only
- The `.mcp/` directory is added to `.gitignore` to avoid committing to production
- The servers provide context to AI tools and are not part of your application code
- This setup is for enhancing your development workflow with AI assistance

## Setup

1. Install required dependencies:
   ```bash
   python3 -m pip install qwen-agent mcp
   ```

2. Ensure Dart SDK is installed and `dart` command is available
3. Ensure DCM tools are installed and `dcm` command is available
4. The configuration is in `.mcp/config.json`
5. MCP bridge script is in `tools/mcp_websocket_bridge.py` (for WebSocket connections if needed)

## Troubleshooting

If you encounter issues:
1. Verify Dart SDK is installed: `dart --version`
2. Verify DCM tools are installed: `dcm --version`
3. Verify Python dependencies are installed: `python3 -m pip show qwen-agent mcp`
4. Make sure your project directory has proper permissions