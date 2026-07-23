import React, { useState } from 'react';

interface SettingsPanelProps {
  xMin: number;
  xMax: number;
  onSettingsChange: (xMin: number, xMax: number) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ xMin, xMax, onSettingsChange }) => {
  const [localXMin, setLocalXMin] = useState(xMin.toString());
  const [localXMax, setLocalXMax] = useState(xMax.toString());

  const handleApply = () => {
    const newXMin = parseFloat(localXMin);
    const newXMax = parseFloat(localXMax);
    if (!isNaN(newXMin) && !isNaN(newXMax) && newXMin < newXMax) {
      onSettingsChange(newXMin, newXMax);
    }
  };

  return (
    <div className="settings-panel">
      <h3>Plot Settings</h3>
      <div className="settings-row">
        <label>X Min:</label>
        <input
          type="number"
          value={localXMin}
          onChange={(e) => setLocalXMin(e.target.value)}
          step="1"
        />
      </div>
      <div className="settings-row">
        <label>X Max:</label>
        <input
          type="number"
          value={localXMax}
          onChange={(e) => setLocalXMax(e.target.value)}
          step="1"
        />
      </div>
      <div className="settings-row">
        <button className="primary" onClick={handleApply}>Apply</button>
      </div>
    </div>
  );
};

export default SettingsPanel;