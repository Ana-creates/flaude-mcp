// Flaude Design Validation Script
// Run via figma_execute after creating any design
// Copy-paste this entire function, then call: return validateDesign(figma.getNodeById("SCREEN_ID"));

function validateDesign(screenNode) {
  const errors = [];
  const warnings = [];
  const info = [];

  const GRID = [0, 4, 8, 12, 16, 20, 24, 32, 48, 64, 80, 96];
  const TYPE_SCALE = [11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28, 32, 34, 40, 48, 56, 64, 72, 80];

  const usedSizes = new Set();
  const usedWeights = new Set();
  let textCount = 0, textWithLH = 0, autoFrames = 0, manualFrames = 0, totalFrames = 0;

  function onGrid(v) { return GRID.includes(Math.round(v)); }
  function nearest(v, scale) { return scale.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a); }

  function isPurple(r, g, b) {
    const R = r * 255, G = g * 255, B = b * 255;
    if (B > 100 && G < B * 0.75 && R > 80 && R > G && B > G) return true;
    if (R > 150 && B > 100 && G < Math.min(R, B) * 0.7) return true;
    return false;
  }

  function check(node, depth) {
    // Skip deep nesting (SVG imports), invisible nodes, huge child counts (vector art)
    if (depth > 8) return;
    if ('visible' in node && !node.visible) return;
    if (node.children && node.children.length > 50) return;

    // --- SPACING GRID ---
    if (node.layoutMode && node.layoutMode !== "NONE") {
      autoFrames++;
      if (node.itemSpacing > 0 && !onGrid(node.itemSpacing))
        errors.push("Spacing " + Math.round(node.itemSpacing) + "px → use " + nearest(node.itemSpacing, GRID) + 'px on "' + node.name + '"');
      ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"].forEach(function (k) {
        var v = node[k];
        if (v > 0 && !onGrid(v))
          errors.push("Padding " + Math.round(v) + "px → use " + nearest(v, GRID) + 'px on "' + node.name + '"');
      });
      if (node.paddingLeft > 0 && node.paddingRight > 0 && Math.round(node.paddingLeft) !== Math.round(node.paddingRight))
        warnings.push("Asymmetric padding: " + Math.round(node.paddingLeft) + "L/" + Math.round(node.paddingRight) + 'R on "' + node.name + '"');
    }

    // --- AUTO-LAYOUT ---
    if (node.type === "FRAME" && node.children && node.children.length > 2 && node.children.length <= 50) {
      totalFrames++;
      if (!node.layoutMode || node.layoutMode === "NONE") {
        manualFrames++;
        warnings.push('No auto-layout: "' + node.name + '" (' + node.children.length + " children)");
      }
    }

    // --- TEXT ---
    if (node.type === "TEXT") {
      var sz = node.fontSize;
      if (typeof sz !== "number") { textCount++; return; }
      // Skip fractional sizes (scaled SVG artifacts)
      if (Math.abs(sz - Math.round(sz)) > 0.1) return;

      textCount++;
      var roundSz = Math.round(sz);
      usedSizes.add(roundSz);
      if (roundSz < 11) errors.push("Text " + roundSz + 'px < 11px min: "' + node.name + '"');
      if (!TYPE_SCALE.includes(roundSz))
        warnings.push("Size " + roundSz + "px → use " + nearest(roundSz, TYPE_SCALE) + 'px: "' + node.name + '"');
      if (node.lineHeight && node.lineHeight.unit !== "AUTO") textWithLH++;
      if (node.fontName && node.fontName.style) usedWeights.add(node.fontName.style);
    }

    // --- PURPLE DETECTION ---
    if ("fills" in node && node.fills) {
      for (var i = 0; i < node.fills.length; i++) {
        var f = node.fills[i];
        if (f.type === "SOLID" && f.color && isPurple(f.color.r, f.color.g, f.color.b))
          errors.push('Purple fill: "' + node.name + '"');
        if ((f.type === "GRADIENT_LINEAR" || f.type === "GRADIENT_RADIAL") && f.gradientStops)
          for (var s = 0; s < f.gradientStops.length; s++)
            if (f.gradientStops[s].color && isPurple(f.gradientStops[s].color.r, f.gradientStops[s].color.g, f.gradientStops[s].color.b))
              errors.push('Purple gradient: "' + node.name + '"');
      }
    }
    if ("strokes" in node && node.strokes)
      for (var j = 0; j < node.strokes.length; j++)
        if (node.strokes[j].type === "SOLID" && node.strokes[j].color && isPurple(node.strokes[j].color.r, node.strokes[j].color.g, node.strokes[j].color.b))
          errors.push('Purple stroke: "' + node.name + '"');

    // --- INTERACTIVE ELEMENTS ---
    var nm = (node.name || "").toLowerCase();
    if ((nm.includes("button") || nm.includes("cta")) && node.height < 44)
      errors.push("Button " + Math.round(node.height) + 'px < 44px: "' + node.name + '"');
    if ((nm.includes("button") || nm.includes("tab") || nm.includes("icon")) && (node.width < 44 || node.height < 44))
      warnings.push("Touch target " + Math.round(node.width) + "x" + Math.round(node.height) + ' < 44x44: "' + node.name + '"');

    if (node.children) node.children.forEach(function (c) { check(c, depth + 1); });
  }

  check(screenNode, 0);

  // --- AGGREGATES ---
  if (usedSizes.size > 6)
    warnings.push(usedSizes.size + " font sizes (max 6): " + Array.from(usedSizes).sort(function (a, b) { return a - b; }).join(",") + "px");
  if (usedWeights.size > 4)
    warnings.push(usedWeights.size + " weights (max 4): " + Array.from(usedWeights).join(","));
  if (textCount > 3 && textWithLH / textCount < 0.5)
    warnings.push(Math.round(textWithLH / textCount * 100) + "% text has lineHeight (target: 100%)");
  if (totalFrames > 2 && manualFrames / totalFrames > 0.4)
    warnings.push(Math.round(manualFrames / totalFrames * 100) + "% frames lack auto-layout");

  info.push("Sizes: " + Array.from(usedSizes).sort(function (a, b) { return a - b; }).join(",") + "px");
  info.push("Weights: " + Array.from(usedWeights).join(","));
  info.push("Layout: " + autoFrames + " auto / " + manualFrames + " manual");

  var score = Math.max(0, 100 - errors.length * 10 - warnings.length * 3);
  return { passed: errors.length === 0, score: score, errors: errors, warnings: warnings, info: info };
}
