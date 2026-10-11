import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { errorMessage } from '../lib/api';
import { initials } from '../lib/format';
import type { GradeTone } from '../context/catalog';

const MASCOT = '/assets/img/tutorial/PollitoGuia1.png';
const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

/* ---------- Botones ---------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: string;
  busy?: boolean;
};

export function Button({ variant = 'primary', size = 'md', icon, busy, className, children, disabled, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={cx('btn', `btn-${variant}`, size === 'sm' && 'btn-sm', className)} disabled={disabled || busy} aria-busy={busy || undefined} {...props}>
      {busy ? <span className="spinner" /> : icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children && <span>{children}</span>}
    </button>
  );
}

export function IconButton({ icon, label, className, size = 18, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string; size?: number }) {
  return (
    <button type="button" className={cx('icon-btn', className)} aria-label={label} title={label} {...props}>
      <Icon name={icon} size={size} />
    </button>
  );
}

/* ---------- Contenedores ---------- */

export function Card({ children, className, style, title, actions }: { children: ReactNode; className?: string; style?: CSSProperties; title?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={cx('card', className)} style={style}>
      {(title || actions) && <header className="card-head"><h3>{title}</h3>{actions && <div className="card-actions">{actions}</div>}</header>}
      {children}
    </section>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Badge({ children, tone = 'neutral', icon }: { children: ReactNode; tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'; icon?: string }) {
  return <span className={`badge badge-${tone}`}>{icon && <Icon name={icon} size={12} />}{children}</span>;
}

export function Avatar({ name, src, size = 36 }: { name: string; src?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  return src
    ? <img className="avatar" style={style} src={src} alt="" />
    : <span className="avatar avatar-fallback" style={style} aria-hidden="true">{initials(name)}</span>;
}

/* ---------- Estados de carga, vacío y error ---------- */

export function Skeleton({ width, height = 14, radius }: { width?: number | string; height?: number | string; radius?: number }) {
  return <span className="skeleton" style={{ width, height, borderRadius: radius }} />;
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="table-skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="table-skeleton-row" style={{ animationDelay: `${row * 60}ms` }}>
          {Array.from({ length: columns }, (_, column) => <Skeleton key={column} width={`${column === 0 ? 12 : 60 + ((row + column) % 3) * 12}%`} />)}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, description, action, icon, mascot }: { title: string; description?: ReactNode; action?: ReactNode; icon?: string; mascot?: boolean }) {
  return (
    <div className="empty-state">
      {mascot ? <img className="empty-mascot" src={MASCOT} alt="" /> : <span className="empty-icon"><Icon name={icon || 'sparkles'} size={24} /></span>}
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="empty-state" role="alert">
      <span className="empty-icon is-danger"><Icon name="alert" size={24} /></span>
      <strong>No se pudo cargar la información</strong>
      <p>{errorMessage(error)}</p>
      {onRetry && <Button variant="secondary" icon="refresh" onClick={onRetry}>Reintentar</Button>}
    </div>
  );
}

type AsyncLike<T> = { data: T | undefined; error: Error | null; loading: boolean; reload: () => unknown };

/** Resuelve los tres estados de una consulta para que cada pantalla solo dibuje el caso con datos. */
export function Async<T>({ query, skeleton, children }: { query: AsyncLike<T>; skeleton?: ReactNode; children: (data: T) => ReactNode }) {
  if (query.data !== undefined) return <>{children(query.data)}</>;
  if (query.error) return <ErrorState error={query.error} onRetry={() => query.reload()} />;
  return <>{skeleton ?? <TableSkeleton />}</>;
}

/* ---------- Formularios ---------- */

export function Field({ label, hint, error, children, className }: { label: ReactNode; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('field', className)}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Buscar…', autoFocus }: { value: string; onChange: (value: string) => void; placeholder?: string; autoFocus?: boolean }) {
  return (
    <div className="search-input">
      <Icon name="search" size={16} />
      <input type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} autoFocus={autoFocus} />
      {value && <button type="button" onClick={() => onChange('')} aria-label="Limpiar búsqueda"><Icon name="x" size={14} /></button>}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (value: T) => void; options: { value: T; label: ReactNode }[]; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map(option => (
        <button key={option.value} type="button" role="radio" aria-checked={option.value === value}
          className={option.value === value ? 'is-active' : ''} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (checked: boolean) => void; label: ReactNode; disabled?: boolean }) {
  return (
    <label className={cx('switch', disabled && 'is-disabled')}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} />
      <span className="switch-track"><span className="switch-thumb" /></span>
      <span>{label}</span>
    </label>
  );
}

/** Casilla con estilo propio; `tone` colorea el estado marcado. */
export function Check({ checked, onChange, label, disabled, tone }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean; tone?: 'success' }) {
  return (
    <label className={cx('check', tone && `check-${tone}`)} title={label}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} aria-label={label} />
      <span className="check-box"><Icon name="check" size={13} /></span>
    </label>
  );
}

/** Selector de nota que se pinta según si aprueba o no. */
export function GradeSelect({ value, options, tone, onChange, disabled, label }: { value: string | null; options: string[]; tone: GradeTone; onChange: (value: string | null) => void; disabled?: boolean; label: string }) {
  const known = !value || options.includes(value);
  return (
    <select className={`grade grade-${tone}`} value={value ?? ''} disabled={disabled} aria-label={label} title={label}
      onChange={event => onChange(event.target.value || null)}>
      <option value="">—</option>
      {!known && <option value={value as string}>{value}</option>}
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

export function ImagePicker({ value, onPick, onClear, label, round }: { value: string | null; onPick: (file: File) => void; onClear?: () => void; label: string; round?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="image-picker">
      <button type="button" className={cx('image-picker-preview', round && 'is-round')} onClick={() => input.current?.click()} aria-label={label}>
        {value ? <img src={value} alt="" /> : <Icon name="image" size={22} />}
      </button>
      <div className="image-picker-actions">
        <Button variant="secondary" size="sm" icon="upload" onClick={() => input.current?.click()}>{value ? 'Cambiar' : label}</Button>
        {value && onClear && <Button variant="ghost" size="sm" onClick={onClear}>Quitar</Button>}
      </div>
      <input ref={input} type="file" accept="image/*" hidden
        onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onPick(file); }} />
    </div>
  );
}

/* ---------- Superposiciones ---------- */

// Modales abiertos, del más viejo al más nuevo (un confirm sobre un formulario): solo el de arriba atiende el teclado.
const modalStack: object[] = [];

export function Modal({ title, subtitle, children, footer, onClose, size = 'md' }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; onClose: () => void; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const self = {};
    modalStack.push(self);
    const onKey = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== self) return;
      if (event.key === 'Escape') { event.stopPropagation(); onCloseRef.current(); }
      if (event.key !== 'Tab' || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    document.body.classList.add('has-modal');
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey, true);
      modalStack.splice(modalStack.indexOf(self), 1);
      if (!modalStack.length) document.body.classList.remove('has-modal');
      previouslyFocused?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panel} className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <IconButton icon="x" label="Cerrar" onClick={onClose} />
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/** Menú desplegable anclado a un botón (acciones de fila, usuario, etc.). */
export function Menu({ trigger, children, align = 'end', side = 'bottom' }: { trigger: (props: { onClick: () => void; 'aria-expanded': boolean }) => ReactNode; children: (close: () => void) => ReactNode; align?: 'start' | 'end'; side?: 'bottom' | 'top' }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="menu" ref={root}>
      {trigger({ onClick: () => setOpen(value => !value), 'aria-expanded': open })}
      {open && <div className={`menu-panel menu-${align}${side === 'top' ? ' menu-up' : ''}`} role="menu">{children(() => setOpen(false))}</div>}
    </div>
  );
}

