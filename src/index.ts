#!/usr/bin/env node
/**
 * Figma Editor MCP Server
 *
 * An MCP server that enables Claude to READ and WRITE to Figma files
 * through a WebSocket connection to a companion Figma plugin.
 *
 * Architecture:
 * Claude -> MCP Server -> WebSocket -> Figma Plugin -> Figma File
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// Fetch HTML from URL
async function fetchURL(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        fetchURL(response.headers.location).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode && response.statusCode >= 400) {
        reject(new Error(`HTTP ${response.statusCode}: Failed to fetch ${url}`));
        return;
      }

      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
      response.on('error', reject);
    });

    request.on('error', reject);
    request.setTimeout(15000, () => {
      request.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

// Extract main content from HTML (simplify for Figma)
function simplifyHTML(html: string): string {
  // Remove scripts, styles, and other non-visual elements
  let simplified = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '');

  // Try to extract body content
  const bodyMatch = simplified.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    simplified = bodyMatch[1];
  }

  // Clean up whitespace
  simplified = simplified
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();

  return simplified;
}

// Configuration
const WS_PORT = 9876;
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Types
interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timeout: NodeJS.Timeout;
}

interface PluginMessage {
  requestId: string;
  type: 'response' | 'error';
  data?: unknown;
  error?: string;
}

// State
let connectedPlugin: WebSocket | null = null;
const pendingRequests = new Map<string, PendingRequest>();
let requestCounter = 0;

// Load app schema if it exists (generic - works for any app)
function loadSchema(): Record<string, unknown> | null {
  // Check multiple possible schema locations
  const possiblePaths = [
    path.join(process.cwd(), 'app-schema.json'),
    path.join(process.cwd(), 'schema.json'),
    path.join(process.cwd(), 'app-schema.yaml'),
    path.join(process.cwd(), 'schema.yaml'),
  ];

  for (const schemaPath of possiblePaths) {
    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, 'utf-8');
      if (schemaPath.endsWith('.json')) {
        return JSON.parse(content);
      } else {
        // Basic YAML - return as raw for now
        return { raw: content, format: 'yaml' };
      }
    }
  }

  return null;
}

// WebSocket Server for Plugin Communication
function startWebSocketServer() {
  const wss = new WebSocketServer({ port: WS_PORT });

  console.error(`[MCP] WebSocket server started on port ${WS_PORT}`);

  wss.on('connection', (ws) => {
    console.error('[MCP] Figma plugin connected');
    connectedPlugin = ws;

    ws.on('message', (data) => {
      try {
        const message: PluginMessage = JSON.parse(data.toString());

        if (message.requestId && pendingRequests.has(message.requestId)) {
          const pending = pendingRequests.get(message.requestId)!;
          clearTimeout(pending.timeout);
          pendingRequests.delete(message.requestId);

          if (message.type === 'error') {
            pending.reject(new Error(message.error || 'Unknown plugin error'));
          } else {
            pending.resolve(message.data);
          }
        }
      } catch (e) {
        console.error('[MCP] Failed to parse plugin message:', e);
      }
    });

    ws.on('close', () => {
      console.error('[MCP] Figma plugin disconnected');
      if (connectedPlugin === ws) {
        connectedPlugin = null;
      }

      // Reject all pending requests
      for (const [id, pending] of pendingRequests) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Plugin disconnected'));
        pendingRequests.delete(id);
      }
    });

    ws.on('error', (error) => {
      console.error('[MCP] WebSocket error:', error);
    });
  });

  return wss;
}

// Send command to plugin and wait for response
function sendToPlugin(command: string, params: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!connectedPlugin || connectedPlugin.readyState !== WebSocket.OPEN) {
      reject(new Error('Figma plugin not connected. Please open the FigmaClaude plugin in Figma.'));
      return;
    }

    const requestId = `req_${++requestCounter}_${Date.now()}`;

    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error(`Request timed out after ${REQUEST_TIMEOUT}ms`));
    }, REQUEST_TIMEOUT);

    pendingRequests.set(requestId, { resolve, reject, timeout });

    connectedPlugin.send(JSON.stringify({
      requestId,
      command,
      params,
    }));
  });
}

// Tool Definitions
const TOOLS = [
  // READ TOOLS
  {
    name: 'get_file_structure',
    description: 'Get the structure of the current Figma file - all pages and top-level frames',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_selection',
    description: 'Get details about the currently selected nodes in Figma',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_node_details',
    description: 'Get detailed information about a specific node including: dimensions, position, text properties (alignment, auto-resize, overflow warnings), auto-layout info (mode, spacing, padding), fill types, and constraints. Enhanced to help detect layout issues.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The Figma node ID' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'search_nodes',
    description: 'Search for nodes by name pattern',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Name pattern to search for (case insensitive)' },
        nodeType: { type: 'string', description: 'Optional: filter by node type (FRAME, TEXT, COMPONENT, etc.)' },
      },
      required: ['pattern'],
    },
  },

  // DEEP ANALYSIS TOOLS
  {
    name: 'get_all_text_nodes',
    description: 'Get ALL text nodes within a frame (deep recursive scan). Returns every text node with path, content, font info, alignment, and overflow detection. Use this to ensure you never miss nested text in groups or components.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of the frame/group to scan for text nodes' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'export_frame_preview',
    description: 'Export a frame as a base64 PNG image to visually verify changes. Use this after making modifications to "see" the result.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of the frame to export' },
        scale: { type: 'number', description: 'Export scale (0.5 = 50%, 1 = 100%, 2 = 200%). Default: 0.5 for smaller size' },
        format: { type: 'string', enum: ['PNG', 'JPG', 'SVG'], description: 'Export format. Default: PNG' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'check_layout_consistency',
    description: 'Analyze spacing, alignment, and layout patterns within a frame. Detects inconsistent spacing, misaligned elements, and suggests using auto-layout. Use this before and after making changes to ensure visual coherence.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of the frame to analyze' },
      },
      required: ['nodeId'],
    },
  },

  // URL & HTML IMPORT TOOLS
  {
    name: 'import_url',
    description: 'Fetch a website and convert it to Figma layers. Extracts the HTML from the URL, simplifies it, and creates native Figma frames. Great for copying existing website designs.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The website URL to import (e.g., "https://example.com")' },
        selector: { type: 'string', description: 'Optional: CSS selector to extract specific section (e.g., ".hero", "#header")' },
        x: { type: 'number', description: 'X position on canvas' },
        y: { type: 'number', description: 'Y position on canvas' },
        name: { type: 'string', description: 'Name for the imported frame' },
      },
      required: ['url'],
    },
  },
  {
    name: 'import_html',
    description: 'Convert HTML/CSS to native Figma layers. Use this to rapidly generate designs by writing HTML (which Claude excels at) and having it automatically converted to editable Figma frames with proper auto-layout, text nodes, and styling. Supports flexbox, common CSS properties, and semantic HTML tags.',
    inputSchema: {
      type: 'object',
      properties: {
        html: {
          type: 'string',
          description: 'HTML string with inline styles. Use semantic tags (div, p, h1-h6, button, input, img) and inline CSS styles for layout (display:flex, gap, padding) and visuals (background-color, color, border-radius).'
        },
        parentId: { type: 'string', description: 'Optional: ID of parent frame to insert into' },
        x: { type: 'number', description: 'X position on canvas (default: 0)' },
        y: { type: 'number', description: 'Y position on canvas (default: 0)' },
        name: { type: 'string', description: 'Name for the root frame' },
      },
      required: ['html'],
    },
  },

  // DESIGN LEARNING TOOLS
  {
    name: 'study_frame',
    description: 'Analyze a "gold standard" frame to learn its design patterns. Returns spacing rules, text styles with max widths, color palette, component patterns, and recommendations. Use this BEFORE designing to understand the existing style. Point it at 2-3 of the best-designed screens.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of the frame to study (should be a well-designed reference screen)' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'audit_components',
    description: 'Catalog all unique UI patterns across the entire page. Returns categorized components (buttons, cards, inputs, badges), text styles, color palette, and spacing system. Use this to understand the full design system before making changes.',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: { type: 'string', description: 'Optional: specific page ID (defaults to current page)' },
        includeInstances: { type: 'boolean', description: 'Whether to include component instances (default: true)' },
      },
      required: [],
    },
  },
  {
    name: 'get_text_constraints',
    description: 'Get maximum text widths for each font size in the file. Prevents text overflow by knowing exact container limits. Returns constraints grouped by text category (hero, heading, body, caption).',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'Optional: specific frame to analyze (defaults to entire page)' },
      },
      required: [],
    },
  },
  {
    name: 'prepare_to_design',
    description: 'PRE-FLIGHT CHECK: Run this BEFORE any design work. Analyzes the file to learn spacing rules, text constraints, and color palette. Returns a design brief with MANDATORY RULES you MUST follow. This is the single most important tool for preventing layout mistakes.',
    inputSchema: {
      type: 'object',
      properties: {
        referenceFrameId: { type: 'string', description: 'Optional: ID of a well-designed reference frame to learn from' },
        pageId: { type: 'string', description: 'Optional: specific page to analyze' },
      },
      required: [],
    },
  },
  {
    name: 'get_design_rules',
    description: 'Get contextual design rules for a specific operation. Returns MANDATORY rules that prevent layout mistakes like text overflow, element overlap, and inconsistent spacing. Call this BEFORE creating elements to understand constraints.',
    inputSchema: {
      type: 'object',
      properties: {
        targetParentId: {
          type: 'string',
          description: 'ID of the parent frame where you will add elements. Provides context-specific rules based on parent auto-layout, dimensions, etc.',
        },
        operation: {
          type: 'string',
          enum: ['create_frame', 'create_text', 'create_rectangle', 'modify', 'general'],
          description: 'The operation you are about to perform. Returns operation-specific guidance.',
        },
      },
      required: [],
    },
  },

  // WRITE TOOLS
  {
    name: 'create_frame',
    description: 'Create a new frame in Figma. IMPORTANT: Always set layoutMode (VERTICAL or HORIZONTAL) and itemSpacing for consistent layouts. Call get_design_rules first if unsure about constraints.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the frame' },
        parentId: { type: 'string', description: 'ID of parent node (optional, defaults to current page)' },
        x: { type: 'number', description: 'X position' },
        y: { type: 'number', description: 'Y position' },
        width: { type: 'number', description: 'Width of frame' },
        height: { type: 'number', description: 'Height of frame' },
        fillColor: {
          type: 'object',
          description: 'Background color as {r, g, b} values 0-1',
          properties: {
            r: { type: 'number' },
            g: { type: 'number' },
            b: { type: 'number' },
          },
        },
      },
      required: ['name', 'width', 'height'],
    },
  },
  {
    name: 'create_text',
    description: 'Create a text node in Figma. CRITICAL: Always set width and textAutoResize:"HEIGHT" to prevent overflow. Call get_design_rules({targetParentId, operation:"create_text"}) first to get max allowed width. AUTO-CHECKS: Returns warnings if text overflows.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The text content' },
        parentId: { type: 'string', description: 'ID of parent frame' },
        x: { type: 'number', description: 'X position within parent' },
        y: { type: 'number', description: 'Y position within parent' },
        fontSize: { type: 'number', description: 'Font size in pixels' },
        fontFamily: { type: 'string', description: 'Font family name (e.g., "Inter", "Roboto", "Canela Deck Trial")' },
        fontStyle: { type: 'string', description: 'Font style (e.g., "Regular", "Bold", "Thin", "Medium")' },
        fontWeight: { type: 'string', description: 'Legacy: Font weight, use fontStyle instead' },
        width: { type: 'number', description: 'Fixed width for text box. When set, text will wrap to this width.' },
        textAutoResize: { type: 'string', enum: ['WIDTH_AND_HEIGHT', 'HEIGHT', 'NONE', 'TRUNCATE'], description: 'Text resize mode. HEIGHT enables text wrapping with fixed width.' },
        maxWidth: { type: 'number', description: 'Optional: max width constraint (triggers warning if exceeded)' },
        fillColor: {
          type: 'object',
          description: 'Text color as {r, g, b} values 0-1',
          properties: {
            r: { type: 'number' },
            g: { type: 'number' },
            b: { type: 'number' },
          },
        },
      },
      required: ['content', 'parentId'],
    },
  },
  {
    name: 'create_rectangle',
    description: 'Create a rectangle shape, optionally copying fills (including images) from another node',
    inputSchema: {
      type: 'object',
      properties: {
        parentId: { type: 'string', description: 'ID of parent frame' },
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
        cornerRadius: { type: 'number', description: 'Corner radius for rounded rectangles' },
        fillColor: {
          type: 'object',
          properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' } },
        },
        copyFillsFrom: { type: 'string', description: 'Node ID to copy fills from (preserves image fills)' },
      },
      required: ['parentId', 'width', 'height'],
    },
  },
  {
    name: 'duplicate_node',
    description: 'Duplicate an existing node, optionally to a different parent',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of node to duplicate' },
        newName: { type: 'string', description: 'Name for the duplicated node' },
        offsetX: { type: 'number', description: 'X offset from original' },
        offsetY: { type: 'number', description: 'Y offset from original' },
        targetParentId: { type: 'string', description: 'ID of parent to move the duplicate to (optional)' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'move_node',
    description: 'Move a node to a different parent frame',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of node to move' },
        targetParentId: { type: 'string', description: 'ID of the new parent frame' },
        x: { type: 'number', description: 'New X position within parent' },
        y: { type: 'number', description: 'New Y position within parent' },
      },
      required: ['nodeId', 'targetParentId'],
    },
  },
  {
    name: 'modify_node',
    description: 'Modify properties of an existing node',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of node to modify' },
        properties: {
          type: 'object',
          description: 'Properties to change (name, x, y, width, height, visible, opacity, etc.)',
        },
      },
      required: ['nodeId', 'properties'],
    },
  },
  {
    name: 'resize_node',
    description: 'Resize a node using Figma\'s resize() method. Use this to change dimensions of frames, rectangles, groups, and other resizable nodes. This is the proper way to resize nodes (instead of setting width/height properties directly).',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of node to resize' },
        width: { type: 'number', description: 'New width (optional, keeps original if not specified)' },
        height: { type: 'number', description: 'New height (optional, keeps original if not specified)' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'update_text',
    description: 'Update the content, font, or style of a text node. AUTO-CHECKS: Returns dimension changes and warnings if text grows beyond container bounds or may overflow. SINGLE-LINE PRESERVATION: By default, if text was originally single-line and new content would cause wrapping, the text will automatically expand its width instead of wrapping (set preserveSingleLine: false to disable).',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of text node' },
        content: { type: 'string', description: 'New text content' },
        fontSize: { type: 'number' },
        fontFamily: { type: 'string', description: 'Font family name (e.g., "Inter", "Roboto")' },
        fontStyle: { type: 'string', description: 'Font style (e.g., "Regular", "Bold", "Thin")' },
        fontWeight: { type: 'string', description: 'Legacy: use fontStyle instead' },
        width: { type: 'number', description: 'Set a new fixed width for text box. Text will wrap to this width.' },
        textAutoResize: { type: 'string', enum: ['WIDTH_AND_HEIGHT', 'HEIGHT', 'NONE', 'TRUNCATE'], description: 'Text resize mode. Use HEIGHT with width for wrapping, WIDTH_AND_HEIGHT to auto-fit content.' },
        preserveSingleLine: { type: 'boolean', description: 'If true (default), single-line text will expand its width instead of wrapping when content is added. Set to false to allow wrapping.' },
        fillColor: {
          type: 'object',
          properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' } },
        },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'delete_node',
    description: 'Delete a node from the Figma file',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of node to delete' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'group_nodes',
    description: 'Group multiple nodes together',
    inputSchema: {
      type: 'object',
      properties: {
        nodeIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs of nodes to group'
        },
        groupName: { type: 'string', description: 'Name for the group' },
      },
      required: ['nodeIds'],
    },
  },

  // SCHEMA-AWARE TOOLS (Generic - works with any app schema)
  {
    name: 'create_screen_from_state',
    description: 'Create a complete screen based on a state definition from your app schema',
    inputSchema: {
      type: 'object',
      properties: {
        stateName: {
          type: 'string',
          description: 'State name from schema (defined in your app-schema.json)'
        },
        screenType: {
          type: 'string',
          description: 'Which screen type in schema (e.g., "home_screen", "onboarding", "settings")'
        },
        baseFrameId: {
          type: 'string',
          description: 'ID of existing frame to use as template (will duplicate and modify)'
        },
        position: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
          description: 'Position for the new frame',
        },
      },
      required: ['stateName'],
    },
  },
  {
    name: 'validate_against_schema',
    description: 'Check if current Figma file has all screens/states defined in your app schema',
    inputSchema: {
      type: 'object',
      properties: {
        schemaSection: {
          type: 'string',
          description: 'Which part of schema to validate (e.g., "states", "flows", "components")'
        },
      },
      required: [],
    },
  },
  {
    name: 'get_schema',
    description: 'Get the loaded app schema to understand your design system, states, flows, and components',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_flow',
    description: 'Create all screens for a flow defined in your schema',
    inputSchema: {
      type: 'object',
      properties: {
        flowName: {
          type: 'string',
          description: 'Name of flow from schema (e.g., "onboarding", "checkout", "signup")'
        },
        startPosition: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
        },
        spacing: {
          type: 'number',
          description: 'Horizontal spacing between screens (default: 100)'
        },
      },
      required: ['flowName'],
    },
  },
];

// Create MCP Server
const server = new Server(
  {
    name: 'figma-editor-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Schema-only tools that don't need plugin
    if (name === 'get_schema') {
      const schema = loadSchema();
      return {
        content: [
          {
            type: 'text',
            text: schema
              ? JSON.stringify(schema, null, 2)
              : 'No schema loaded. Create unloop-schema.json in the MCP server directory.',
          },
        ],
      };
    }

    // URL import - fetch first, then send to plugin
    if (name === 'import_url') {
      const { url, selector, x, y, name: frameName } = args as {
        url: string;
        selector?: string;
        x?: number;
        y?: number;
        name?: string;
      };

      console.error(`[MCP] Fetching URL: ${url}`);

      // Fetch the HTML
      const rawHtml = await fetchURL(url);
      console.error(`[MCP] Fetched ${rawHtml.length} bytes`);

      // Simplify the HTML
      let html = simplifyHTML(rawHtml);
      console.error(`[MCP] Simplified to ${html.length} bytes`);

      // If selector specified, try to extract that section
      if (selector) {
        // Simple extraction (works for id and class)
        const idMatch = selector.match(/^#([\w-]+)$/);
        const classMatch = selector.match(/^\.([\w-]+)$/);

        if (idMatch) {
          const regex = new RegExp(`<[^>]+id=["']${idMatch[1]}["'][^>]*>[\\s\\S]*?<\\/`, 'i');
          const match = html.match(regex);
          if (match) html = match[0];
        } else if (classMatch) {
          const regex = new RegExp(`<[^>]+class=["'][^"']*${classMatch[1]}[^"']*["'][^>]*>[\\s\\S]*?<\\/`, 'i');
          const match = html.match(regex);
          if (match) html = match[0];
        }
      }

      // Limit HTML size to prevent plugin overload
      if (html.length > 50000) {
        html = html.substring(0, 50000);
        console.error('[MCP] HTML truncated to 50KB');
      }

      // Send to plugin as import_html
      const result = await sendToPlugin('import_html', {
        html,
        x: x || 0,
        y: y || 0,
        name: frameName || new URL(url).hostname,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              imported: true,
              url,
              ...(result as object),
            }, null, 2),
          },
        ],
      };
    }

    // All other tools require plugin connection
    const result = await sendToPlugin(name, args as Record<string, unknown>);

    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Handle resource listing (schema as resource)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const schema = loadSchema();
  const appName = schema?.app_name || 'App';

  return {
    resources: schema
      ? [
          {
            uri: 'schema://app',
            name: `${appName} Schema`,
            description: `States, flows, components, and design tokens for ${appName}`,
            mimeType: 'application/json',
          },
        ]
      : [],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri === 'schema://app') {
    const schema = loadSchema();
    return {
      contents: [
        {
          uri: 'schema://app',
          mimeType: 'application/json',
          text: JSON.stringify(schema, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${request.params.uri}`);
});

// Main
async function main() {
  // Start WebSocket server for plugin communication
  startWebSocketServer();

  // Start MCP server on stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[MCP] Figma Editor MCP server running');
  console.error('[MCP] Waiting for Figma plugin connection on port', WS_PORT);
}

main().catch((error) => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});
