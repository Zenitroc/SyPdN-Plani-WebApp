import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { Button, Modal } from '../components/ui';
import { errorMessage } from '../lib/api';

type ToastTone = 'success' | 'error' | 'info';
type Toast = { id: number; tone: ToastTone; message: string; leaving?: boolean };

type ConfirmOptions = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  /** Palabra que hay que tipear para habilitar la confirmación (acciones irreversibles). */
  requireText?: string;
};

type FeedbackValue = {
  toast: { success: (message: string) => void; error: (error: unknown) => void; info: (message: string) => void };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackValue | null>(null);
const TOAST_MS = 4200;
const TOAST_EXIT_MS = 220;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (accepted: boolean) => void }) | null>(null);
  const [typed, setTyped] = useState('');
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts(current => current.map(item => (item.id === id ? { ...item, leaving: true } : item)));
    setTimeout(() => setToasts(current => current.filter(item => item.id !== id)), TOAST_EXIT_MS);
  }, []);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = nextId.current++;
    setToasts(current => [...current.slice(-3), { id, tone, message }]);
    setTimeout(() => dismiss(id), tone === 'error' ? TOAST_MS * 1.6 : TOAST_MS);
  }, [dismiss]);

  const value = useMemo<FeedbackValue>(() => ({
    toast: {
      success: message => push('success', message),
      error: error => push('error', typeof error === 'string' ? error : errorMessage(error)),
      info: message => push('info', message),
    },
    confirm: options => new Promise<boolean>(resolve => { setTyped(''); setDialog({ ...options, resolve }); }),
  }), [push]);

  const close = (accepted: boolean) => {
    dialog?.resolve(accepted);
    setDialog(null);
  };
  const blocked = Boolean(dialog?.requireText) && typed.trim().toUpperCase() !== dialog?.requireText;

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {dialog && (
        <Modal title={dialog.title} size="sm" onClose={() => close(false)}
          footer={<>
            <Button variant="ghost" onClick={() => close(false)}>Cancelar</Button>
            <Button variant={dialog.tone === 'primary' ? 'primary' : 'danger'} disabled={blocked} onClick={() => close(true)}>{dialog.confirmLabel || 'Confirmar'}</Button>
          </>}>
          <div className="confirm-body">{dialog.message}</div>
          {dialog.requireText && (
            <label className="field">
              <span className="field-label">Escribí <b>{dialog.requireText}</b> para confirmar</span>
              <input className="input" autoFocus value={typed} onChange={event => setTyped(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter' && !blocked) close(true); }} />
            </label>
          )}
        </Modal>
      )}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(item => (
          <div key={item.id} className={`toast toast-${item.tone}${item.leaving ? ' is-leaving' : ''}`}>
            <Icon name={item.tone === 'success' ? 'check-circle' : item.tone === 'error' ? 'alert' : 'info'} />
            <span>{item.message}</span>
            <button type="button" className="toast-close" onClick={() => dismiss(item.id)} aria-label="Cerrar aviso"><Icon name="x" size={14} /></button>
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackValue {
  const value = useContext(FeedbackContext);
  if (!value) throw new Error('useFeedback debe usarse dentro de <FeedbackProvider>');
  return value;
}