export function MenuItem({ icon, children, onClick, tone }: { icon?: string; children: ReactNode; onClick: () => void; tone?: 'danger' }) {
  return (
    <button type="button" role="menuitem" className={cx('menu-item', tone === 'danger' && 'is-danger')} onClick={onClick}>
      {icon && <Icon name={icon} size={16} />}<span>{children}</span>
    </button>
  );
}

/* ---------- Datos ---------- */

export function Progress({ value, tone = 'brand' }: { value: number | null; tone?: 'brand' | 'success' | 'warning' | 'danger' }) {
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? undefined}>
      <i className={`progress-${tone}`} style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
    </div>
  );
}

/** Color de un porcentaje de aprobación respecto del umbral del catálogo. */
export const ratioTone = (ratio: number | null, threshold: number): 'success' | 'warning' | 'danger' | 'brand' =>
  ratio == null ? 'brand' : ratio > threshold + 15 ? 'success' : ratio > threshold ? 'warning' : 'danger';

/** Número que cuenta hasta su valor al aparecer o cambiar. */
export function CountUp({ value, suffix = '' }: { value: number | null; suffix?: string }) {
  const [shown, setShown] = useState(value ?? 0);
  const from = useRef(0);

  useEffect(() => {
    if (value == null) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); from.current = value; return; }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 700);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(Math.round(origin + (value - origin) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{value == null ? '—' : `${shown}${suffix}`}</>;
}

export function Kpi({ label, value, suffix, meta, icon, tone = 'brand' }: { label: string; value: number | null; suffix?: string; meta?: ReactNode; icon: string; tone?: 'brand' | 'success' | 'warning' | 'info' }) {
  return (
    <article className={`kpi kpi-${tone}`}>
      <span className="kpi-icon"><Icon name={icon} size={20} /></span>
      <p className="kpi-label">{label}</p>
      <strong className="kpi-value"><CountUp value={value} suffix={suffix} /></strong>
      {meta && <small className="kpi-meta">{meta}</small>}
    </article>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (value: T) => void; tabs: { value: T; label: string; icon?: string; count?: number }[] }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(tab => (
        <button key={tab.value} type="button" role="tab" aria-selected={tab.value === value} className={tab.value === value ? 'is-active' : ''} onClick={() => onChange(tab.value)}>
          {tab.icon && <Icon name={tab.icon} size={16} />}{tab.label}
          {tab.count != null && <span className="tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export { cx };
