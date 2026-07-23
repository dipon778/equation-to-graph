import EquationList from './EquationList';
import SettingsPanel from './SettingsPanel';
import type { EquationItem } from '../types';

interface ControlPanelProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onAddEquation: (equation: string) => void;
  equations: EquationItem[];
  onRemoveEquation: (equation: string) => void;
  onToggleVisibility: (formula: string) => void;
  onEditEquation: (oldFormula: string, newFormula: string) => void;
  onClearAll: () => void;
  xMin: number;
  xMax: number;
  onSettingsChange: (xMin: number, xMax: number) => void;
}

const quotes = [
  '"Mathematics is the art of giving the same name to different things." — Henri Poincaré',
  '"Pure mathematics is, in its way, the poetry of logical ideas." — Albert Einstein',
  '"The only way to learn mathematics is to do mathematics." — Paul Halmos',
  '"Mathematics is not about numbers, equations, computations, or algorithms: it is about understanding." — William Paul Thurston',
  '"Without mathematics, there is nothing you can do. Everything around you is mathematics." — Shakuntala Devi',
];

const ControlPanel: React.FC<ControlPanelProps> = ({
  inputValue,
  onInputChange,
  onAddEquation,
  equations,
  onRemoveEquation,
  onToggleVisibility,
  onEditEquation,
  onClearAll,
  xMin,
  xMax,
  onSettingsChange,
}) => {
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onInputChange(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleAddEquation();
    }
  };

  const handleAddEquation = () => {
    if (inputValue && !equations.some((eq) => eq.formula === inputValue)) {
      onAddEquation(inputValue);
    }
  };

  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

  return (
    <div className="control-panel">
      <div className="input-container">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="y=sin(x) | x^2+y^2<4 | x=cos(t),y=sin(t) | r=1+cos(t)"
        />
        <button onClick={handleAddEquation}>Plot</button>
      </div>

      <EquationList
        equations={equations}
        onDelete={onRemoveEquation}
        onToggleVisibility={onToggleVisibility}
        onEdit={onEditEquation}
      />
      {equations.length > 0 && (
        <button className="clear-all-btn" onClick={onClearAll}>Clear All</button>
      )}
      <SettingsPanel xMin={xMin} xMax={xMax} onSettingsChange={onSettingsChange} />

      <div className="quote-section">
        <p className="quote-text">{randomQuote}</p>
      </div>
    </div>
  );
};

export default ControlPanel;