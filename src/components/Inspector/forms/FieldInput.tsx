// components/Inspector/forms/FieldInput.tsx
// Campos do formulário gerado a partir do schema de um pacote (um campo e a lista de itens).
import { ColorField } from '@components/common/ColorField';
import { Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import type { FormField, FormOption } from '../../../packages/core/types';

import { fieldVisible } from './fieldVisibility';

/* -------------------------------------------------------------------------- */
/* Option label                                                               */
/* -------------------------------------------------------------------------- */

function optionLabel(option: FormOption): string {
  return option[1];
}

function optionValue(option: FormOption): string {
  return option[0];
}

/* -------------------------------------------------------------------------- */
/* Field inputs                                                               */
/* -------------------------------------------------------------------------- */

interface FieldInputProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function FieldInput({ field, value, onChange }: FieldInputProps): JSX.Element {
  const { type, placeholder, min, max, step, unit, rows, options } = field;

  const set = useCallback((next: unknown) => onChange(next), [onChange]);

  switch (type) {
    case 'code': {
      // Contrato do monólito: textarea monoespaçada, rows, sem corretor e
      // Tab insere 4 espaços na posição do cursor.
      return (
        <textarea
          className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-cream outline-none focus:border-accent/40 transition font-mono min-h-[320px] resize-y"
          rows={rows ?? 4}
          spellCheck={false}
          placeholder={placeholder ?? undefined}
          value={String(value ?? '')}
          onChange={(event) => set(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Tab') return;
            event.preventDefault();
            const el = event.currentTarget;
            const start = el.selectionStart ?? 0;
            const end = el.selectionEnd ?? 0;
            el.value = el.value.slice(0, start) + '    ' + el.value.slice(end);
            el.selectionStart = el.selectionEnd = start + 4;
            set(el.value);
          }}
        />
      );
    }
    case 'color': {
      return (
        <ColorField
          value={String(value ?? '')}
          onChange={set}
          compact={parseInt(field.w ?? '', 10) <= 48}
          ariaLabel={field.title ?? field.label ?? 'Cor'}
        />
      );
    }
    case 'text':
    default: {
      return (
        <input
          className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-cream outline-none focus:border-accent/40 transition"
          type="text"
          placeholder={placeholder ?? undefined}
          value={String(value ?? '')}
          onChange={(event) => set(event.target.value)}
        />
      );
    }
    case 'textarea': {
      return (
        <textarea
          className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-cream outline-none focus:border-accent/40 transition"
          placeholder={placeholder ?? undefined}
          value={String(value ?? '')}
          rows={rows ?? 4}
          onChange={(event) => set(event.target.value)}
        />
      );
    }
    case 'number': {
      return (
        <input
          className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-cream outline-none focus:border-accent/40 transition"
          type="number"
          min={min ?? undefined}
          max={max ?? undefined}
          step={step ?? undefined}
          value={value == null ? '' : String(value)}
          onChange={(event) =>
            set(event.target.value === '' ? undefined : Number(event.target.value))
          }
        />
      );
    }
    case 'range': {
      const n = typeof value === 'number' ? value : 0;
      return (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px] text-cream/40">
            <span>
              {String(min ?? 0)}
              {unit ?? ''}
            </span>
            <span>
              {String(max ?? 100)}
              {unit ?? ''}
            </span>
          </div>
          <input
            className="w-full accent-accent h-1.5"
            type="range"
            min={min ?? 0}
            max={max ?? 100}
            step={step ?? 1}
            value={n}
            onChange={(event) => set(Number(event.target.value))}
          />
          <div className="text-[10px] text-cream/50">
            {String(n)}
            {unit ?? ''}
          </div>
        </div>
      );
    }
    case 'select': {
      return (
        <select
          className="w-full rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-cream outline-none focus:border-accent/40 transition"
          value={String(value ?? '')}
          onChange={(event) => set(event.target.value)}
        >
          {(options ?? []).map((option) => (
            <option key={optionValue(option)} value={optionValue(option)}>
              {optionLabel(option)}
            </option>
          ))}
        </select>
      );
    }
    case 'toggle': {
      return (
        <button
          className={`flex items-center justify-between rounded-md border px-2 py-1.5 text-xs transition ${
            value ? 'border-accent/60 bg-accent/10 text-accent' : 'border-white/10 text-cream/50'
          }`}
          onClick={() => set(!value)}
          role="switch"
          aria-checked={!!value}
        >
          <span>{value ? 'Ligado' : 'Desligado'}</span>
          <span className={`block w-4 h-2 rounded-full ${value ? 'bg-accent' : 'bg-white/10'}`} />
        </button>
      );
    }
    case 'check': {
      return (
        <button
          className={`rounded-md border px-1.5 py-1 text-xs transition ${
            value ? 'border-accent/60 bg-accent/10 text-accent' : 'border-white/10 text-cream/50'
          }`}
          onClick={() => set(!value)}
          role="checkbox"
          aria-checked={!!value}
        >
          {value ? '✓' : '☐'}
        </button>
      );
    }
    case 'seg': {
      return (
        <div className="inline-grid grid-cols-auto flow-wrap gap-1">
          {(options ?? []).map((option) => {
            const active = String(value ?? '') === optionValue(option);
            return (
              <button
                key={optionValue(option)}
                className={`rounded-md border px-2 py-1 text-[10px] font-medium transition ${
                  active
                    ? 'border-accent/60 bg-accent/10 text-accent'
                    : 'border-white/10 text-cream/50 hover:bg-white/5'
                }`}
                onClick={() => set(optionValue(option))}
              >
                {optionLabel(option)}
              </button>
            );
          })}
        </div>
      );
    }
  }
}

