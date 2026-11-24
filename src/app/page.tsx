'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { supabase } from '@/lib/supabase';
import { Minus, Plus, PlusCircle, Trash2, Printer, CheckCircle2, AlertCircle } from 'lucide-react';

type TicketItem = {
  qty: string;
  description: string;
};

type Draft = {
  customerName: string;
  items: TicketItem[];
};

const MAX_ITEMS = 20;
const DRAFT_KEY = 'artmakeit-ticket-draft';

const emptyItem = (): TicketItem => ({ qty: '1', description: '' });

const isTicketItem = (value: unknown): value is TicketItem => {
  const item = value as TicketItem | null;
  return typeof item?.qty === 'string' && typeof item?.description === 'string';
};

function loadDraft(): Draft {
  const empty: Draft = { customerName: '', items: [emptyItem()] };
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null');
    if (typeof draft?.customerName !== 'string' || !Array.isArray(draft.items)) return empty;
    const items = draft.items.filter(isTicketItem).slice(0, MAX_ITEMS);
    return { customerName: draft.customerName, items: items.length > 0 ? items : empty.items };
  } catch {
    return empty;
  }
}

// Suma o resta 1 a cantidades enteras; las fracciones como "1/2" se editan a mano.
function stepQty(qty: string, delta: 1 | -1): string | null {
  const text = qty.trim();
  if (text === '') return delta === 1 ? '1' : null;
  if (!/^\d+$/.test(text)) return null;
  const next = Number(text) + delta;
  return next >= 1 ? String(next) : null;
}

const subscribeNever = () => () => {};

export default function Home() {
  // El borrador vive en el navegador, así que el formulario solo se monta en el cliente.
  const isClient = useSyncExternalStore(subscribeNever, () => true, () => false);
  return isClient ? <TicketForm /> : <div className="min-h-screen bg-neutral-900" />;
}

function TicketForm() {
  const [initialDraft] = useState(loadDraft);
  const [customerName, setCustomerName] = useState(initialDraft.customerName);
  const [items, setItems] = useState<TicketItem[]>(initialDraft.items);
  const [formError, setFormError] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ customerName, items }));
    } catch {
      // Sin almacenamiento disponible: la app funciona, solo que sin borrador.
    }
  }, [customerName, items]);

  const handleAddItem = () => {
    if (items.length < MAX_ITEMS) {
      setItems([...items, emptyItem()]);
    }
  };

  const handleRemoveItem = (index: number) => {
    const remaining = items.filter((_, i) => i !== index);
    // Siempre queda al menos una fila: si se borra la única, se vacía.
    setItems(remaining.length > 0 ? remaining : [emptyItem()]);
  };

  const handleItemChange = (index: number, field: keyof TicketItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    setFormError('');
  };

  const handleStepQty = (index: number, delta: 1 | -1) => {
    const next = stepQty(items[index].qty, delta);
    if (next !== null) handleItemChange(index, 'qty', next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filledItems = items.filter(item => item.description.trim() !== '');
    if (!customerName.trim()) {
      setFormError('Escribe el nombre del cliente.');
      return;
    }
    if (filledItems.length === 0) {
      setFormError('Escribe al menos un ítem.');
      return;
    }
    setFormError('');

    setStatus('submitting');

    const { error } = await supabase.from('tickets').insert([
      {
        customer_name: customerName,
        items: filledItems,
        status: 'pending'
      }
    ]);

    if (error) {
      console.error('Error insertando ticket:', error);
      setStatus('error');
    } else {
      setStatus('success');
      setCustomerName('');
      setItems([emptyItem()]);
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const dateStr = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-4 md:p-8 font-sans selection:bg-purple-500/30">
      <main className="max-w-xl mx-auto">
        <header className="mb-8 text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-purple-500/10 rounded-2xl mb-4">
            <Printer className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">ArtMakeit</h1>
          <p className="text-neutral-400 tracking-wide text-sm font-medium">SISTEMA REMOTO DE TICKETS</p>
          <p className="text-xs text-neutral-500 capitalize">{dateStr}</p>
        </header>

        <form onSubmit={handleSubmit} className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700/50 p-6 rounded-3xl shadow-2xl space-y-6 relative overflow-hidden">
          
          {/* Form Content */}
          <div className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label htmlFor="customerName" className="block text-sm font-medium text-neutral-300">
                Nombre del Cliente
              </label>
              <input
                type="text"
                id="customerName"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setFormError('');
                }}
                className="w-full bg-neutral-900/50 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                placeholder="Ej. Juan Pérez"
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-neutral-300">
                  Ítems del Pedido ({items.length}/{MAX_ITEMS})
                </label>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap sm:flex-nowrap gap-2 items-center rounded-2xl border border-neutral-700/50 p-2 sm:border-0 sm:p-0"
                  >
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      aria-label={`Material del ítem ${index + 1}`}
                      className="order-1 sm:order-2 basis-full sm:basis-0 grow min-w-0 bg-neutral-900/50 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                      placeholder="Ej. 1 hoja 2mm"
                    />
                    <div className="order-2 sm:order-1 flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStepQty(index, -1)}
                        disabled={stepQty(item.qty, -1) === null}
                        aria-label={`Restar cantidad del ítem ${index + 1}`}
                        className="p-3 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-xl transition-colors disabled:opacity-30"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <input
                        type="text"
                        value={item.qty}
                        onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                        aria-label={`Cantidad del ítem ${index + 1}`}
                        className="w-16 bg-neutral-900/50 border border-neutral-700 rounded-xl px-2 py-3 text-white text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                        placeholder="Ej. 1/2"
                        required={item.description.trim() !== ''}
                      />
                      <button
                        type="button"
                        onClick={() => handleStepQty(index, 1)}
                        disabled={stepQty(item.qty, 1) === null}
                        aria-label={`Sumar cantidad del ítem ${index + 1}`}
                        className="p-3 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-xl transition-colors disabled:opacity-30"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      aria-label={`Borrar ítem ${index + 1}`}
                      className="order-3 ml-auto p-3 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors shrink-0"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {items.length < MAX_ITEMS && (
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-xl transition-colors dashed-border border border-dashed border-purple-500/30"
                >
                  <PlusCircle className="w-4 h-4" />
                  Añadir ítem
                </button>
              )}
            </div>
            
            {formError && (
              <p role="alert" className="text-sm text-red-400 text-center">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {status === 'submitting' ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </span>
              ) : (
                <>
                  <Printer className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                  Enviar a Imprimir
                </>
              )}
            </button>
          </div>
          
          {/* Status Overlay */}
          <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-neutral-800/95 backdrop-blur-md transition-all duration-300 ${status === 'success' || status === 'error' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            {status === 'success' && (
              <>
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4" />
                <h3 className="text-xl font-bold text-white">¡Ticket Enviado!</h3>
                <p className="text-neutral-400 mt-2">Se imprimirá en el local pronto.</p>
              </>
            )}
            {status === 'error' && (
              <>
                <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
                <h3 className="text-xl font-bold text-white">Error de Envío</h3>
                <p className="text-neutral-400 mt-2">Hubo un problema de conexión.</p>
                <button 
                  type="button" 
                  onClick={() => setStatus('idle')} 
                  className="mt-6 px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600"
                >
                  Intentar de nuevo
                </button>
              </>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
