import * as React from 'react';
import styles from './StudioEditor.module.scss';

interface FieldProps { label: string; id: string; hint?: string; children: React.ReactNode; wide?: boolean; }
export const Field: React.FC<FieldProps> = ({ label, id, hint, children, wide }) => (
  <div className={`${styles.field} ${wide ? styles.wide : ''}`}>
    <label htmlFor={id}>{label}</label>
    {children}
    {hint && <span className={styles.hint} id={`${id}-hint`}>{hint}</span>}
  </div>
);

interface RangeProps { label: string; id: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (value: number) => void; hint?: string; }
export const Range: React.FC<RangeProps> = ({ label, id, value, min, max, step = 1, suffix = 'px', onChange, hint }) => (
  <Field label={label} id={id} hint={hint}>
    <div className={styles.rangeRow}>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-describedby={hint ? `${id}-hint` : undefined} />
      <output htmlFor={id}>{value}{suffix}</output>
    </div>
  </Field>
);

interface ToggleProps { label: string; id: string; value: boolean; onChange: (value: boolean) => void; hint?: string; }
export const Toggle: React.FC<ToggleProps> = ({ label, id, value, onChange, hint }) => (
  <div className={styles.toggle}>
    <input id={id} type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} aria-describedby={hint ? `${id}-hint` : undefined} />
    <div><label htmlFor={id}>{label}</label>{hint && <span className={styles.hint} id={`${id}-hint`}>{hint}</span>}</div>
  </div>
);

interface ColorProps { label: string; id: string; value: string; fallback: string; onChange: (value: string) => void; }
export const ColorControl: React.FC<ColorProps> = ({ label, id, value, fallback, onChange }) => {
  const [draft, setDraft] = React.useState(value);
  const [invalid, setInvalid] = React.useState(false);
  React.useEffect(() => { setDraft(value); setInvalid(false); }, [value]);
  const validHex = (text: string): boolean => /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text);
  const commit = (): void => {
    const next = draft.trim();
    if (!next || validHex(next)) { setInvalid(false); onChange(next); }
    else setInvalid(true);
  };
  const color = value && validHex(value) ? value : (/^#[0-9a-f]{6}$/i.test(fallback) ? fallback : '#0f766e');
  const expanded = color.length === 4 ? `#${color.charAt(1)}${color.charAt(1)}${color.charAt(2)}${color.charAt(2)}${color.charAt(3)}${color.charAt(3)}` : color.slice(0, 7);
  return (
    <Field label={label} id={id}>
      <div className={styles.colorRow}>
        <input type="color" aria-label={`Choose ${label.toLowerCase()}`} value={expanded} onChange={(event) => onChange(event.target.value)} />
        <input id={id} type="text" value={draft} maxLength={9} placeholder="Theme default" spellCheck={false} onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          setInvalid(false);
          // Preview complete six/eight-digit hex colors immediately. Partial
          // values remain local until Enter/blur so typing doesn't reset itself.
          if (/^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/i.test(next)) onChange(next);
        }} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } }} aria-invalid={invalid} aria-describedby={invalid ? `${id}-error` : undefined} />
        <button type="button" className={styles.iconButton} title={`Reset ${label.toLowerCase()} to theme`} aria-label={`Reset ${label.toLowerCase()} to theme`} disabled={!value && !draft} onClick={() => { setDraft(''); setInvalid(false); onChange(''); }}>↺</button>
      </div>
      {invalid && <span className={styles.fieldError} id={`${id}-error`}>Use a hex color such as #0F766E or #0F766E80, or leave blank for the theme.</span>}
    </Field>
  );
};

