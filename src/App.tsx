import React, { useState, useCallback, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import GraphCanvas from './components/GraphCanvas';
import { validateEquation } from './lib/graph';
import { GRAPH_COLORS } from './types';
import type { EquationItem } from './types';

const STORAGE_KEY = 'eq2graph_equations';

const DEFAULT_EQUATIONS: EquationItem[] = [
  { formula: 'y = sin(x)', color: GRAPH_COLORS[0], isVisible: true },
  { formula: 'y = x', color: GRAPH_COLORS[1], isVisible: true },
  { formula: 'y = x^2', color: GRAPH_COLORS[3], isVisible: true },
];

function loadEquations(): EquationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_EQUATIONS;
}

function saveEquations(equations: EquationItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(equations));
  } catch { /* ignore */ }
}

const App: React.FC = () => {
    const [equations, setEquations] = useState<EquationItem[]>(loadEquations);
    const [inputValue, setInputValue] = useState<string>('');
    const [xMin, setXMin] = useState(-10);
    const [xMax, setXMax] = useState(10);

    useEffect(() => { saveEquations(equations); }, [equations]);

    const handleInputChange = useCallback((value: string) => {
        setInputValue(value);
    }, []);

    const addEquation = useCallback((formula: string) => {
        const error = validateEquation(formula) || undefined;
        setEquations((prev) => [
            ...prev,
            { formula, color: GRAPH_COLORS[prev.length % GRAPH_COLORS.length], isVisible: true, error }
        ]);
        setInputValue('');
    }, []);

    const removeEquation = useCallback((formula: string) => {
        setEquations((prev) => prev.filter((eq) => eq.formula !== formula));
    }, []);

    const toggleVisibility = useCallback((formula: string) => {
        setEquations((prev) =>
            prev.map((eq) =>
                eq.formula === formula ? { ...eq, isVisible: !eq.isVisible } : eq
            )
        );
    }, []);

    const editEquation = useCallback((oldFormula: string, newFormula: string) => {
        const error = validateEquation(newFormula) || undefined;
        setEquations((prev) =>
            prev.map((eq) =>
                eq.formula === oldFormula ? { ...eq, formula: newFormula, error } : eq
            )
        );
    }, []);

    const clearAllEquations = useCallback(() => {
        setEquations([]);
    }, []);

    const handleSettingsChange = useCallback((newXMin: number, newXMax: number) => {
        setXMin(newXMin);
        setXMax(newXMax);
    }, []);

    const visibleEquations = equations.filter((eq) => eq.isVisible);

    return (
        <div className="app-container">
            <div className="control-panel-container">
                <ControlPanel
                    inputValue={inputValue}
                    onInputChange={handleInputChange}
                    onAddEquation={addEquation}
                    equations={equations}
                    onRemoveEquation={removeEquation}
                    onToggleVisibility={toggleVisibility}
                    onEditEquation={editEquation}
                    onClearAll={clearAllEquations}
                    xMin={xMin}
                    xMax={xMax}
                    onSettingsChange={handleSettingsChange}
                />
            </div>
            <div className="graph-canvas-wrapper">
                <GraphCanvas
                    equations={visibleEquations}
                    xMin={xMin}
                    xMax={xMax}
                    onSettingsChange={handleSettingsChange}
                />
            </div>
        </div>
    );
};

export default App;
