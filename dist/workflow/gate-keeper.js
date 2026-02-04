/**
 * Gate Keeper - Workflow Enforcement System
 *
 * HARD BLOCKS creation tools until proper design analysis is complete.
 * This ensures the AI cannot create ugly wireframes by skipping design study.
 *
 * Workflow Phases:
 * INITIAL -> UNDERSTAND -> ESTABLISH -> GENERATE -> REFINE
 *
 * Each phase has prerequisites that MUST be met before proceeding.
 */
/**
 * Tools that can be called in each phase
 */
export const TOOL_PHASE_MAP = {
    // UNDERSTAND phase tools (always allowed) - read and analyze existing designs
    'get_file_structure': 'UNDERSTAND',
    'get_selection': 'UNDERSTAND',
    'get_node_details': 'UNDERSTAND',
    'search_nodes': 'UNDERSTAND',
    'get_all_text_nodes': 'UNDERSTAND',
    'export_frame_preview': 'UNDERSTAND',
    'check_layout_consistency': 'UNDERSTAND',
    'get_images': 'UNDERSTAND',
    'deep_analyze': 'UNDERSTAND',
    'study_frame': 'UNDERSTAND',
    'detect_visual_patterns': 'UNDERSTAND',
    'get_canvas_bounds': 'UNDERSTAND',
    'find_next_screen_position': 'UNDERSTAND',
    'get_elements_at_position': 'UNDERSTAND',
    'get_parent_layout_info': 'UNDERSTAND',
    'audit_components': 'UNDERSTAND',
    'get_text_constraints': 'UNDERSTAND',
    'get_design_rules': 'UNDERSTAND',
    'prepare_to_design': 'UNDERSTAND',
    'get_components': 'UNDERSTAND',
    'get_exportable_assets': 'UNDERSTAND',
    'get_local_styles': 'UNDERSTAND',
    'zoom_to_node': 'UNDERSTAND',
    'select_nodes': 'UNDERSTAND',
    'get_current_page': 'UNDERSTAND',
    // ESTABLISH phase tools (require UNDERSTAND) - extract design system
    'extract_color_palette': 'ESTABLISH',
    'extract_typography_styles': 'ESTABLISH',
    'extract_spacing_patterns': 'ESTABLISH',
    'extract_border_styles': 'ESTABLISH',
    'extract_component_patterns': 'ESTABLISH',
    'extract_design_system': 'ESTABLISH',
    'learn_design_system': 'ESTABLISH',
    'get_design_system': 'ESTABLISH',
    'save_design_system': 'ESTABLISH',
    'load_design_system': 'ESTABLISH',
    'export_design_tokens': 'ESTABLISH',
    'map_component_library': 'ESTABLISH',
    // GENERATE phase tools (require ESTABLISH) - create new elements
    'create_frame': 'GENERATE',
    'create_text': 'GENERATE',
    'create_rectangle': 'GENERATE',
    'create_styled_text': 'GENERATE',
    'create_styled_button': 'GENERATE',
    'create_styled_card': 'GENERATE',
    'create_styled_input': 'GENERATE',
    'create_styled_badge': 'GENERATE',
    'smart_add': 'GENERATE',
    'smart_design_section': 'GENERATE',
    'compose_section': 'GENERATE',
    'generate_icon': 'GENERATE',
    'create_template': 'GENERATE',
    'duplicate_node': 'GENERATE',
    'duplicate_and_modify': 'GENERATE',
    'create_component_instance': 'GENERATE',
    'create_screen_flow': 'GENERATE',
    'create_screen_from_state': 'GENERATE',
    'import_html': 'GENERATE',
    'import_url': 'GENERATE',
    // MODIFY tools - editing existing elements (always allowed - not creating new ugly stuff)
    'modify_node': 'UNDERSTAND',
    'resize_node': 'UNDERSTAND',
    'move_node': 'UNDERSTAND',
    'update_text': 'UNDERSTAND',
    'delete_node': 'UNDERSTAND',
    'group_nodes': 'UNDERSTAND',
    'copy_styles': 'UNDERSTAND',
    'paste_styles': 'UNDERSTAND',
    'batch_modify': 'UNDERSTAND',
    'batch_delete': 'UNDERSTAND',
    'replace_image': 'UNDERSTAND',
    'convert_to_auto_layout': 'UNDERSTAND',
    'swap_component_variant': 'UNDERSTAND',
    'detach_instance': 'UNDERSTAND',
    'find_replace_text': 'UNDERSTAND',
    'find_replace_color': 'UNDERSTAND',
    'organize_layers': 'UNDERSTAND',
    'bulk_rename': 'UNDERSTAND',
    'cleanup_layer_names': 'UNDERSTAND',
    'set_constraints': 'UNDERSTAND',
    'make_responsive': 'UNDERSTAND',
    'apply_local_style': 'UNDERSTAND',
    'create_color_style': 'UNDERSTAND',
    'add_prototype_link': 'UNDERSTAND',
    'remove_prototype_links': 'UNDERSTAND',
    // REFINE phase tools (allowed anytime) - validate and fix
    'lint_design': 'REFINE',
    'check_accessibility': 'REFINE',
    'auto_fix_issues': 'REFINE',
    'auto_fix_design': 'REFINE',
    'ensure_alignment': 'REFINE',
    'check_typography_hierarchy': 'REFINE',
    'check_layout_balance': 'REFINE',
    'apply_smart_defaults': 'REFINE',
    'validate_style_consistency': 'REFINE',
    'compare_to_reference': 'REFINE',
    'analyze_design_quality': 'REFINE',
    'iterate_design': 'REFINE',
    'get_visual_diff': 'REFINE',
    'compare_designs_visually': 'REFINE',
    'validate_against_schema': 'REFINE',
    'export_assets': 'REFINE',
    'add_measurement': 'REFINE',
    'add_dev_note': 'REFINE',
    'add_spec_annotations': 'REFINE',
    // Transaction tools (always allowed)
    'begin_transaction': 'UNDERSTAND',
    'commit_transaction': 'UNDERSTAND',
    'rollback_transaction': 'UNDERSTAND',
};
/**
 * Check if a tool can be executed given the current workflow state.
 * Returns allowed: false with detailed reason and required steps if blocked.
 */
