#!/usr/bin/env python3
"""
Expose a stdio-only MCP server over a local WebSocket so the Codex CLI
can connect using its ws:// transport. Each WebSocket client spawns a
fresh instance of the underlying command.
"""

import argparse
import asyncio
import ipaddress
import logging
import os
import signal
import sys
from typing import List

import websockets

LOG = logging.getLogger("mcp_ws_bridge")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Bridge a stdio MCP server to a ws:// endpoint."
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Host interface to bind (default: %(default)s).",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=49000,
        help="Port to bind the WebSocket server (default: %(default)s).",
    )
    parser.add_argument(
        "--allow-remote",
        action="store_true",
        help=(
            "Accept connections from non-loopback hosts. "
            "Disabled by default to prevent exposing the bridge to the network."
        ),
    )
    parser.add_argument(
        "command",
        nargs=argparse.REMAINDER,
        help=(
            "Command to launch the MCP server. "
            "Prefix with '--' if the command starts with a flag."
        ),
    )
    return parser


async def _pipe_ws_to_proc(websocket, proc):
    try:
        async for message in websocket:
            if isinstance(message, str):
                data = message.encode("utf-8")
            else:
                data = message
            if proc.stdin is not None:
                proc.stdin.write(data)
                await proc.stdin.drain()
    except websockets.ConnectionClosed:
        LOG.debug("WebSocket closed -> stdin pipe shutting down")
    finally:
        if proc.stdin is not None:
            proc.stdin.close()


async def _pipe_proc_to_ws(websocket, proc):
    try:
        while True:
            if proc.stdout is None:
                break
            data = await proc.stdout.read(4096)
            if not data:
                break
            try:
                text = data.decode("utf-8")
            except UnicodeDecodeError:
                text = data.decode("utf-8", "ignore")
            await websocket.send(text)
    except websockets.ConnectionClosed:
        LOG.debug("WebSocket closed -> stdout pipe shutting down")


async def _consume_stderr(proc):
    if proc.stderr is None:
        return
    while True:
        line = await proc.stderr.readline()
        if not line:
            break
        LOG.warning("MCP stderr: %s", line.decode("utf-8", "ignore").rstrip())


def _is_loopback(address: str) -> bool:
    try:
        return ipaddress.ip_address(address).is_loopback
    except ValueError:
        return False


async def handler(websocket, cmd: List[str], allow_remote: bool):
    LOG.info("Client connected from %s", websocket.remote_address)
    if not allow_remote:
        host = (websocket.remote_address or ("",))[0]
        if host and not _is_loopback(host):
            LOG.warning("Rejecting non-local connection from %s", host)
            await websocket.close(code=1008, reason="Local connections only")
            return
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    LOG.info("Spawned MCP process pid=%s", proc.pid)

    forward_in = asyncio.create_task(_pipe_ws_to_proc(websocket, proc))
    forward_out = asyncio.create_task(_pipe_proc_to_ws(websocket, proc))
    stderr_task = asyncio.create_task(_consume_stderr(proc))

    proc_wait = asyncio.create_task(proc.wait())

    done, pending = await asyncio.wait(
        {forward_in, forward_out, proc_wait}, return_when=asyncio.FIRST_COMPLETED
    )

    for task in pending:
        task.cancel()

    if proc_wait not in done:
        LOG.info("Terminating MCP process pid=%s", proc.pid)
        proc.terminate()
        try:
            await asyncio.wait_for(proc.wait(), timeout=5)
        except asyncio.TimeoutError:
            LOG.warning("Force killing MCP process pid=%s", proc.pid)
            proc.kill()
            await proc.wait()
    else:
        await proc_wait

    await stderr_task
    LOG.info("Client disconnected")


async def main():
    parser = build_parser()
    args = parser.parse_args()

    command = args.command
    if not command:
        parser.error("You must supply the MCP command after '--'.")
    if command[0] == "--":
        command = command[1:]

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    LOG.info(
        "Starting bridge on ws://%s:%s -> %s",
        args.host,
        args.port,
        " ".join(command),
    )

    stop_event = asyncio.Event()

    def _handle_signal(signum, frame):
        try:
            sig_name = signal.Signals(signum).name
        except ValueError:
            sig_name = str(signum)
        LOG.info("Received %s, shutting down", sig_name)
        stop_event.set()

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    async with websockets.serve(
        lambda ws: handler(ws, command, args.allow_remote), args.host, args.port
    ):
        await stop_event.wait()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
