import React, { useState } from 'react';
import type { EquationItem } from '../types';

interface EquationListProps {
    equations: EquationItem[];
    onDelete: (formula: string) => void;
    onToggleVisibility: (formula: string) => void;
    onEdit: (oldFormula: string, newFormula: string) => void;
}

const EquationList: React.FC<EquationListProps> = ({ equations, onDelete, onToggleVisibility, onEdit }) => {
    const [editingFormula, setEditingFormula] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const startEditing = (formula: string) => {
        setEditingFormula(formula);
        setEditValue(formula);
    };

    const saveEdit = () => {
        if (editingFormula && editValue && editValue !== editingFormula) {
            onEdit(editingFormula, editValue);
        }
        setEditingFormula(null);
        setEditValue('');
    };

    const cancelEdit = () => {
        setEditingFormula(null);
        setEditValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') saveEdit();
        if (e.key === 'Escape') cancelEdit();
    };

    return (
        <div>
            {equations.length === 0 && (
                <p className="empty-state">No equations yet. Type one above and click Plot.</p>
            )}
            {equations.map((eq, index) => (
                <div key={index} className={`equation-card ${!eq.isVisible ? 'equation-card--hidden' : ''} ${eq.error ? 'equation-card--error' : ''}`}>
                    <span
                        className="color-dot"
                        style={{ backgroundColor: eq.error ? '#ff4444' : eq.color }}
                        title={eq.error || `Line color: ${eq.color}`}
                    />
                    {editingFormula === eq.formula ? (
                        <input
                            className="edit-input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={saveEdit}
                            autoFocus
                        />
                    ) : (
                        <div className="equation-formula-wrapper">
                            <span className={`equation-formula ${!eq.isVisible ? 'text-muted' : ''} ${eq.error ? 'text-error' : ''}`}
                                  onDoubleClick={() => startEditing(eq.formula)}>
                                {eq.formula}
                            </span>
                            {eq.error && <span className="equation-error">{eq.error}</span>}
                        </div>
                    )}
                    <div className="equation-actions">
                        <button
                            className="visibility-btn"
                            onClick={() => onToggleVisibility(eq.formula)}
                            title={eq.isVisible ? 'Hide equation' : 'Show equation'}
                        >
                            {eq.isVisible ? '👁' : '👁‍🗨'}
                        </button>
                        <button
                            className="edit-btn"
                            onClick={() => startEditing(eq.formula)}
                            title="Edit equation"
                        >
                            ✎
                        </button>
                        <button
                            className="delete-btn"
                            style={{ backgroundColor: eq.color }}
                            onClick={() => onDelete(eq.formula)}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default EquationList;