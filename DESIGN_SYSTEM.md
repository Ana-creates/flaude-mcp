# Flaude Design System — Mandatory Rules for AI Design Generation

> These are NOT suggestions. They are hard constraints. Every value, rule, and pattern below MUST be followed exactly when creating or modifying Figma designs. Violating these rules produces amateur-looking output.

---

## 1. TYPOGRAPHY SYSTEM

Typography is responsible for ~80% of a UI's visual quality. Bad type = bad design, period.

### Type Scale (Mobile — 393px width)

Use ONLY these sizes. Never invent intermediate values.

| Role              | Size | Weight          | Line Height | Letter Spacing | Style       |
|-------------------|------|-----------------|-------------|----------------|-------------|
| Display           | 32px | 700 (Bold)      | 40px        | -0.5px         | Sentence    |
| H1                | 28px | 700 (Bold)      | 36px        | -0.3px         | Sentence    |
| H2                | 22px | 600 (Semi Bold) | 28px        | -0.2px         | Sentence    |
| H3                | 18px | 600 (Semi Bold) | 24px        | 0px            | Sentence    |
| Body Large        | 16px | 400 (Regular)   | 24px        | 0px            | Sentence    |
| Body              | 14px | 400 (Regular)   | 20px        | 0.1px          | Sentence    |
| Caption           | 12px | 400 (Regular)   | 16px        | 0.2px          | Sentence    |
| Overline / Label  | 11px | 600 (Semi Bold) | 16px        | 0.8px          | UPPERCASE   |

### Typography Rules

1. **Max 4-5 distinct font sizes per screen** — if you need more, the hierarchy is broken
2. **Never go below 12px** on mobile — it's unreadable
3. **Always set lineHeight explicitly** — Figma defaults are wrong
4. **Headings must be at least 4px larger** than the text they head
5. **Use weight contrast (700 vs 400)** more than size contrast for subtlety
6. **Large text (>20px): negative letter spacing** — tightens headings
7. **Small text (<12px): positive letter spacing** — aids readability
8. **ALL-CAPS text MUST have +0.5 to +1.0px letter spacing**
9. **Max 3 font weights per screen**: typically 700, 500, 400
10. **De-emphasize with lighter color, NOT smaller size** — keep body text at 14-16px

### Font Implementation

```javascript
const text = figma.createText();
await figma.loadFontAsync({ family: "Inter", style: "Bold" });
text.fontName = { family: "Inter", style: "Bold" };
text.fontSize = 28;
text.lineHeight = { value: 36, unit: "PIXELS" };
text.letterSpacing = { value: -0.3, unit: "PIXELS" };
```

### Default Font

Use **"Inter"** unless existing screens use a different font — then match it.

---

## 2. COLOR SYSTEM

### The 60-30-10 Rule (Mandatory)

- **60%** — Background/neutral (white, near-white, light gray)
- **30%** — Secondary (borders, cards, secondary text)
- **10%** — Accent/brand (CTAs, active states, key highlights)

### Light Mode Palette

| Token             | Figma Color                                    | Hex     | Usage                        |
|-------------------|------------------------------------------------|---------|------------------------------|
| Background        | `{r: 1.0,  g: 1.0,  b: 1.0}`                 | #FFFFFF | Page background              |
| Surface           | `{r: 0.97, g: 0.97, b: 0.98}`                 | #F8F8FA | Cards, elevated containers   |
| Surface Elevated  | `{r: 1.0,  g: 1.0,  b: 1.0}` + shadow        | #FFFFFF | Floating cards, modals       |
| Border            | `{r: 0.9,  g: 0.9,  b: 0.92}`                 | #E6E6EB | Dividers, card borders       |
| Border Subtle     | `{r: 0.94, g: 0.94, b: 0.96}`                 | #F0F0F5 | Subtle separators            |
| Text Primary      | `{r: 0.07, g: 0.07, b: 0.09}`                 | #121217 | Headlines, body text         |
| Text Secondary    | `{r: 0.4,  g: 0.4,  b: 0.44}`                 | #666670 | Subtitles, metadata          |
| Text Tertiary     | `{r: 0.6,  g: 0.6,  b: 0.63}`                 | #9999A1 | Hints, placeholders          |
| Text Disabled     | `{r: 0.75, g: 0.75, b: 0.77}`                 | #BFBFC4 | Disabled states              |

### Dark Mode Palette

| Token             | Figma Color                                    | Hex     | Usage                        |
|-------------------|------------------------------------------------|---------|------------------------------|
| Background        | `{r: 0.0,  g: 0.0,  b: 0.0}`                 | #000000 | Page background              |
| Surface           | `{r: 0.11, g: 0.11, b: 0.12}`                 | #1C1C1E | Cards, containers            |
| Surface Elevated  | `{r: 0.17, g: 0.17, b: 0.18}`                 | #2C2C2E | Elevated cards, modals       |
| Border            | `{r: 0.23, g: 0.23, b: 0.25}`                 | #3A3A40 | Dividers, card borders       |
| Text Primary      | `{r: 1.0,  g: 1.0,  b: 1.0}`                 | #FFFFFF | Headlines, body text         |
| Text Secondary    | `{r: 0.6,  g: 0.6,  b: 0.63}`                 | #9999A1 | Subtitles, metadata          |
| Text Tertiary     | `{r: 0.4,  g: 0.4,  b: 0.44}`                 | #666670 | Hints, placeholders          |