export function canExecuteTool(toolName, state) {
    const requiredPhase = TOOL_PHASE_MAP[toolName];
    // Unknown tools are allowed (might be read-only utilities)
    if (!requiredPhase) {
        return { allowed: true };
    }
    // UNDERSTAND and REFINE tools are always allowed
    if (requiredPhase === 'UNDERSTAND' || requiredPhase === 'REFINE') {
        return { allowed: true, phase: requiredPhase };
    }
    // ESTABLISH tools require some design analysis first
    if (requiredPhase === 'ESTABLISH') {
        if (!state.designContext.hasAnalyzedDesign && !state.designContext.hasInventoriedAssets) {
            return {
                allowed: false,
                phase: requiredPhase,
                reason: '🚫 BLOCKED: You must understand the existing designs before extracting design tokens.',
                requiredSteps: [
                    'Call study_frame() on 2-3 finished screens to understand the design patterns',
                    'Call get_images() to inventory available visual assets',
                ],
            };
        }
        return { allowed: true, phase: requiredPhase };
    }
    // GENERATE tools have the strictest requirements
    if (requiredPhase === 'GENERATE') {
        const blockers = [];
        const requiredSteps = [];
        // Must have analyzed existing designs
        if (!state.designContext.hasAnalyzedDesign) {
            blockers.push('You have NOT studied any existing designs');
            requiredSteps.push('Call study_frame() on 2-3 FINISHED screens (not wireframes!)');
        }
        // Must have inventoried assets
        if (!state.designContext.hasInventoriedAssets) {
            blockers.push('You have NOT inventoried available visual assets');
            requiredSteps.push('Call get_images() to discover images, icons, illustrations you can REUSE');
        }
        // Must have extracted design tokens
        if (!state.designContext.hasExtractedTokens) {
            blockers.push('You have NOT extracted design tokens (colors, typography)');
            requiredSteps.push('Call extract_color_palette() and extract_typography_styles() OR learn_design_system()');
        }
        // Must not be working from a wireframe
        if (state.designContext.isWireframe) {
            blockers.push('The design you studied appears to be a WIREFRAME (gray placeholders, no images)');
            requiredSteps.push('Study a FINISHED design with real images and visual richness');
            if (state.designContext.wireframeWarning) {
                blockers.push(`Details: ${state.designContext.wireframeWarning}`);
            }
        }
        if (blockers.length > 0) {
            return {
                allowed: false,
                phase: requiredPhase,
                reason: `🚫 BLOCKED: Cannot create design elements yet.\n\nIssues:\n${blockers.map(b => `  • ${b}`).join('\n')}`,
                requiredSteps,
            };
        }
        return { allowed: true, phase: requiredPhase };
    }
    return { allowed: true };
}
/**
 * Update the gate keeper state based on a completed tool execution.
 */
