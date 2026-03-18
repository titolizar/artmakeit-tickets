'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PlusCircle, MinusCircle, Printer, CheckCircle2, AlertCircle } from 'lucide-react';

type TicketItem = {
  qty: string;
  description: string;
};

export default function Home() {
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<TicketItem[]>([{ qty: '1', description: '' }]);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleAddItem = () => {
    if (items.length < 8) {
      setItems([...items, { qty: '1', description: '' }]);
    }
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof TicketItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || items.some(item => !item.description)) return;

    setStatus('submitting');

    const { error } = await supabase.from('tickets').insert([
      {
        customer_name: customerName,
        items: items,
        status: 'pending'
      }
    ]);

    if (error) {
      console.error('Error insertando ticket:', error);
      setStatus('error');
    } else {
      setStatus('success');
      setCustomerName('');
      setItems([{ qty: '1', description: '' }]);
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
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-neutral-900/50 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                placeholder="Ej. Juan Pérez"
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-neutral-300">
                  Ítems del Pedido ({items.length}/8)
                </label>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start group">
                    <input
                      type="text"
                      value={item.qty}
                      onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                      className="w-20 bg-neutral-900/50 border border-neutral-700 rounded-xl px-3 py-3 text-white text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                      placeholder="Ej. 1/2"
                      required
                    />
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="flex-1 bg-neutral-900/50 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                      placeholder="Ej. 1 hoja 2mm"
                      required
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-3 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-xl transition-colors shrink-0"
                      >
                        <MinusCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {items.length < 8 && (
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
