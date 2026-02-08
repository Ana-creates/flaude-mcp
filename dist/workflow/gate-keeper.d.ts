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
export type WorkflowPhase = 'INITIAL' | 'UNDERSTAND' | 'ESTABLISH' | 'GENERATE' | 'REFINE';
export interface GateKeeperState {
    currentPhase: WorkflowPhase;
    completedSteps: Set<string>;
    designContext: {
        hasAnalyzedDesign: boolean;
        hasInventoriedAssets: boolean;
        hasExtractedTokens: boolean;
        hasMappedComponents: boolean;
        isWireframe: boolean;
        wireframeWarning: string | null;
        studiedFrameIds: string[];
        availableAssets: Array<{
            id: string;
            name: string;
            type: string;
        }>;
        extractedColors: string[];
        extractedFonts: string[];
    };
    transactionStack: string[];
}
/**
 * Tools that can be called in each phase
 */
export declare const TOOL_PHASE_MAP: Record<string, WorkflowPhase>;
/**
 * Check if a tool can be executed given the current workflow state.
 * Returns allowed: false with detailed reason and required steps if blocked.
 */
export declare function canExecuteTool(toolName: string, state: GateKeeperState): {
    allowed: boolean;
    reason?: string;
    requiredSteps?: string[];
    phase?: WorkflowPhase;
};
/**
 * Update the gate keeper state based on a completed tool execution.
 */
export declare function updateStateFromToolResult(state: GateKeeperState, toolName: string, result: unknown): GateKeeperState;
/**
 * Create initial gate keeper state
 */
export declare function createInitialState(): GateKeeperState;
/**
 * Get a human-readable status of the current workflow state
 */
export declare function getWorkflowStatus(state: GateKeeperState): string;