### Accent Color Rules

- **ONE primary accent per design** — used sparingly (10% of screen area max)
- If user hasn't specified: default to **black** `{r: 0.1, g: 0.1, b: 0.1}` for buttons
- NEVER use more than 2 accent colors on one screen
- NEVER invent gradient buttons unless the reference explicitly shows them

### Semantic Colors

| Purpose  | Figma Color                               | Hex     |
|----------|-------------------------------------------|---------|
| Success  | `{r: 0.2,  g: 0.78, b: 0.35}`           | #34C759 |
| Error    | `{r: 1.0,  g: 0.23, b: 0.19}`           | #FF3B30 |
| Warning  | `{r: 1.0,  g: 0.58, b: 0.0}`            | #FF9500 |
| Info     | `{r: 0.0,  g: 0.48, b: 1.0}`            | #007AFF |

### Color Anti-Patterns (NEVER DO)

- NEVER use pure black `{r:0, g:0, b:0}` for text — use `{r: 0.07, g: 0.07, b: 0.09}` instead
- NEVER use light gray text on white for important content — 4.5:1 contrast minimum
- NEVER use colored text on colored backgrounds without checking contrast
- NEVER use purple, pink, or purple-pink gradients for buttons
- NEVER use more than 3 distinct hues on one screen (neutrals don't count)
- NEVER use random colors — every color must come from this palette or the user's brand

---

## 3. SPACING SYSTEM (8px Grid)

### Spacing Scale — ONLY Use These Values

| Token  | Value | Usage                                                    |
|--------|-------|----------------------------------------------------------|
| 2xs    | 4px   | Between icon and its label, inline related elements      |
| xs     | 8px   | Between list items, between lines of related text        |
| sm     | 12px  | Between form label and input, small card internal gaps   |
| md     | 16px  | Between unrelated elements in a section, screen margins  |
| lg     | 20px  | Screen horizontal padding (alternative), card padding    |
| xl     | 24px  | Between sections within a card, generous card padding    |
| 2xl    | 32px  | Between distinct screen sections                         |
| 3xl    | 48px  | Between major page sections                              |
| 4xl    | 64px  | Top padding below header, dramatic separations           |

### Spacing Rules

1. **NEVER use values not on this scale** — no 10px, 15px, 18px, 25px, 30px
2. **Internal spacing < external spacing** — content padding inside a card must be less than the gap between cards
3. **Related items = less space; unrelated = more space** — Gestalt proximity
4. **Consistent padding on all sides** — don't mix 16px left with 24px right
5. **Section title must be closer to its content below than to content above** — top margin 2x bottom margin
6. **When in doubt, add MORE space** — crowded designs always look worse than spacious ones

### Screen Padding

- Horizontal (left/right): **16px** or **20px** — be consistent across ALL screens
- Top (below status bar): **8-16px**
- Bottom (above tab bar): **16px**

### Card Padding

- Internal: **16px** (compact) or **20px** (standard) or **24px** (spacious)
- All cards on the same screen MUST use the same padding

---

## 4. VISUAL HIERARCHY

### How to Create Hierarchy (Use at Least 2 Together)

1. **Size** — larger = more important
2. **Weight** — bolder = more important
3. **Color** — darker/accent = more important
4. **Spacing** — more space around = more important
5. **Position** — top/center = more important

### Hierarchy Levels (Aim for 3-4 Per Screen)

| Level | What                    | Treatment                                        |
|-------|-------------------------|--------------------------------------------------|
| 1     | HERO — primary focus    | Largest text, boldest weight, accent or prominent position |
| 2     | SUPPORTING — sections   | Medium text, semi-bold, primary text color        |
| 3     | CONTENT — body          | Standard text, regular weight, primary/secondary color |
| 4     | META — timestamps, etc  | Smallest text, regular weight, tertiary color     |

### Focal Point Rule

Every screen MUST have ONE clear focal point — the first thing the eye goes to.
- Home screen: the main CTA or featured content
- Detail screen: the title or hero image
- Form: the primary action button
- **If everything has equal weight, the design fails**

### Grouping (Gestalt Proximity)

- Elements that belong together MUST be closer to each other than to unrelated elements
- A section title must be closer to its content BELOW than to content ABOVE
- In practice: `marginTop` of a section title = 2x its `marginBottom`

### De-emphasis Techniques

- Use lighter text color (not smaller size) for metadata
- Use thinner/no borders for less important containers
- Push less important content toward the bottom
- Use lighter background tints instead of prominent cards for secondary content

---

## 5. LAYOUT PATTERNS (Mobile)

### Pattern 1: List Screen (Settings, Messages, Notifications)

```
Screen (393 x 852)
├── Status Bar (54px)
├── Header (56px) — title left-aligned, optional right action
├── Search Bar (optional, 48px + 16px vertical padding)
├── Content Area (scrollable, FILL remaining)
│   ├── Section Header (32px, with overline style)
│   ├── List Item (60-72px each)
│   │   ├── Left: Avatar/Icon (40-48px)
│   │   ├── Center: Title + Subtitle (FILL)
│   │   └── Right: Accessory (chevron, toggle, badge)
│   └── ... more items
├── Tab Bar (49px content + 34px home indicator)
└── Home Indicator
```

### Pattern 2: Card Feed (Home, Discover, Social)

```
Screen
├── Status Bar
├── Header — title + profile avatar + action icons
├── Horizontal Scroll Section(s)
│   ├── Section Title + "See All" link
│   └── Horizontal card row (card width: 65-75% screen width)
├── Vertical Card List
│   └── Full-width cards (image + title + meta)
├── Tab Bar
└── Home Indicator
```

### Pattern 3: Detail Screen (Product, Profile, Article)

```
Screen
├── Status Bar
├── Hero Image (40-50% of screen height)
├── Content Area (overlap hero by 16-24px, rounded top corners)
│   ├── Title + metadata
│   ├── Action buttons row
│   ├── Description body text
│   └── Related content section
├── Bottom CTA Bar (80-96px, fixed at bottom)
└── Home Indicator
```

### Pattern 4: Form Screen (Login, Signup, Checkout)

```
Screen
├── Status Bar
├── Header with back button
├── Form Content (top-aligned, generous top padding)
│   ├── Title + subtitle instruction
│   ├── Input fields (48-56px each, 12-16px gaps)
│   ├── Helper text / error messages
│   └── Secondary actions (Forgot password?, etc.)
├── Primary CTA Button (full width, bottom-anchored, 16-24px margin)
└── Home Indicator
```

### Alignment Rules

- ALL content aligns to the same left margin (16px or 20px)
- Cards, text, buttons, headers — all start at the same X position
- Right edges should also align (same right margin)
- **Center-aligned text ONLY for**: page titles in centered layouts, empty states, modal content
- **Left-align everything else** — left-aligned text is faster to scan

---

## 6. COMPOSITION AND WHITE SPACE

### Content Density

- Mobile: max **5-8 distinct content items** visible above the fold
- If you can't see background between elements, the design is TOO DENSE
- Every card, section, and group needs breathing room

### White Space Rules

- More white space = more premium/polished feel
- Amateurs always use too little space — when in doubt, add MORE
- Full-width elements (hero images, buttons) provide visual anchors — use 1-2 per screen

### Scroll Cue

- At least one element should be partially cut off at the bottom to signal scrollability

### Content Rhythm

- Alternate between element types: text → cards → image → text
- Avoid long runs (10+) of identical elements with no visual break
- Use section dividers or spacing changes to create natural pauses

---

## 7. iOS PLATFORM CONVENTIONS (Default)

### Status Bar
- Height: **54px** (iPhone 14+ Dynamic Island) or **47px** (older notch)
- Content: Time (left), Dynamic Island (center), Signal + WiFi + Battery (right)
- **Always include — never skip**

### Navigation
- **Tab bar at bottom** (up to 5 items) — NOT hamburger menu
- Back: left-pointing chevron + "Back" or parent name, top-left
- Nav bar content area: **44px** height
- Large titles: **34px** bold, left-aligned

### Bottom Safe Area
- Home indicator bar: **34px**
- Tab bar: 49px content + 34px indicator = **83px** total

### iOS Patterns
- Sheets (modal): rounded top corners (12px), drag handle centered
- Switches for on/off (not checkboxes)
- Segmented controls for filtering within a screen

### iOS Type Scale Reference

| iOS Name      | Size  | Weight    |
|---------------|-------|-----------|
| Large Title   | 34px  | Bold      |
| Title 1       | 28px  | Bold      |
| Title 2       | 22px  | Bold      |
| Title 3       | 20px  | Semi Bold |
| Headline      | 17px  | Semi Bold |
| Body          | 17px  | Regular   |
| Callout       | 16px  | Regular   |
| Subhead       | 15px  | Regular   |
| Footnote      | 13px  | Regular   |
| Caption 1     | 12px  | Regular   |
| Caption 2     | 11px  | Regular   |

---

## 8. COMPONENT STATES

### Buttons

| State    | Treatment                                                    |
|----------|--------------------------------------------------------------|
| Default  | Full color fill, white text                                  |
| Pressed  | 10% darker fill                                              |
| Disabled | 40% opacity OR gray fill `{r:0.88}` with gray text `{r:0.6}`|

### Input Fields

| State   | Treatment                                                     |
|---------|---------------------------------------------------------------|
| Empty   | Light border `{r:0.88}`, placeholder in tertiary color       |
| Focused | Accent-color border (2px), primary text                      |
| Filled  | Dark border, primary text color                               |
| Error   | Red border, red helper text below, red icon                   |

### Tabs / Navigation

| State    | Treatment                                                    |
|----------|--------------------------------------------------------------|
| Active   | Accent color icon + label, OR bold text + indicator          |
| Inactive | Gray icon + label `{r:0.6}`                                 |

---

## 9. CONTENT AND PLACEHOLDER TEXT

### Text Rules

- **NEVER use "Lorem ipsum"** — always use realistic English text
- Names: "Sarah Chen", "Alex Morgan" (not "User 1" or "John Doe")
- Titles: Write believable titles for the domain
- Dates: Relative formats — "2h ago", "Yesterday", "Mar 15"
- Status bar time: **"9:41"** (Apple convention)

### Number Formatting

- Currency: "$1,234.56" (with comma separator)
- Counts: "1.2K" for thousands, "3.4M" for millions
- Ratings: "4.8" with star icon

### Image Placeholders

- Use colored rectangles with muted fill: `{r: 0.93, g: 0.93, b: 0.95}`
- Profile avatars: 1:1 circle
- Hero images: 16:9 or 4:3
- Thumbnails: 1:1 or 3:4

---

## 10. ANTI-PATTERNS (NEVER DO THESE)

### Layout
- Absolute positioning when auto-layout works
- Elements without parent containers (orphaned on canvas)
- Inconsistent left margins across elements on the same screen
- Center-aligning body text longer than 3 lines

### Typography
- More than 5 font sizes on one screen
- Body text smaller than 14px on mobile
- Missing lineHeight (Figma defaults are wrong)
- Headings barely larger than body — must be 4px+ difference
- Using too many font weights (max 3)

### Color
- Rainbow of unrelated accent colors
- Purple/pink gradient buttons (universal sign of AI-generated UI)
- Pure black #000000 for text (use #121217)
- Light gray text on white for important content
- Colored text on colored backgrounds

### Spacing
- Arbitrary spacing (13px, 17px, 23px) instead of grid values
- Elements touching or nearly touching container edges
- Same spacing between related and unrelated items
- No visible breathing room between sections

### Visual
- Oversized drop shadows (subtle = professional)
- Mixed icon styles / different stroke weights
- Everything the same visual weight (flat hierarchy)
- Centered text everywhere (makes scanning impossible)

---

## 11. QUALITY BENCHMARKS

### What Professional Apps Look Like (aim for this level)

**Apple Health / Fitness** — Clean typography, generous spacing, subtle colors
**Airbnb** — Warm, image-forward cards, clear hierarchy
**Linear** — Minimal, high-contrast, exceptional typography
**Stripe** — Precise alignment, professional type scale, elegant data
**Revolut** — Bold cards, dark themes done right, clear navigation

### What Makes Them Professional

1. Consistent spacing — every measurement is deliberate, on the 8px grid
2. Limited color palette — 2-3 colors max, rest is neutrals
3. Typography contrast — clear size/weight difference between hierarchy levels
4. Generous padding — nothing feels cramped
5. Subtle shadows — elevation is hinted at, not screamed
6. Icon consistency — same style, same size, same stroke weight

### What Makes AI Designs Look Amateur

1. Random spacing — 17px here, 23px there, no system
2. Too many colors — rainbow of unrelated accents
3. Flat hierarchy — everything the same size and weight
4. Cramped layouts — elements touching edges
5. Oversized shadows — 2005-era drop shadows
6. Inconsistent icons — mixed styles, weights, sizes
7. Purple/pink gradients — the hallmark of AI-generated UI
8. Centered text everywhere — impossible to scan

---

## 12. DESIGN PERSONALITY SYSTEM

Before creating designs, check if a design personality has been selected. Personality files are at:
`design-personalities/` (in the current working directory)

| Personality   | Signature                           | Corners  | Shadows    | White Space |
|---------------|-------------------------------------|----------|------------|-------------|
| **BOLD**      | Oversized hero, 700-800 weight      | 0 or pill| Heavy or 0 | 30-40%      |
| **MINIMAL**   | Extreme restraint, 300-400 weight   | 8-12px   | None       | 50%+        |
| **SOFT**      | Full roundness, 600 weight          | 12-26px  | Subtle 6-8%| 35-40%     |
| **EDITORIAL** | Serif headlines, asymmetric grids   | 0px      | None       | 40%+        |
| **BRUTALIST**  | Heavy borders, monospace labels    | 0px      | None       | Tightest    |

### How to Apply Personalities

1. If user specifies a personality → read the full file and follow it EXACTLY (it overrides defaults in this doc)
2. If user hasn't specified → ask them, or use the defaults in this document
3. **Never mix rules from different personalities**
4. The personality file's type scale, colors, spacing, and component sizes REPLACE this doc's defaults

### Quick Personality Detection from Existing Screens

If the page already has screens, scan them to detect the personality:
- Sharp 0px corners + heavy weights → BOLD or EDITORIAL or BRUTALIST
- 8-12px corners + minimal shadows → MINIMAL
- 12px+ corners + warm colors → SOFT
- Serif fonts + asymmetric layouts → EDITORIAL
- 3px borders + monospace → BRUTALIST

---

## 13. CONTEXT ADAPTATION — SCAN BEFORE DESIGNING

**Before creating new screens, ALWAYS scan existing screens on the page to derive the established design language.**

Run this scan via figma_execute:

```javascript
// CONTEXT SCAN — Run before creating any new design
function scanExistingDesignLanguage() {
  const screens = figma.currentPage.children.filter(c => c.type === "FRAME" && c.width >= 350);
  if (screens.length === 0) return { hasExisting: false };

  const fonts = new Set();
  const fontSizes = new Set();
  const colors = new Set();
  const cornerRadii = new Set();
  const spacingValues = new Set();
  let screenWidth = 393, screenHeight = 852;

  function scan(node) {
    if (node.type === "TEXT" && typeof node.fontSize === "number") {
      fontSizes.add(node.fontSize);
      if (node.fontName && node.fontName.family) fonts.add(node.fontName.family);
      if (node.fills && node.fills[0] && node.fills[0].color) {
        const c = node.fills[0].color;
        colors.add(`${(c.r*255)|0},${(c.g*255)|0},${(c.b*255)|0}`);
      }
    }
    if (node.cornerRadius && node.cornerRadius > 0) cornerRadii.add(node.cornerRadius);
    if (node.layoutMode && node.layoutMode !== "NONE") {
      if (node.itemSpacing > 0) spacingValues.add(node.itemSpacing);
      [node.paddingTop, node.paddingBottom, node.paddingLeft, node.paddingRight].forEach(p => {
        if (p > 0) spacingValues.add(p);
      });
    }
    if (node.children) node.children.forEach(scan);
  }

  const ref = screens[0];
  screenWidth = ref.width;
  screenHeight = ref.height;
  screens.slice(0, 3).forEach(scan); // Scan first 3 screens

  return {
    hasExisting: true,
    screenSize: { width: screenWidth, height: screenHeight },
    fonts: [...fonts],
    fontSizes: [...fontSizes].sort((a,b) => a-b),
    uniqueColors: colors.size,
    cornerRadii: [...cornerRadii].sort((a,b) => a-b),
    spacingValues: [...spacingValues].sort((a,b) => a-b),
    screenCount: screens.length
  };
}
return scanExistingDesignLanguage();
```

**Use the results to:**
- Match screen dimensions exactly
- Use the same font family
- Use font sizes that exist in the established scale
- Match corner radius conventions
- Align spacing values to what's already used
- Keep the same color temperature (warm vs cool, light vs dark)

---

## 14. FEW-SHOT EXAMPLES — What Good Design Code Looks Like

These are reference patterns showing how to produce professional-quality output. Adapt these to your specific design.

### Example A: Professional Card Component

```javascript
// A clean, professional card with proper hierarchy and spacing
const card = figma.createFrame();
card.name = "Event Card";
card.layoutMode = 'VERTICAL';
card.primaryAxisSizingMode = 'AUTO';
card.counterAxisSizingMode = 'FIXED';
card.resize(345, 10);
card.paddingTop = card.paddingBottom = 20;
card.paddingLeft = card.paddingRight = 20;
card.itemSpacing = 16; // ON GRID
card.cornerRadius = 16;
card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
card.effects = [
  { type: "DROP_SHADOW", color: { r:0, g:0, b:0, a: 0.08 }, offset: { x:0, y:4 }, radius: 16, spread: -2, visible: true, blendMode: "NORMAL", showShadowBehindNode: false },
  { type: "DROP_SHADOW", color: { r:0, g:0, b:0, a: 0.04 }, offset: { x:0, y:1 }, radius: 4, spread: 0, visible: true, blendMode: "NORMAL", showShadowBehindNode: false }
];

// Image placeholder — proper aspect ratio
const img = figma.createFrame();
img.name = "Image";
img.resize(305, 180); // ~16:9
img.cornerRadius = 12;
img.fills = [{ type: 'SOLID', color: { r: 0.94, g: 0.94, b: 0.96 } }];
card.appendChild(img);
img.layoutSizingHorizontal = 'FILL';

// Title — Level 2 hierarchy
await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
const title = figma.createText();
title.fontName = { family: "Inter", style: "Semi Bold" };
title.characters = "Morning Meditation";
title.fontSize = 18; // FROM TYPE SCALE
title.lineHeight = { value: 24, unit: "PIXELS" }; // ALWAYS SET
title.letterSpacing = { value: 0, unit: "PIXELS" };
title.fills = [{ type: 'SOLID', color: { r: 0.07, g: 0.07, b: 0.09 } }]; // Text Primary
card.appendChild(title);
title.layoutSizingHorizontal = 'FILL';

// Subtitle — Level 3 hierarchy (lighter color, NOT smaller size)
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
const subtitle = figma.createText();
subtitle.fontName = { family: "Inter", style: "Regular" };
subtitle.characters = "15 min · Guided · Sarah Chen";
subtitle.fontSize = 14; // FROM TYPE SCALE
subtitle.lineHeight = { value: 20, unit: "PIXELS" };
subtitle.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.44 } }]; // Text Secondary
card.appendChild(subtitle);
subtitle.layoutSizingHorizontal = 'FILL';
```

**Why this is good:**
- Spacing: 20px padding, 16px gap — both on grid
- Typography: 2 sizes only (18, 14) from the type scale, with explicit lineHeight
- Color: 2 text colors from the palette (Primary, Secondary) — hierarchy through color, not size clutter
- Shadow: subtle dual-shadow (ambient + contact), low opacity
- Layout: auto-layout, FILL sizing, consistent padding

### Example B: Professional List Item Row

```javascript
const row = figma.createFrame();
row.name = "List Item";
row.layoutMode = 'HORIZONTAL';
row.counterAxisAlignItems = 'CENTER';
row.primaryAxisSizingMode = 'FIXED';
row.counterAxisSizingMode = 'AUTO';
row.resize(345, 10);
row.paddingTop = row.paddingBottom = 16; // ON GRID
row.paddingLeft = row.paddingRight = 16;
row.itemSpacing = 12; // ON GRID
row.fills = [];

// Avatar circle
const avatar = figma.createEllipse();
avatar.name = "Avatar";
avatar.resize(44, 44); // Touch target compliant
avatar.fills = [{ type: 'SOLID', color: { r: 0.94, g: 0.94, b: 0.96 } }];
row.appendChild(avatar);

// Text column
const textCol = figma.createFrame();
textCol.name = "Text";
textCol.layoutMode = 'VERTICAL';
textCol.primaryAxisSizingMode = 'AUTO';
textCol.counterAxisSizingMode = 'FIXED';
textCol.itemSpacing = 4; // Tight — related text
textCol.fills = [];
row.appendChild(textCol);
textCol.layoutSizingHorizontal = 'FILL';

await figma.loadFontAsync({ family: "Inter", style: "Medium" });
await figma.loadFontAsync({ family: "Inter", style: "Regular" });

const name = figma.createText();
name.fontName = { family: "Inter", style: "Medium" };
name.characters = "Sarah Chen";
name.fontSize = 16;
name.lineHeight = { value: 24, unit: "PIXELS" };
name.fills = [{ type: 'SOLID', color: { r: 0.07, g: 0.07, b: 0.09 } }];
textCol.appendChild(name);
name.layoutSizingHorizontal = 'FILL';

const meta = figma.createText();
meta.fontName = { family: "Inter", style: "Regular" };
meta.characters = "2h ago · Completed session";
meta.fontSize = 14;
meta.lineHeight = { value: 20, unit: "PIXELS" };
meta.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.63 } }]; // Tertiary
textCol.appendChild(meta);
meta.layoutSizingHorizontal = 'FILL';

// Chevron (import from library, don't draw)
// const chevron = await figma.importComponentByKeyAsync("KEY");
// const chevronInst = chevron.createInstance();
// row.appendChild(chevronInst);
// chevronInst.resize(20, 20);
```

### Example C: Professional Button

```javascript
const btn = figma.createFrame();
btn.name = "Button Primary";
btn.layoutMode = 'HORIZONTAL';
btn.primaryAxisAlignItems = 'CENTER';
btn.counterAxisAlignItems = 'CENTER';
btn.resize(345, 52); // 52px height — comfortable
btn.paddingLeft = btn.paddingRight = 24; // ON GRID
btn.cornerRadius = 12;
btn.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.12 } }]; // Near-black, NOT purple

await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
const label = figma.createText();
label.fontName = { family: "Inter", style: "Semi Bold" };
label.characters = "Continue";
label.fontSize = 16;
label.lineHeight = { value: 24, unit: "PIXELS" };
label.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; // White
btn.appendChild(label);
```

---

## 15. POST-GENERATION VALIDATION (COMPREHENSIVE)

After EVERY design is built, run this validation check via figma_execute. **This is MANDATORY — not optional.**

```javascript
function validateDesign(screenNode) {
  const errors = [];
  const warnings = [];
  const info = [];

  // Allowed values
  const ALLOWED_SPACING = [0, 4, 8, 12, 16, 20, 24, 32, 48, 64, 80, 96];
  const ALLOWED_FONT_SIZES = [11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28, 32, 34, 40, 48, 56, 64, 72, 80];
  const MAX_FONT_SIZES_PER_SCREEN = 6;
  const MAX_FONT_WEIGHTS_PER_SCREEN = 4;

  // Collectors
  const usedFontSizes = new Set();
  const usedFontWeights = new Set();
  const usedColors = [];
  let textNodeCount = 0;
  let textWithLineHeight = 0;
  let autoLayoutFrames = 0;
  let manualFrames = 0;
  let totalFrames = 0;

  function isPurplish(r, g, b) {
    const R = r * 255, G = g * 255, B = b * 255;
    if (B > 100 && G < B * 0.75 && R > 80 && R > G && B > G) return true;
    if (R > 150 && B > 100 && G < Math.min(R, B) * 0.7) return true;
    return false;
  }

  function check(node, depth) {
    // === SPACING GRID CHECK ===
    if (node.layoutMode && node.layoutMode !== "NONE") {
      autoLayoutFrames++;
      if (node.itemSpacing > 0 && !ALLOWED_SPACING.includes(Math.round(node.itemSpacing))) {
        errors.push(\`OFF-GRID spacing: \${Math.round(node.itemSpacing)}px on "\${node.name}" — use \${ALLOWED_SPACING.filter(v => Math.abs(v - node.itemSpacing) < 6).join(' or ')}px instead\`);
      }
      [node.paddingTop, node.paddingBottom, node.paddingLeft, node.paddingRight].forEach((p, i) => {
        const side = ['top', 'bottom', 'left', 'right'][i];
        if (p > 0 && !ALLOWED_SPACING.includes(Math.round(p))) {
          errors.push(\`OFF-GRID \${side} padding: \${Math.round(p)}px on "\${node.name}"\`);
        }
      });
      // Check consistent padding
      if (node.paddingLeft !== node.paddingRight && node.paddingLeft > 0 && node.paddingRight > 0) {
        warnings.push(\`Asymmetric horizontal padding: \${node.paddingLeft}L / \${node.paddingRight}R on "\${node.name}"\`);
      }
    }

    // === AUTO-LAYOUT CHECK ===
    if (node.type === "FRAME" && node.children && node.children.length > 1) {
      totalFrames++;
      if (node.layoutMode === "NONE") {
        manualFrames++;
        warnings.push(\`No auto-layout on "\${node.name}" (\${node.children.length} children) — should use VERTICAL or HORIZONTAL\`);
      }
    }

    // === TYPOGRAPHY CHECK ===
    if (node.type === "TEXT") {
      textNodeCount++;
      const size = node.fontSize;
      if (typeof size === "number") {
        usedFontSizes.add(size);
        if (size < 11) {
          errors.push(\`Text too small: \${size}px on "\${node.name}" — minimum 11px\`);
        }
        if (!ALLOWED_FONT_SIZES.includes(size)) {
          warnings.push(\`Non-standard font size: \${size}px on "\${node.name}" — nearest: \${ALLOWED_FONT_SIZES.reduce((a,b) => Math.abs(b-size) < Math.abs(a-size) ? b : a)}px\`);
        }
      }
      // Check lineHeight
      if (node.lineHeight && node.lineHeight.unit !== "AUTO") {
        textWithLineHeight++;
      }
      // Check font weight
      if (node.fontName && node.fontName.style) {
        usedFontWeights.add(node.fontName.style);
      }
    }

    // === COLOR CHECK ===
    if ('fills' in node && node.fills && node.fills.length > 0) {
      for (const fill of node.fills) {
        if (fill.type === 'SOLID' && fill.color) {
          const { r, g, b } = fill.color;
          if (isPurplish(r, g, b)) {
            errors.push(\`PURPLE detected on "\${node.name}" — remove all purple from the design\`);
          }
          usedColors.push({ r, g, b, node: node.name });
        }
        if ((fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL') && fill.gradientStops) {
          for (const stop of fill.gradientStops) {
            if (stop.color && isPurplish(stop.color.r, stop.color.g, stop.color.b)) {
              errors.push(\`PURPLE gradient on "\${node.name}" — remove all purple\`);
            }
          }
        }
      }
    }

    // === STROKE COLOR CHECK ===
    if ('strokes' in node && node.strokes) {
      for (const stroke of node.strokes) {
        if (stroke.type === 'SOLID' && stroke.color && isPurplish(stroke.color.r, stroke.color.g, stroke.color.b)) {
          errors.push(\`PURPLE stroke on "\${node.name}" — remove all purple\`);
        }
      }
    }

    // === TOUCH TARGET CHECK ===
    const name = (node.name || '').toLowerCase();
    if (name.includes('button') || name.includes('tab') || name.includes('icon') || name.includes('touch') || name.includes('tap')) {
      if (node.width < 44 || node.height < 44) {
        warnings.push(\`Touch target too small: \${Math.round(node.width)}x\${Math.round(node.height)} on "\${node.name}" — min 44x44\`);
      }
    }

    // === BUTTON HEIGHT CHECK ===
    if (name.includes('button') || name.includes('cta')) {
      if (node.height < 44) {
        errors.push(\`Button too short: \${Math.round(node.height)}px on "\${node.name}" — min 44px\`);
      }
    }

    // Recurse
    if (node.children) {
      node.children.forEach(child => check(child, depth + 1));
    }
  }

  check(screenNode, 0);

  // === AGGREGATE CHECKS ===
  if (usedFontSizes.size > MAX_FONT_SIZES_PER_SCREEN) {
    warnings.push(\`Too many font sizes: \${usedFontSizes.size} (max \${MAX_FONT_SIZES_PER_SCREEN}) — sizes: \${[...usedFontSizes].sort((a,b)=>a-b).join(', ')}px\`);
  }
  if (usedFontWeights.size > MAX_FONT_WEIGHTS_PER_SCREEN) {
    warnings.push(\`Too many font weights: \${usedFontWeights.size} (max \${MAX_FONT_WEIGHTS_PER_SCREEN}) — weights: \${[...usedFontWeights].join(', ')}\`);
  }
  if (textNodeCount > 0 && textWithLineHeight / textNodeCount < 0.5) {
    warnings.push(\`Only \${Math.round(textWithLineHeight/textNodeCount*100)}% of text has explicit lineHeight — should be 100%\`);
  }
  if (totalFrames > 0 && manualFrames / totalFrames > 0.3) {
    warnings.push(\`\${Math.round(manualFrames/totalFrames*100)}% of frames lack auto-layout — most frames should use it\`);
  }

  // Summary
  info.push(\`Font sizes used: \${[...usedFontSizes].sort((a,b)=>a-b).join(', ')}px\`);
  info.push(\`Font weights used: \${[...usedFontWeights].join(', ')}\`);
  info.push(\`Auto-layout: \${autoLayoutFrames} frames, Manual: \${manualFrames} frames\`);
  info.push(\`Text nodes: \${textNodeCount}, with lineHeight: \${textWithLineHeight}\`);

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    info,
    score: Math.max(0, 100 - (errors.length * 15) - (warnings.length * 5))
  };
}
```

### Validation Rules

| Check                    | Type    | Threshold                                      |
|--------------------------|---------|------------------------------------------------|
| Spacing on 8px grid      | Error   | ALL spacing values must be from allowed list   |
| Consistent padding       | Warning | Left = Right padding on containers             |
| Auto-layout usage        | Warning | >70% of multi-child frames should use it       |
| Text minimum size        | Error   | No text below 11px                             |
| Standard font sizes      | Warning | Should use sizes from the type scale            |
| Font size count          | Warning | Max 6 distinct sizes per screen                |
| Font weight count        | Warning | Max 4 distinct weights per screen              |
| Line height set          | Warning | 100% of text nodes should have explicit LH     |
| Purple color detection   | Error   | No purple fills, strokes, or gradients          |
| Touch target size        | Warning | Min 44x44px for interactive elements           |
| Button height            | Error   | Min 44px                                        |

### Score

- Start at 100
- Each error: -15 points
- Each warning: -5 points
- **Target: 80+ for acceptable, 90+ for good, 95+ for excellent**

**If score < 80, you MUST fix errors before presenting the design. No exceptions.**

---

## 16. RECREATION FIDELITY (rebuilding a real screen/flow from a reference)

When you are REPRODUCING an existing screen (e.g. copying a real app screen or
flow into Figma from a reference image), pixel-perfect + cross-screen consistency
is the bar. These are hard rules — violating any is a defect.

### 16.1 FLOW KIT FIRST — build masters, assemble from INSTANCES
Do NOT build each screen of a flow independently (that is why shared elements
drift). First create ONE master COMPONENT for every recurring element (status
bar, nav header, back button, input field, primary button). Then build each
screen by placing INSTANCES of those masters plus screen-specific content.
Figma enforces that an instance matches its master's size/style — so shared
elements CANNOT drift. This is structural, not a suggestion.

### 16.2 COMPUTE positions with MATH — never eyeball a screenshot
Screenshot-estimated coordinates are the #1 source of cross-screen drift.
Read the real node coordinates via figma_execute and COMPUTE placement:

```javascript
// Anchor a caption/helper text exactly below an input (same gap every screen):
const input = figma.getNodeById(inputId);
caption.y = Math.round(input.y + input.height + GAP);   // e.g. GAP = 10
caption.x = Math.round(input.x);

// Center a dialog/notification by arithmetic (390-wide frame):
node.x = Math.round((390 - node.width) / 2);
node.y = Math.round((844 - node.height) / 2);
```

Verify by READING BACK node.x/node.y numerically — never by judging a picture.
Use screenshots only for a final visual sanity check, never as the coordinate
source.

### 16.3 Buttons HUG their content — never a fixed width
A 'Next'/'Continue'/'Create account' button is a HUG-CONTENT auto-layout pill:
width = label + fixed horizontal padding, with a fixed height + radius. So
'Next' is narrow and 'Create account' is wider — that is CORRECT. Forcing a fixed
width looks wrong vs. the reference. Build it once, reuse the SAME spec everywhere:

```javascript
const b = figma.getNodeById(buttonId);   // a FRAME containing the label text
b.layoutMode = 'HORIZONTAL';
b.primaryAxisSizingMode = 'AUTO';    // width hugs the label
b.counterAxisSizingMode = 'FIXED';   // fixed height
b.primaryAxisAlignItems = 'CENTER';
b.counterAxisAlignItems = 'CENTER';
b.paddingLeft = b.paddingRight = 32;  b.paddingTop = b.paddingBottom = 0;
b.resize(b.width, 52);  b.cornerRadius = 26;
// then center it: b.x = Math.round((390 - b.width) / 2);
```

### 16.4 Shared TEXT STYLES, reused native assets, real images
- Typography is one shared spec per role (headline/body/caption): same family,
  size, weight, line-height on EVERY screen. Never let a headline be 26px on one
  screen and 40px on the next.
- Reuse native platform assets (keyboard, status bar, pickers, permission
  dialogs) — never hand-build a keyboard from 30+ key rectangles.
- Reuse icons from the components library — never hand-draw an icon that exists.
- Image tiles (artists, albums, avatars) must contain REAL sourced photos, never
  a flat colored circle.

### 16.5 GATE — verify with numbers before declaring a screen done
Run this assertion via figma_execute. If it returns pass:false, fix the listed
failures and re-run until pass:true. Correctness is decided by MATH, not by how
the screenshot looks.

```javascript
function verifyLayout(assertions) {
  const R = (id) => figma.getNodeById(id);
  const out = []; let passed = 0;
  for (const a of assertions) {
    const n = R(a.nodeId); const tol = a.tolerance ?? 1; let ok = false, d = {};
    if (a.type === 'equals')   { const v = n[a.prop]; ok = Math.abs(v - a.value) <= tol; d = { prop:a.prop, expected:a.value, actual:Math.round(v) }; }
    if (a.type === 'centeredX'){ const e = Math.round((R(a.containerId).width - n.width)/2); ok = Math.abs(n.x - e) <= tol; d = { expectedX:e, actualX:Math.round(n.x) }; }
    if (a.type === 'below')    { const an = R(a.anchorId); const e = Math.round(an.y + an.height + (a.gap ?? 10)); ok = Math.abs(n.y - e) <= tol; d = { expectedY:e, actualY:Math.round(n.y) }; }
    if (ok) passed++; out.push({ ...d, type:a.type, nodeId:a.nodeId, pass:ok });
  }
  return { pass: passed === assertions.length, passed, total: assertions.length, failures: out.filter(r => !r.pass) };
}
// Example: every caption below its input at the same gap; button centered.
```
