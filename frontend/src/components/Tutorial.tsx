import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, IconButton } from './ui';

type Step = { title: string; text: string; mascotId?: string };
type TutorialConfig = {
  defaultMascotId: string;
  mascots: { id: string; name: string; image: string }[];
  pages: Record<string, Step[]>;
};

// Los textos de la guía viven en un JSON público para poder editarlos sin recompilar.
const CONFIG_URL = '/assets/data/tutorial-config.json';
let configPromise: Promise<TutorialConfig> | null = null;
const loadConfig = () => (configPromise ??= fetch(CONFIG_URL).then(response => {
  if (!response.ok) throw new Error('No se pudo cargar la guía.');
  return response.json();
}).catch(error => { configPromise = null; throw error; }));

/** Guía paso a paso de la pantalla actual, narrada por la mascota. */
export function Tutorial({ pageKey, onClose }: { pageKey: string; onClose: () => void }) {
  const [config, setConfig] = useState<TutorialConfig | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    loadConfig().then(value => { if (alive) setConfig(value); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const steps = config?.pages[pageKey] ?? [];
  const step = steps[index];
  const mascot = config?.mascots.find(item => item.id === (step?.mascotId || config.defaultMascotId)) ?? config?.mascots[0];

  return createPortal(
    <aside className="tutorial" role="dialog" aria-label="Guía de la pantalla">
      {mascot && <img className="tutorial-mascot" src={mascot.image} alt={mascot.name} />}
      <div className="tutorial-bubble">
        <IconButton icon="x" label="Cerrar guía" className="tutorial-close" onClick={onClose} size={16} />
        {step ? (
          <>
            <p className="eyebrow">Paso {index + 1} de {steps.length}</p>
            <h3>{step.title}</h3>
            <p key={index} className="tutorial-text">{step.text}</p>
            <div className="tutorial-dots" aria-hidden="true">{steps.map((_, position) => <i key={position} className={position === index ? 'is-active' : ''} />)}</div>
            <div className="tutorial-actions">
              <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => setIndex(index - 1)}>Anterior</Button>
              {index < steps.length - 1
                ? <Button size="sm" onClick={() => setIndex(index + 1)}>Siguiente</Button>
                : <Button size="sm" icon="check" onClick={onClose}>Entendido</Button>}
            </div>
          </>
        ) : (
          <p className="tutorial-text">{failed ? 'No pude cargar la guía. Probá de nuevo en un rato.' : config ? 'Todavía no tengo una guía para esta pantalla.' : 'Cargando la guía…'}</p>
        )}
      </div>
    </aside>,
    document.body,
  );
}