export function updateStateFromToolResult(state, toolName, result) {
    const newState = { ...state };
    newState.completedSteps = new Set(state.completedSteps);
    newState.designContext = { ...state.designContext };
    // Track completed tools
    newState.completedSteps.add(toolName);
    // Update context based on tool results
    switch (toolName) {
        case 'study_frame':
        case 'deep_analyze':
        case 'prepare_to_design':
            newState.designContext.hasAnalyzedDesign = true;
            // Check for wireframe detection in result
            if (result && typeof result === 'object') {
                const r = result;
                if (r.hasImageFills !== undefined) {
                    newState.designContext.isWireframe = !r.hasImageFills;
                }
                if (r.isWireframe !== undefined) {
                    newState.designContext.isWireframe = r.isWireframe;
                }
                if (r.wireframeWarning) {
                    newState.designContext.wireframeWarning = r.wireframeWarning;
                }
            }
            break;
        case 'get_images':
            newState.designContext.hasInventoriedAssets = true;
            if (result && typeof result === 'object') {
                const r = result;
                if (Array.isArray(r.images)) {
                    newState.designContext.availableAssets = r.images.map((img) => {
                        const i = img;
                        return {
                            id: String(i.id || ''),
                            name: String(i.name || ''),
                            type: 'image',
                        };
                    });
                }
            }
            break;
        case 'extract_color_palette':
            newState.designContext.hasExtractedTokens = true;
            if (result && typeof result === 'object') {
                const r = result;
                if (Array.isArray(r.colors)) {
                    newState.designContext.extractedColors = r.colors.map((c) => {
                        const color = c;
                        return String(color.hex || '');
                    });
                }
            }
            break;
        case 'extract_typography_styles':
            if (result && typeof result === 'object') {
                const r = result;
                if (Array.isArray(r.styles)) {
                    newState.designContext.extractedFonts = [...new Set(r.styles.map((s) => {
                            const style = s;
                            return String(style.fontFamily || '');
                        }))];
                }
            }
            break;
        case 'learn_design_system':
        case 'extract_design_system':
            newState.designContext.hasAnalyzedDesign = true;
            newState.designContext.hasExtractedTokens = true;
            newState.designContext.hasMappedComponents = true;
            break;
    }
    // Update phase based on context
    if (newState.designContext.hasAnalyzedDesign || newState.designContext.hasInventoriedAssets) {
        if (newState.currentPhase === 'INITIAL') {
            newState.currentPhase = 'UNDERSTAND';
        }
    }
    if (newState.designContext.hasExtractedTokens) {
        if (newState.currentPhase === 'UNDERSTAND') {
            newState.currentPhase = 'ESTABLISH';
        }
    }
    if (newState.designContext.hasAnalyzedDesign &&
        newState.designContext.hasInventoriedAssets &&
        newState.designContext.hasExtractedTokens &&
        !newState.designContext.isWireframe) {
        if (newState.currentPhase === 'ESTABLISH') {
            newState.currentPhase = 'GENERATE';
        }
    }
    return newState;
}
/**
 * Create initial gate keeper state
 */
export function createInitialState() {
    return {
        currentPhase: 'INITIAL',
        completedSteps: new Set(),
        designContext: {
            hasAnalyzedDesign: false,
            hasInventoriedAssets: false,
            hasExtractedTokens: false,
            hasMappedComponents: false,
            isWireframe: false,
            wireframeWarning: null,
            studiedFrameIds: [],
            availableAssets: [],
            extractedColors: [],
            extractedFonts: [],
        },
        transactionStack: [],
    };
}
/**
 * Get a human-readable status of the current workflow state
 */
export function getWorkflowStatus(state) {
    const lines = [];
    lines.push(`📊 WORKFLOW STATUS: Phase ${state.currentPhase}`);
    lines.push('');
    const ctx = state.designContext;
    // Checklist
    lines.push('Prerequisites for creating designs:');
    lines.push(`  ${ctx.hasAnalyzedDesign ? '✅' : '❌'} Design analysis (study_frame)`);
    lines.push(`  ${ctx.hasInventoriedAssets ? '✅' : '❌'} Asset inventory (get_images)`);
    lines.push(`  ${ctx.hasExtractedTokens ? '✅' : '❌'} Design tokens extracted`);
    lines.push(`  ${!ctx.isWireframe ? '✅' : '❌'} Studied a finished design (not wireframe)`);
    if (ctx.isWireframe && ctx.wireframeWarning) {
        lines.push('');
        lines.push(`⚠️ Wireframe warning: ${ctx.wireframeWarning}`);
    }
    // What's available
    if (ctx.extractedColors.length > 0) {
        lines.push('');
        lines.push(`🎨 Colors available: ${ctx.extractedColors.slice(0, 5).join(', ')}${ctx.extractedColors.length > 5 ? '...' : ''}`);
    }
    if (ctx.extractedFonts.length > 0) {
        lines.push(`🔤 Fonts available: ${ctx.extractedFonts.join(', ')}`);
    }
    if (ctx.availableAssets.length > 0) {
        lines.push(`🖼️ Assets available: ${ctx.availableAssets.length} images/illustrations`);
    }
    // Can create?
    lines.push('');
    if (ctx.hasAnalyzedDesign &&
        ctx.hasInventoriedAssets &&
        ctx.hasExtractedTokens &&
        !ctx.isWireframe) {
        lines.push('✅ Ready to create! All prerequisites met.');
    }
    else {
        lines.push('❌ Not ready to create. Complete the prerequisites above first.');
    }
    return lines.join('\n');
}
