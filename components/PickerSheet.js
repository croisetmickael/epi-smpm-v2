// components/PickerSheet.js
import { useState } from "react";

export default function PickerSheet({
  title,
  options,
  onSelect,
  onClose,
  multiSelect = false,
  initialSelected = [],
}) {
  const [selected, setSelected] = useState(initialSelected);

  function handleSelect(value) {
    if (multiSelect) {
      // Multi-select : toggle
      setSelected((s) =>
        s.includes(value) ? s.filter((v) => v !== value) : [...s, value]
      );
    } else {
      // Single-select : fermer immédiatement
      onSelect(value);
    }
  }

  function handleConfirm() {
    if (multiSelect) {
      onSelect(selected);
      onClose();
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              className="sheet-option"
              style={{
                background: isSelected ? "var(--green)" : "transparent",
                fontWeight: 600,
                color: isSelected ? "#fff" : "var(--ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "14px 20px",
                fontSize: 16,
              }}
              onClick={() => handleSelect(opt)}
            >
              {opt}
            </button>
          );
        })}
        {multiSelect ? (
          <>
            <button
              className="sheet-cancel"
              style={{
                background: "var(--gold)",
                color: "var(--navy)",
                fontWeight: 700,
                marginBottom: 8,
              }}
              onClick={handleConfirm}
              disabled={selected.length === 0}
            >
              Valider ({selected.length} sélectionné{selected.length > 1 ? "s" : ""})
            </button>
            <button className="sheet-cancel" onClick={onClose}>
              Annuler
            </button>
          </>
        ) : (
          <button className="sheet-cancel" onClick={onClose}>
            Fermer
          </button>
        )}
      </div>
    </div>
  );
}
