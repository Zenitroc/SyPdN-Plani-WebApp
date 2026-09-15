import { useEffect } from 'react';

export function Button({ children, busy, variant = 'primary', ...props }) { return <button className={`button ${variant}`} disabled={busy || props.disabled} {...props}>{busy && <span className="spinner" />} {children}</button>; }
export function Card({ children, className = '' }) { return <section className={`card ${className}`}>{children}</section>; }
export function EmptyState({ title, description }) { return <div className="empty-state"><strong>{title}</strong><span>{description}</span></div>; }
export function LoadingState() { return <div className="loading-state" role="status"><span className="spinner" /> Cargando información…</div>; }
export function Badge({ children, tone = 'neutral' }) { return <span className={`badge ${tone}`}>{children}</span>; }
export function Modal({ title, children, onClose }) { useEffect(() => { const handler = (event) => event.key === 'Escape' && onClose(); addEventListener('keydown', handler); return () => removeEventListener('keydown', handler); }, [onClose]); return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()}><header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Cerrar">×</button></header>{children}</section></div>; }
