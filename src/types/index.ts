export interface EquationItem {
    formula: string;
    color: string;
    isVisible: boolean;
    error?: string;
}

export const GRAPH_COLORS = [
    '#00ff88',  // neon green
    '#ff6b6b',  // neon red
    '#4dabf7',  // neon blue
    '#ffd43b',  // neon yellow
    '#da77f2',  // neon purple
    '#20c997',  // neon teal
    '#ff922b',  // neon orange
    '#748ffc',  // neon indigo
];