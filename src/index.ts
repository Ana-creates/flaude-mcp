#!/usr/bin/env node
/**
 * Figma Editor MCP Server (v2 - Simplified)
 *
 * 4 tools instead of 50+. All design operations go through figma_execute.
 *
 * Architecture:
 * Claude -> MCP Server (stdio) -> WebSocket (9876) -> Figma Plugin -> Figma File
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, '..');

// Configuration
const WS_PORT = 9876;
const REQUEST_TIMEOUT = 30000;
const DEV_MODE = false;

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
let isProxyMode = false;
const pendingRequests = new Map<string, PendingRequest>();
let isAuthenticated = false;
let authenticatedEmail: string | null = null;

// Subscription verification via Supabase (no secrets in package)
const SUPABASE_URL = 'https://lrgwkvmiihatpfiesima.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NCa4zE_gcw-6ns_Cu53yXQ_Y873IfDC';
const SUBSCRIPTION_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const subscriptionCache = new Map<string, { valid: boolean; expiry: number }>();

async function verifySubscription(email: string): Promise<boolean> {
  const normalized = email.toLowerCase().trim();

  // Check cache first
  const cached = subscriptionCache.get(normalized);
  if (cached && Date.now() < cached.expiry) {
    return cached.valid;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/Subscription?email=eq.${encodeURIComponent(normalized)}&status=eq.active&select=currentPeriodEnd&order=currentPeriodEnd.desc&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      console.error(`[MCP] Supabase query failed: ${response.status}`);
      // On API error, allow cached valid users to continue (grace period)
      return cached?.valid ?? false;
    }

    const data = await response.json() as { currentPeriodEnd: string }[];
    let valid = false;

    if (data.length > 0 && data[0].currentPeriodEnd) {
      const periodEnd = new Date(data[0].currentPeriodEnd);
      valid = !isNaN(periodEnd.getTime()) && periodEnd > new Date();
    }

    subscriptionCache.set(normalized, { valid, expiry: Date.now() + SUBSCRIPTION_CACHE_TTL });
    return valid;
  } catch (err) {
    console.error('[MCP] Subscription check failed:', err);
    // Network error — allow cached valid users to continue
    return cached?.valid ?? false;
  }
}

// ============================================================================
// WebSocket Communication
// ============================================================================

function startWebSocketServer(): Promise<WebSocketServer | null> {
  return new Promise((resolve, reject) => {
    const wss = new WebSocketServer({ port: WS_PORT });

    wss.on('listening', () => {
      console.error(`[MCP] WebSocket server started on port ${WS_PORT}`);
      setupServerMode(wss);
      resolve(wss);
    });

    wss.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[MCP] Port ${WS_PORT} already in use - switching to proxy mode`);
        connectAsProxy();
        resolve(null);
      } else {
        console.error('[MCP] WebSocket server error:', error);
        reject(error);
      }
    });
  });
}

function setupServerMode(wss: WebSocketServer) {
  wss.on('connection', (ws) => {
    console.error('[MCP] New connection - waiting for authentication...');

    // Ping/pong to detect dead connections
    let isAlive = true;
    ws.on('pong', () => { isAlive = true; });
    const pingInterval = setInterval(() => {
      if (!isAlive) {
        console.error('[MCP] Connection dead (no pong) - terminating');
        clearInterval(pingInterval);
        ws.terminate();
        return;
      }
      isAlive = false;
      ws.ping();
    }, 30000);

    ws.on('close', () => clearInterval(pingInterval));

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'auth') {
          handleAuthentication(ws, message);
          return;
        }

        // Handle proxy commands before auth check — proxy instances
        // rely on the primary server's auth state, not their own
        if (message.type === 'proxy_command') {
          if (!isAuthenticated) {
            ws.send(JSON.stringify({
              type: 'proxy_error',
              requestId: message.requestId,
              error: 'Figma plugin not authenticated. Open the Flaude plugin and click Connect.',
            }));
            return;
          }
          handleProxyCommand(ws, message);
          return;
        }

        if (!isAuthenticated) {
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Authentication required. Please upgrade to Flaude Pro.',
          }));
          return;
        }

        const pluginMessage = message as PluginMessage;
        if (pluginMessage.requestId && pendingRequests.has(pluginMessage.requestId)) {
          const pending = pendingRequests.get(pluginMessage.requestId)!;
          clearTimeout(pending.timeout);
          pendingRequests.delete(pluginMessage.requestId);

          if (pluginMessage.type === 'error') {
            pending.reject(new Error(pluginMessage.error || 'Unknown plugin error'));
          } else {
            pending.resolve(pluginMessage.data);
          }
        }
      } catch (e) {
        console.error('[MCP] Failed to parse message:', e);
      }
    });

    ws.on('close', () => {
      if (connectedPlugin === ws) {
        console.error('[MCP] Figma plugin disconnected');
        connectedPlugin = null;
        isAuthenticated = false;
        authenticatedEmail = null;

        for (const [id, pending] of pendingRequests) {
          clearTimeout(pending.timeout);
          pending.reject(new Error('Plugin disconnected'));
          pendingRequests.delete(id);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('[MCP] WebSocket error:', error);
    });
  });
}

async function handleAuthentication(ws: WebSocket, message: { type: 'auth'; email?: string; key?: string }) {
  const { email } = message;

  if (DEV_MODE) {
    console.error(`[MCP] DEV MODE: Skipping license validation for ${email || 'unknown'}`);
    isAuthenticated = true;
    authenticatedEmail = email || 'dev@flaude.app';
    connectedPlugin = ws;
    ws.send(JSON.stringify({ type: 'auth_result', success: true, email: authenticatedEmail }));
    return;
  }

  if (!email) {
    ws.send(JSON.stringify({ type: 'auth_result', success: false, error: 'Flaude Pro license required.' }));
    return;
  }

  // Verify subscription against Supabase (no local secrets)
  const hasActiveSubscription = await verifySubscription(email);
  if (!hasActiveSubscription) {
    ws.send(JSON.stringify({ type: 'auth_result', success: false, error: 'No active Flaude Pro subscription found for this email.' }));
    return;
  }

  console.error(`[MCP] Authentication successful for: ${email}`);
  isAuthenticated = true;
  authenticatedEmail = email;
  connectedPlugin = ws;
  ws.send(JSON.stringify({ type: 'auth_result', success: true, email }));
}

async function handleProxyCommand(proxyClient: WebSocket, message: { requestId: string; command: string; params: Record<string, unknown> }) {
  try {
    const result = await sendToPlugin(message.command, message.params);
    proxyClient.send(JSON.stringify({ type: 'proxy_response', requestId: message.requestId, data: result }));
  } catch (error) {
    proxyClient.send(JSON.stringify({ type: 'proxy_error', requestId: message.requestId, error: error instanceof Error ? error.message : String(error) }));
  }
}

function connectAsProxy() {
  isProxyMode = true;
  const ws = new WebSocket(`ws://localhost:${WS_PORT}`);

  ws.on('open', () => {
    console.error('[MCP] Connected to existing MCP server in proxy mode');
    connectedPlugin = ws;
    // In proxy mode, the primary server handles authentication.
    // Mark as authenticated so sendToPlugin() doesn't block commands.
    isAuthenticated = true;
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === 'proxy_response' || message.type === 'proxy_error') {
        const pending = pendingRequests.get(message.requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          pendingRequests.delete(message.requestId);
          if (message.type === 'proxy_error') {
            pending.reject(new Error(message.error || 'Proxy error'));
          } else {
            pending.resolve(message.data);
          }
        }
      }
    } catch (e) {
      console.error('[MCP] Failed to parse proxy response:', e);
    }
  });

  ws.on('close', () => { connectedPlugin = null; });
  ws.on('error', (error) => { console.error('[MCP] Proxy error:', error); });
}

function sendToPlugin(command: string, params: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!isAuthenticated) {
      reject(new Error('Flaude Pro license required.'));
      return;
    }

    if (!connectedPlugin || connectedPlugin.readyState !== WebSocket.OPEN) {
      reject(new Error('Figma plugin not connected. Open the Flaude plugin in Figma and click Connect.'));
      return;
    }

    const requestId = `req_${crypto.randomUUID()}`;

    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error(`Request timed out after ${REQUEST_TIMEOUT}ms`));
    }, REQUEST_TIMEOUT);

    pendingRequests.set(requestId, { resolve, reject, timeout });

    if (isProxyMode) {
      connectedPlugin.send(JSON.stringify({ type: 'proxy_command', requestId, command, params }));
    } else {
      connectedPlugin.send(JSON.stringify({ requestId, command, params }));
    }
  });
}

// ============================================================================
// MCP Server + 4 Tools
// ============================================================================

const SERVER_INSTRUCTIONS = `## Flaude MCP - AI Design Assistant for Figma

You have full access to the Figma Plugin API via figma_execute. Follow these workflows strictly.

### CRITICAL RULE #0 — READ THE DESIGN SYSTEM FIRST
**Before creating ANY new design**, you MUST read the design system file:
\`${path.join(PACKAGE_ROOT, 'DESIGN_SYSTEM.md')}\`

This file contains mandatory rules for typography, colors, spacing, hierarchy, layout patterns, and validation.
Every design you create MUST comply with these rules. They are not suggestions — they are requirements.
If a design personality file exists for the project, also read it from \`design-personalities/\` in the current working directory.

### CRITICAL RULE #1 — ICONS AND COMPONENTS
**NEVER draw icons using shapes, vectors, or paths. ALWAYS import them from the Flaude Components library.**
Every icon in every design MUST come from the library. No exceptions.

**How to import a component:**
1. Read the file: flaude-components.json (in the current working directory)
2. Search for the component by name (e.g. "lock", "arrow", "chevron", "user", "search", "menu")
3. Import it:
\`\`\`javascript
const component = await figma.importComponentByKeyAsync("KEY_FROM_JSON");
const instance = component.createInstance();
parentFrame.appendChild(instance);
instance.resize(24, 24); // Resize as needed
\`\`\`

**Component naming patterns:**
- Icons: "Hicon / Linear / [name]" or "Hicon / Outline / [name]"
- Arrows: "Arrows/arrow/[direction]" or "Arrows/chevron/[direction]"
- Documents: "Documents & Safety/[name]"
- Essentials: "Essentials/[name]"

**If the import fails**, tell the user: "Please enable the Flaude Components library: File → Libraries → Search 'Flaude' → Add to file"
Library URL: https://www.figma.com/community/file/1601415084476940997

### CONSISTENT SCREEN SIZES (CRITICAL)
**Before creating a new screen, ALWAYS check existing screen sizes on the page:**
\`\`\`javascript
const screens = figma.currentPage.children.filter(c => c.type === "FRAME" && c.width >= 390 && c.width <= 430);
if (screens.length > 0) {
  const refWidth = screens[0].width;
  const refHeight = screens[0].height;
  newScreen.resize(refWidth, refHeight);
}
\`\`\`
If no existing screens exist, use standard iPhone 15 size: **393 x 852**.
**NEVER create a screen with different dimensions than existing screens on the same page.**

---

## DESIGN WORKFLOW (MANDATORY — 8 STEPS)

When creating ANY design, follow this exact order. No shortcuts.

### STEP 0 — LOAD DESIGN SYSTEM + SCAN EXISTING CONTEXT
**A.** Read \`${path.join(PACKAGE_ROOT, 'DESIGN_SYSTEM.md')}\` and internalize the type scale, color palette, spacing grid, layout patterns, and anti-patterns.

**B.** If a design personality is active, read it from \`design-personalities/[NAME].md\` in the current working directory
Available: BOLD, MINIMAL, SOFT, EDITORIAL, BRUTALIST — personality overrides default values.

**C.** Run the **Context Scan** from DESIGN_SYSTEM.md section 13 to detect existing fonts, sizes, colors, spacing, and screen dimensions. Match these in your new design — consistency with existing work is critical.

### STEP 1 — DESIGN PLAN (before writing ANY code)
Write out a structured plan:

**A. Layout Structure**
- Which layout pattern applies? (List, Card Feed, Detail, Form, or hybrid)
- What are the major sections from top to bottom?
- What is the visual hierarchy? (What is Level 1/hero? Level 2? Level 3?)
- What is the ONE focal point of this screen?

**B. Design Tokens Selection**
- Background color: (pick from palette)
- Text colors: (pick primary, secondary, tertiary from palette)
- Accent color: (one only, or black default)
- Font sizes: (pick 3-5 from the type scale — no more)
- Spacing values: (pick 3-4 from the spacing scale for this screen)
- Corner radius: (consistent value — 8, 12, or 16)

**C. Element Inventory**
- List EVERY element: status bar, icons, text, cards, images, badges, nav bars
- Note exact styling: border-radius, shadows, gradients, opacity
- List ALL icons needed (will load from components library)
- Note interactive states: active tabs, selected indicators

### STEP 2 — LOAD COMPONENTS
Read flaude-components.json and find keys for ALL icons identified in Step 1.
Also check existing screens on the page for established fonts, colors, and spacing.

### STEP 3 — BUILD SYSTEMATICALLY
Build from top to bottom, outside to inside:
- **FIRST: Position the new screen so it NEVER overlaps existing screens.** Run this BEFORE building anything else:
\\\`\\\`\\\`javascript
const children = figma.currentPage.children;
let maxX = 0;
children.forEach(c => {
  if ('x' in c && 'width' in c) maxX = Math.max(maxX, c.x + c.width);
});
newFrame.x = maxX + 100;
newFrame.y = 0;
\\\`\\\`\\\`
- Start with the phone frame **(matching existing screen dimensions)**
- Add status bar (time "9:41", signal, wifi, battery)
- Build each section completely before moving to the next
- Import EVERY icon from the library
- **Use ONLY values from the design system** — never invent spacing, colors, or font sizes
- **Always use auto-layout** for frames with multiple children
- **Set lineHeight explicitly** on every text node

**Typography implementation (MANDATORY):**
\`\`\`javascript
await figma.loadFontAsync({ family: "Inter", style: "Bold" });
text.fontName = { family: "Inter", style: "Bold" };
text.fontSize = 28;
text.lineHeight = { value: 36, unit: "PIXELS" };
text.letterSpacing = { value: -0.3, unit: "PIXELS" };
text.fills = [{ type: 'SOLID', color: { r: 0.07, g: 0.07, b: 0.09 } }]; // Text Primary
\`\`\`

### STEPS 4-7 — QUALITY LOOP (MANDATORY — REPEAT UNTIL PASSING)

This is an iterative cycle. You MUST complete all steps, and if issues are found, loop back and fix them.

**STEP 4 — SCREENSHOT AND COMPARE**
Take a screenshot with figma_screenshot and visually check:
- Does every element from Step 1 exist?
- Is the visual hierarchy clear? (Can you instantly identify the focal point?)
- Are spacing values consistent and on the 8px grid?
- Do all text elements use sizes from the type scale?
- Is there enough white space? (If the design feels cramped, it IS cramped)
- **Is the screen the same size as other screens on the page?**
- **Does the screen overlap any existing screens?** If yes, reposition it immediately.

**STEP 5 — FIX MISSING DETAILS**
Fix anything found in Step 4. Common things that get missed:
- Status bar icons (signal, wifi, battery)
- Bottom home indicator bar
- Active state indicators (pills, highlights)
- Blur/frosted glass effects
- Proper shadow and elevation
- Correct border-radius values
- Insufficient spacing between sections
- Screen overlapping other screens (reposition with maxX + 100)

**STEP 6 — RUN VALIDATION (MANDATORY — NOT OPTIONAL)**
Read \`${path.join(PACKAGE_ROOT, 'validate.js')}\` and execute it via figma_execute on the screen you built.
It checks: spacing grid, auto-layout, typography scale, font size/weight counts, lineHeight, purple detection, touch targets, button heights.
Returns a score (0-100) and a list of specific errors/warnings.

**If score < 80: You MUST fix every error listed, then go back to STEP 4 (screenshot again) and repeat the loop.**
Do NOT proceed to Step 7 until validation score is 80+.

**STEP 7 — FINAL VERIFICATION SCREENSHOT (NEVER SKIP)**
Take one final screenshot and verify:
- Screen size matches existing screens
- Visual hierarchy is clear (3-4 distinct levels)
- Spacing is consistent and generous
- Colors are from the approved palette only
- Typography uses the type scale only
- All sections are inside named Frames
- No orphaned elements
- **No screens overlap each other**
If ANY issue is found, fix it, take another screenshot, and verify again. Max 3 iterations.
**NEVER say "done" without a final verification screenshot showing the completed design.**

---

## DESIGN INTELLIGENCE — KEY RULES (Inline for immediate access)

### Typography (80% of Design Quality)
- **Type scale**: 32, 28, 22, 18, 16, 14, 12, 11px ONLY — never invent sizes
- **Always set lineHeight**: heading = size * 1.25, body = size * 1.5
- **Always set letterSpacing**: negative for headings (>20px), positive for small text (<12px)
- **Max 3 weights**: 700 (bold), 500/600 (medium), 400 (regular)
- **Never below 12px** on mobile
- **De-emphasize with color, not size** — secondary text stays 14px but uses lighter color

### Color (60-30-10 Rule)
- **60% neutral** (white/near-white), **30% secondary** (borders, subtle fills), **10% accent**
- **Light mode text**: Primary \`{r:0.07, g:0.07, b:0.09}\`, Secondary \`{r:0.4, g:0.4, b:0.44}\`, Tertiary \`{r:0.6, g:0.6, b:0.63}\`
- **Dark mode text**: Primary \`{r:1, g:1, b:1}\`, Secondary \`{r:0.6, g:0.6, b:0.63}\`
- **Default button**: Black \`{r:0.1, g:0.1, b:0.1}\` with white text
- **NEVER**: purple/pink gradients, pure black #000 for text, more than 3 hues, rainbow accents

### Spacing (8px Grid — Hard Constraint)
- **Allowed values ONLY**: 4, 8, 12, 16, 20, 24, 32, 48, 64px
- **NEVER**: 10, 15, 18, 25, 30px or any off-grid value
- **Screen padding**: 16 or 20px horizontal, consistent across all screens
- **Card padding**: 16, 20, or 24px — same for all cards on a screen
- **Between sections**: 32-48px
- **Related items get LESS space** than unrelated items (Gestalt proximity)

### Hierarchy (Every Screen Needs This)
- **ONE focal point per screen** — if everything is equal, the design fails
- **3-4 hierarchy levels**: Hero (biggest/boldest) → Supporting → Content → Meta
- **Section title closer to its content below** than to content above (top margin = 2x bottom)

### Anti-Patterns (NEVER DO)
- Absolute positioning when auto-layout works
- More than 5 font sizes on one screen
- Random spacing values not on the 8px grid
- Purple/pink gradient buttons
- Flat hierarchy (everything same size/weight)
- Center-aligning body text longer than 3 lines
- Missing lineHeight on text nodes
- Oversized shadows (subtle = professional)

---

## FIGMA API REFERENCE

### SCREEN FRAME RULES (CRITICAL)
Phone screen frames must NEVER have:
- \`cornerRadius\` — always set to \`0\`
- \`strokes\` — never add strokes to screen frames
- \`effects\` — NEVER add shadows or blur to the outermost screen frame

\`\`\`javascript
const screen = figma.createFrame();
screen.name = "Screen Name";
screen.resize(393, 852);
screen.cornerRadius = 0;
screen.effects = [];
screen.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
screen.clipsContent = true;
\`\`\`

### TAB BAR / NAVIGATION BAR RULES (CRITICAL)
\`\`\`javascript
const tabBar = figma.createFrame();
tabBar.name = "Tab Bar";
tabBar.resize(screenWidth, 83); // 49px bar + 34px home indicator
tabBar.layoutMode = 'VERTICAL';
tabBar.primaryAxisAlignItems = 'CENTER';
tabBar.counterAxisAlignItems = 'CENTER';
tabBar.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

const iconRow = figma.createFrame();
iconRow.name = "Tab Icons";
iconRow.layoutMode = 'HORIZONTAL';
iconRow.resize(screenWidth, 49);
iconRow.counterAxisAlignItems = 'CENTER';
iconRow.primaryAxisAlignItems = 'SPACE_BETWEEN';
iconRow.paddingLeft = iconRow.paddingRight = 32;
iconRow.fills = [];
\`\`\`

**Tab bar rules:**
- MUST be full screen width
- Use \`SPACE_BETWEEN\` to spread icons evenly
- Each icon touch target: at least 44x44px

### BUTTON RULES
- Minimum height: 48px, minimum width: 120px for text buttons
- Buttons must fit WITHIN their parent frame
- Use \`layoutSizingHorizontal = 'FILL'\` for full-width buttons
- Default color: **black** \`{r:0.1, g:0.1, b:0.1}\` with white text
- NEVER default to purple, pink, or gradient

### ELEMENT OVERFLOW
\`\`\`javascript
// Use auto-layout to prevent overflow
// Prefer layoutSizingHorizontal = 'FILL' over fixed widths
\`\`\`

### LAYER STRUCTURE (MANDATORY)
Every screen must have a clean hierarchy. NEVER leave loose elements as direct children.
\`\`\`
Screen Frame
├── Status Bar (Frame)
├── Header (Frame)
├── Content Sections (Frame each)
│   ├── Section Title
│   └── Section Content
├── Tab Bar (Frame)
└── Home Indicator
\`\`\`

### COMPONENT PLACEMENT
Before creating ANY element:
1. Check if a parent Frame exists
2. If not, create one first
3. Place all elements INSIDE containers

### SCREEN PLACEMENT — NEVER OVERLAP (CRITICAL)
**Every new screen frame MUST be placed to the right of ALL existing frames with a 100px gap.**
This is NON-NEGOTIABLE. Overlapping screens is one of the most common and most disruptive mistakes.
You MUST run this code IMMEDIATELY after creating a new screen frame, BEFORE adding any children:
\`\`\`javascript
const children = figma.currentPage.children;
let maxX = 0;
children.forEach(c => {
  if ('x' in c && 'width' in c) maxX = Math.max(maxX, c.x + c.width);
});
newFrame.x = maxX + 100;
newFrame.y = 0;
\`\`\`
**Verify after completion:** In Step 7, confirm no screens overlap by checking that each frame's x position is >= previous frame's (x + width).

### EFFECTS — EXACT SYNTAX

**Drop Shadow** (all properties required):
\`\`\`javascript
node.effects = [
  {
    type: "DROP_SHADOW",
    color: { r: 0, g: 0, b: 0, a: 0.12 },
    offset: { x: 0, y: 4 },
    radius: 16,
    spread: -2,
    visible: true,
    blendMode: "NORMAL",
    showShadowBehindNode: false
  },
  {
    type: "DROP_SHADOW",
    color: { r: 0, g: 0, b: 0, a: 0.06 },
    offset: { x: 0, y: 1 },
    radius: 4,
    spread: 0,
    visible: true,
    blendMode: "NORMAL",
    showShadowBehindNode: false
  }
];
\`\`\`

**Shadow rules:**
- Set \`showShadowBehindNode: false\` when parent has \`clipsContent: true\`
- Never use alpha below \`0.06\` — invisible
- Use TWO shadows: ambient (soft) + contact (tight)
- Keep shadows SUBTLE — professional designs hint at elevation, not scream it

**Frosted Glass / Glassmorphism:**
\`\`\`javascript
const glass = figma.createFrame(); // MUST be a Frame, not Rectangle
glass.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 }, opacity: 0.4 }];
glass.effects = [
  { type: "BACKGROUND_BLUR", radius: 40, visible: true },
  { type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.08 }, offset: { x: 0, y: 2 }, radius: 8, spread: 0, visible: true, blendMode: "NORMAL" }
];
glass.cornerRadius = 16;
glass.clipsContent = true;
\`\`\`

**Blur rules:**
- BACKGROUND_BLUR only works on Frames, not Rectangles
- Fill MUST have opacity < 1.0 for blur to show through
- Must be layered OVER other content

**Inner Shadow:**
\`\`\`javascript
node.effects = [{
  type: "INNER_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.15 },
  offset: { x: 0, y: 2 }, radius: 4, spread: 0, visible: true, blendMode: "NORMAL"
}];
\`\`\`

**Common effect mistakes:**
- Forgetting \`blendMode: "NORMAL"\` → shadow fails silently
- Forgetting \`visible: true\` → effect hidden
- Opaque fill with BACKGROUND_BLUR → blur invisible
- Color values 0-255 instead of 0-1
- BACKGROUND_BLUR on Rectangle → won't render

### AUTO-LAYOUT (ALWAYS USE)
\`\`\`javascript
frame.layoutMode = 'VERTICAL';
frame.primaryAxisAlignItems = 'CENTER';
frame.counterAxisAlignItems = 'CENTER';
frame.itemSpacing = 16; // MUST be from spacing scale
frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 24;
\`\`\`

### COLOR FORMAT
\`\`\`javascript
node.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]; // Values 0-1, not 0-255
\`\`\`

---

Remember: Your job is not done until you've run validation and visually verified the result looks correct.
A professionally designed screen has: consistent spacing on the 8px grid, clear 3-4 level hierarchy, limited color palette, and generous white space.`;

const server = new Server(
  { name: 'flaude-mcp', version: '2.0.0' },
  {
    capabilities: { tools: {} },
    instructions: SERVER_INSTRUCTIONS,
  }
);

const TOOLS = [
  {
    name: 'figma_execute',
    description: `Execute JavaScript code in the Figma plugin context with full access to the \`figma\` API.
The code runs as an async function, so you can use \`await\`. Return a value to get it back.

Examples:
- Search nodes: \`return figma.currentPage.findAll(n => n.name.includes("Button")).map(n => ({id: n.id, name: n.name, type: n.type}))\`
- Get node details: \`const n = figma.getNodeById("1:23"); return {name: n.name, width: n.width, height: n.height, type: n.type}\`
- Create frame: \`const f = figma.createFrame(); f.resize(400, 300); f.name = "Card"; return {id: f.id}\`
- Modify node: \`const n = figma.getNodeById("1:23"); n.fills = [{type: "SOLID", color: {r: 1, g: 0, b: 0}}]; return "done"\`
- Add effects: \`const n = figma.getNodeById("1:23"); n.effects = [{type: "DROP_SHADOW", offset: {x:0,y:4}, radius: 8, color: {r:0,g:0,b:0,a:0.25}, visible: true, blendMode: "NORMAL", spread: 0}]; return "done"\`

IMPORTANT: Always return plain serializable data (strings, numbers, arrays, objects). Never return Figma node objects directly.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        code: {
          type: 'string',
          description: 'JavaScript code to execute. Has access to `figma` global. Async context (await works). Return a value to get results.',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'figma_screenshot',
    description: 'Capture a screenshot of a specific node or the current selection as a base64 PNG. Use to visually verify changes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        nodeId: { type: 'string', description: 'Node ID to screenshot. If omitted, captures the current selection.' },
        scale: { type: 'number', description: 'Export scale (default: 1). Use 2 for retina.' },
      },
    },
  },
  {
    name: 'figma_status',
    description: 'Check connection status, current page, selection, and document info.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'figma_navigate',
    description: 'Navigate to a specific node or page. Scrolls and zooms the viewport.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        nodeId: { type: 'string', description: 'Node ID to navigate to and zoom into view.' },
        pageId: { type: 'string', description: 'Page ID to switch to.' },
        pageName: { type: 'string', description: 'Page name to switch to (alternative to pageId).' },
      },
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'figma_execute': {
        const { code } = args as { code: string };
        if (!code || typeof code !== 'string') {
          throw new Error('`code` parameter is required');
        }
        const result = await sendToPlugin('execute', { code });
        return {
          content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
        };
      }

      case 'figma_screenshot': {
        const { nodeId, scale } = (args || {}) as { nodeId?: string; scale?: number };
        const result = await sendToPlugin('screenshot', { nodeId, scale: scale || 1 }) as { imageBase64?: string; [key: string]: unknown };
        if (result?.imageBase64) {
          return {
            content: [{
              type: 'image',
              data: result.imageBase64,
              mimeType: 'image/png',
            }],
          };
        }
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'figma_status': {
        const connected = connectedPlugin !== null && connectedPlugin.readyState === WebSocket.OPEN;
        if (!connected) {
          return {
            content: [{ type: 'text', text: JSON.stringify({
              connected: false,
              authenticated: isAuthenticated,
              email: authenticatedEmail,
              message: 'Figma plugin not connected. Open the Flaude plugin in Figma and click Connect.',
            }, null, 2) }],
          };
        }
        const result = await sendToPlugin('get_status', {});
        return {
          content: [{ type: 'text', text: JSON.stringify({
            connected: true,
            authenticated: isAuthenticated,
            email: authenticatedEmail,
            ...result as object,
          }, null, 2) }],
        };
      }

      case 'figma_navigate': {
        const { nodeId, pageId, pageName } = (args || {}) as { nodeId?: string; pageId?: string; pageName?: string };
        const result = await sendToPlugin('navigate', { nodeId, pageId, pageName });
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
});

// Main
async function main() {
  await startWebSocketServer();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[MCP] Flaude MCP server running (v2 - 4 tools)');
  if (isProxyMode) {
    console.error('[MCP] Running in PROXY mode');
  } else {
    console.error('[MCP] Running in SERVER mode - waiting for Figma plugin on port', WS_PORT);
  }
}

// Graceful shutdown
function shutdown() {
  console.error('[MCP] Shutting down...');
  for (const [id, pending] of pendingRequests) {
    clearTimeout(pending.timeout);
    pending.reject(new Error('Server shutting down'));
    pendingRequests.delete(id);
  }
  if (connectedPlugin) {
    connectedPlugin.close();
    connectedPlugin = null;
  }
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

main().catch((error) => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});
