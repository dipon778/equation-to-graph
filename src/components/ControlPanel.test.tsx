import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import ControlPanel from './ControlPanel';
import type { EquationItem } from '../types';

vi.mock('./EquationList', () => ({
  default: ({
    equations,
    onDelete,
    onToggleVisibility,
    onEdit,
  }: {
    equations: EquationItem[];
    onDelete: (formula: string) => void;
    onToggleVisibility: (formula: string) => void;
    onEdit: (oldFormula: string, newFormula: string) => void;
  }) => (
    <ul>
      {equations.map((eq: EquationItem) => (
        <li key={eq.formula}>
          <span>{eq.formula}</span>
          <button onClick={() => onDelete(eq.formula)}>Delete</button>
          <button onClick={() => onToggleVisibility(eq.formula)}>Toggle</button>
          <button onClick={() => onEdit(eq.formula, 'edited')}>Edit</button>
        </li>
      ))}
    </ul>
  )
}));

vi.mock('./SettingsPanel', () => ({
  default: () => <div>Settings Panel</div>
}));

const defaultProps = {
  inputValue: '',
  onInputChange: vi.fn(),
  onAddEquation: vi.fn(),
  equations: [] as EquationItem[],
  onRemoveEquation: vi.fn(),
  onToggleVisibility: vi.fn(),
  onEditEquation: vi.fn(),
  onClearAll: vi.fn(),
  xMin: -10,
  xMax: 10,
  onSettingsChange: vi.fn(),
};

describe('ControlPanel', () => {
  it('renders the input and adds a new equation on Plot click', () => {
    const onAddEquation = vi.fn();
    render(
      <ControlPanel
        {...defaultProps}
        inputValue="y = cos(x)"
        onAddEquation={onAddEquation}
      />
    );

    const input = screen.getByPlaceholderText(/y=sin\(x\)/);
    expect(input).toHaveValue('y = cos(x)');

    const plotButton = screen.getByRole('button', { name: 'Plot' });
    fireEvent.click(plotButton);

    expect(onAddEquation).toHaveBeenCalledWith('y = cos(x)');
  });

  it('adds equation on Enter key press', () => {
    const onAddEquation = vi.fn();
    render(
      <ControlPanel
        {...defaultProps}
        inputValue="y = x^2"
        onAddEquation={onAddEquation}
      />
    );

    const input = screen.getByPlaceholderText(/y=sin\(x\)/);
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onAddEquation).toHaveBeenCalledWith('y = x^2');
  });

  it('shows settings panel', () => {
    render(<ControlPanel {...defaultProps} />);
    expect(screen.getByText('Settings Panel')).toBeInTheDocument();
  });
});