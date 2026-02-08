#!/usr/bin/env node
/**
 * Figma Editor MCP Server (v2 - Simplified)
 *
 * 8 tools instead of 50+. All design operations go through figma_execute.
 *
 * Architecture:
 * Claude -> MCP Server (stdio) -> WebSocket (9876) -> Figma Plugin -> Figma File
 */
export {};
