// Local stand-ins for @graftcode/design-system (the real one lives in a private
// npm registry). These mirror only the props perf-lab actually uses, so the app
// builds and runs locally for testing.
import { useId } from 'react'

export function Button({ variant = 'primary', className = '', children, ...rest }) {
  return (
    <button className={`ds-btn ds-btn-${variant} ${className}`.trim()} {...rest}>
      {children}
    </button>
  )
}

export function Checkbox({ id, checked, onChange, label }) {
  const fallbackId = useId()
  const inputId = id || fallbackId
  return (
    <label className="ds-checkbox" htmlFor={inputId}>
      <input
        id={inputId}
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      {label && <span>{label}</span>}
    </label>
  )
}

export function ProgressIndicator({ className = '', value = 0, size, ...rest }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div
      className={`ds-progress ds-progress-${size || 'medium'} ${className}`.trim()}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      {...rest}
    >
      <div className="ds-progress-bar" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Select({ id, label, value, options = [], onValueChange, ...rest }) {
  const fallbackId = useId()
  const selectId = id || fallbackId
  return (
    <span className="ds-select">
      {label && <label htmlFor={selectId}>{label}</label>}
      <select
        id={selectId}
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </span>
  )
}