/* -------------------------------------------------------------------------- */
/* List field                                                                 */
/* -------------------------------------------------------------------------- */

interface ListItemInputProps {
  field: FormField;
  items: Record<string, unknown>[];
  onItemsChange: (items: Record<string, unknown>[]) => void;
}

export function ListItemInput({ field, items, onItemsChange }: ListItemInputProps): JSX.Element {
  const itemFields = field.item ?? [];
  const itemDefault = useMemo(() => field.itemDefault ?? {}, [field.itemDefault]);

  const addItem = useCallback(() => {
    onItemsChange([...items, { ...itemDefault }]);
  }, [items, itemDefault, onItemsChange]);

  const removeItem = useCallback(
    (index: number) => () => {
      onItemsChange(items.filter((_item, i) => i !== index));
    },
    [items, onItemsChange]
  );

  const setItemField = useCallback(
    (itemIndex: number, fk: string, value: unknown) => {
      const next = items.map((item, i) => {
        if (i !== itemIndex) return item;
        return { ...item, [fk]: value };
      });
      onItemsChange(next);
    },
    [items, onItemsChange]
  );

  const columns = [...itemFields.filter((f) => f.k).map((f) => f.w ?? '1fr'), '22px'].join(' ');

  return (
    <div className="space-y-1.5">
      <div className="max-h-72 space-y-1 overflow-y-auto pr-0.5">
        {items.map((item, index) => (
          <div
            key={index}
            className="grid items-center gap-1.5 rounded-md border border-white/10 bg-black/20 px-1.5 py-1"
            style={{ gridTemplateColumns: columns }}
          >
            {itemFields.map((f) => {
              const fk = f.k;
              if (!fk || !fieldVisible(f, item)) return fk ? <span key={fk} /> : null;
              return (
                <FieldInput
                  key={fk}
                  field={f}
                  value={item[fk]}
                  onChange={(value) => setItemField(index, fk, value)}
                />
              );
            })}
            <button
              type="button"
              className="grid h-5 w-5 place-items-center text-cream/40 transition hover:text-accent"
              onClick={removeItem(index)}
              aria-label={`Remover item ${index + 1}`}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-[10px] text-cream/50 hover:text-accent hover:border-accent/40 transition"
        onClick={addItem}
      >
        <Plus size={12} /> {field.addLabel ?? 'Adicionar item'}
      </button>
    </div>
  );
}
