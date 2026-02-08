# Figma Editor MCP Server

An MCP (Model Context Protocol) server that enables Claude to **read AND write** to Figma files. Works with any app - just define your schema.

> **Pro Feature**: This MCP integration requires a [Flaude Pro](https://flaude.com/upgrade) subscription. Free users can use the Flaude plugin directly in Figma, but Claude Code integration is Pro-only.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Claude Code   │────▶│   MCP Server    │◀───▶│  Figma Plugin   │
│   (or Agent)    │     │   (WebSocket)   │     │  (FigmaClaude)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                       │
         │                      │                       │
    "create the              queues &               executes
    missing screens"         routes                 via Plugin API
```

## Quick Start

### 1. Install the MCP Server

```bash
cd figma-editor-mcp
npm install
npm run build
```

### 2. Configure Claude Code to use the MCP

Add to your Claude Code MCP settings (`~/.claude/mcp_servers.json` or via `claude mcp add`):

```json
{
  "figma-editor": {
    "command": "node",
    "args": ["/path/to/figma-editor-mcp/dist/index.js"],
    "env": {}
  }
}
```

Or use the CLI:

```bash
claude mcp add figma-editor node /path/to/figma-editor-mcp/dist/index.js
```

### 3. Open Flaude Plugin in Figma

1. Open your Figma file
2. Run the Flaude plugin
3. **Activate your Pro license** (Settings → Enter email + license key)
4. Go to Settings → Claude Code section
5. Click "Connect"

> **Note**: The Connect button only appears for Pro users. Free users will see an upgrade prompt.

### 4. Start Using!

Now you can tell Claude:

```
"Create a frame called 'Home - Crisis Support' with a hero message
 that says 'I notice things feel heavy right now.'"
```

And it will actually create it in Figma!

---

## Available Tools

### Read Tools

| Tool | Description |
|------|-------------|
| `get_file_structure` | Get all pages and top-level frames |
| `get_selection` | Get currently selected nodes |
| `get_node_details` | Get details of a specific node by ID |
| `search_nodes` | Search for nodes by name pattern |

### Write Tools

| Tool | Description |
|------|-------------|
| `create_frame` | Create a new frame |
| `create_text` | Create a text node |
| `create_rectangle` | Create a rectangle shape |
| `duplicate_node` | Duplicate an existing node |
| `modify_node` | Change properties of a node |
| `update_text` | Update text content/style |
| `delete_node` | Delete a node |
| `group_nodes` | Group multiple nodes |

### Schema-Aware Tools

| Tool | Description |
|------|-------------|
| `get_schema` | Get your app schema |
| `create_screen_from_state` | Create screen based on schema state |
| `validate_against_schema` | Check if design matches schema |
| `create_flow` | Create all screens for a flow |

---

## App Schema

The MCP server loads `app-schema.json` from its working directory. This tells Claude about your app's structure.

### Example Schema

```json
{
  "app_name": "MyApp",
  "domain": "fitness",

  "states": {
    "home_screen": [
      {
        "name": "default",
        "content": {
          "hero": "Welcome back!",
          "subtext": "Ready for today's workout?"
        }
      },
      {
        "name": "streak_celebration",
        "condition": "streak >= 7",
        "content": {
          "hero": "7 days strong!",
          "subtext": "You're building a habit."
        }
      }
    ]
  },

  "flows": {
    "onboarding": {
      "steps": ["welcome", "goals", "schedule", "ready"]
    }
  },

  "design_tokens": {
    "colors": {
      "primary": "#FF5722",
      "background": "#FFFFFF"
    }
  }
}
```

See `examples/unloop-schema.json` for a comprehensive example.

---

## Usage Examples

### Create Missing Screens

```
Claude, check my home screen against the schema and create
any missing state variants.
```

### Validate Design

```
Validate my onboarding flow against the schema.
Are all steps present?
```

### Bulk Edit

```
Find all text nodes containing "Sign Up" and change them to "Get Started"
```

### Create from Schema

```
Create screens for the "checkout" flow defined in my schema,
starting at x=2000.
```

---

## Development

### Run in Dev Mode

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Test Connection

With the MCP server running:

1. Open Figma with FigmaClaude plugin
2. Connect to MCP server
3. In Claude Code: `Use the figma-editor tool to get the file structure`

---

## Troubleshooting

### "Figma plugin not connected"

- Make sure FigmaClaude plugin is open in Figma
- Click "Connect" in the MCP Connection section of plugin settings
- Check that MCP server is running on port 9876

### "Request timed out"

- Some operations (like loading fonts) take time
- Default timeout is 30 seconds
- For bulk operations, wait for completion

### Schema not loading

- File must be named `app-schema.json` or `schema.json`
- Must be valid JSON
- Check console for parse errors

---

## License

MIT
