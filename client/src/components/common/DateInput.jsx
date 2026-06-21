import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { formatDate, parseDisplayDate } from "../../utils/date";

const formatTypingValue = (value) => {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(
    Boolean
  );

  return parts.join("/");
};

function DateInput({ label, value = "", onChange, required = false, disabled = false }) {
  const [displayValue, setDisplayValue] = useState(() => formatDate(value, ""));

  useEffect(() => {
    setDisplayValue(formatDate(value, ""));
  }, [value]);

  const handleTextChange = (event) => {
    const nextDisplayValue = formatTypingValue(event.target.value);
    const parsedValue = parseDisplayDate(nextDisplayValue);

    setDisplayValue(nextDisplayValue);

    if (!nextDisplayValue) {
      onChange?.("");
    } else if (parsedValue) {
      onChange?.(parsedValue);
    }
  };

  const handleBlur = () => {
    const parsedValue = parseDisplayDate(displayValue);

    if (!parsedValue) {
      setDisplayValue(formatDate(value, ""));
    }
  };

  const handlePickerChange = (event) => {
    onChange?.(event.target.value);
  };

  return (
    <label className="field">
      {label && <span>{label}</span>}
      <div className="date-input-control">
        <input
          disabled={disabled}
          inputMode="numeric"
          pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}"
          placeholder="dd/mm/yyyy"
          required={required}
          type="text"
          value={displayValue}
          onBlur={handleBlur}
          onChange={handleTextChange}
        />
        <CalendarDays aria-hidden="true" className="date-input-icon" size={17} />
        <input
          aria-label={`${label || "Date"} calendar`}
          className="date-input-picker"
          disabled={disabled}
          lang="en-GB"
          tabIndex={-1}
          type="date"
          value={value}
          onChange={handlePickerChange}
        />
      </div>
    </label>
  );
}

export default DateInput;
