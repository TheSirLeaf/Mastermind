import { ColorField } from '@components/common/ColorField';
import { zodResolver } from '@hookform/resolvers/zod';
import { BarChart3, Code2, Palette, Play, Plus, Table2, Trash2, Type } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { z, type ZodTypeAny } from 'zod';

import type { FormField, FormGroup, FormOption, FormSchema } from '../../../packages/core/types';
import { InspectorSection } from '../InspectorSection';

interface FormGeneratorProps {
  schema: FormSchema;
  spec: Record<string, unknown>;
  onChange: (spec: Record<string, unknown>) => void;
}

/* -------------------------------------------------------------------------- */
/* Zod schema                                                                 */
/* -------------------------------------------------------------------------- */

function fieldToZod(field: FormField): ZodTypeAny {
  switch (field.type) {
    case 'toggle':
    case 'check':
      return z.boolean().optional();
    case 'number':
    case 'range':
      return z.coerce.number().optional();
    case 'select':
    case 'seg':
      return z.string().optional();
    case 'list':
      return z.array(z.record(z.string(), z.unknown())).optional();
    default:
      return z.string().optional();
  }
}

function buildZodSchema(schema: FormSchema): ZodTypeAny {
  const shape: Record<string, ZodTypeAny> = {};
  for (const group of schema) {
    for (const field of group.fields) {
      if (field.k) shape[field.k] = fieldToZod(field);
    }
  }
  return z.object(shape);
}

const ICON_CLASS = 'h-4 w-4 text-accent';

/** Ícone do grupo, a partir do nome usado nos esquemas dos pacotes. */
function groupIcon(name: string | undefined): JSX.Element | null {
  switch (name) {
    case 'chart':
      return <BarChart3 className={ICON_CLASS} />;
    case 'table':
      return <Table2 className={ICON_CLASS} />;
    case 'design':
      return <Palette className={ICON_CLASS} />;
    case 'play':
      return <Play className={ICON_CLASS} />;
    case 'code':
      return <Code2 className={ICON_CLASS} />;
    case 'text':
      return <Type className={ICON_CLASS} />;
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Visibility                                                                 */
/* -------------------------------------------------------------------------- */

function fieldVisible(field: FormField, values: Record<string, unknown>): boolean {
  const showIf = field.showIf;
  if (!showIf) return true;
  const current = values[showIf.k];
  if (showIf.eq !== undefined) return current === showIf.eq;
  if (showIf.ne !== undefined) return current !== showIf.ne;
  if (showIf.in !== undefined) {
    const allowed = Array.isArray(showIf.in) ? showIf.in : [];
    return allowed.includes(current as unknown);
  }
  return true;
}

function visibleFields(groups: FormGroup[], values: Record<string, unknown>): FormGroup[] {
  return groups.map((group) => ({
    ...group,
    fields: group.fields.filter((field) => fieldVisible(field, values)),
  }));
}

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

function FieldInput({ field, value, onChange }: FieldInputProps): JSX.Element {
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

function ListItemInput({ field, items, onItemsChange }: ListItemInputProps): JSX.Element {
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

/* -------------------------------------------------------------------------- */
/* Form group section                                                         */
/* -------------------------------------------------------------------------- */

interface FormGroupSectionProps {
  group: FormGroup;
  /** O primeiro grupo começa aberto; os demais, recolhidos (acordeão). */
  first: boolean;
  allValues: Record<string, unknown>;
  handleFieldChange: (k: string, value: unknown) => void;
  handleListChange: (k: string, items: Record<string, unknown>[]) => void;
  getValues: (k: string) => unknown;
  spec: Record<string, unknown>;
  errors: FieldErrors<Record<string, unknown>>;
}

function FormGroupSection({
  group,
  first,
  allValues,
  handleFieldChange,
  handleListChange,
  getValues,
  spec,
  errors,
}: FormGroupSectionProps): JSX.Element | null {
  const visibleFieldsList = group.fields.filter((f) => fieldVisible(f, allValues));
  if (visibleFieldsList.length === 0) return null;
  return (
    <InspectorSection
      id={group.group}
      group="pkg-form"
      title={group.group}
      icon={groupIcon(group.icon)}
      defaultOpen={group.open ?? first}
    >
      <div className="space-y-2">
        {visibleFieldsList.map((field, position) => {
          if (!field.k) {
            // row / info / buttons: layout-only fields
            if (field.type === 'row') {
              return (
                <div key={`${field.type}-${position}`}>
                  <div className="grid grid-cols-2 gap-2">
                    {field.fields?.map((f) => {
                      const fk = f.k;
                      if (!fk || !fieldVisible(f, allValues)) return null;
                      return (
                        <div key={fk} className="flex flex-col gap-0.5">
                          {f.label && <span className="text-[10px] text-cream/40">{f.label}</span>}
                          <FieldInput
                            field={f}
                            value={getValues(fk)}
                            onChange={(value) => handleFieldChange(fk, value)}
                          />
                          {f.type === 'range' && f.unit && (
                            <span className="text-[9px] text-cream/40">{f.unit}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            if (field.type === 'info') {
              return (
                <div
                  key={`${field.type}-${position}`}
                  className="text-xs text-cream/40 leading-relaxed"
                >
                  {field.text ?? ''}
                </div>
              );
            }
            if (field.type === 'buttons') {
              return (
                <div key={`${field.type}-${position}`}>
                  <div className="flex gap-2">
                    {(field.items ?? []).map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] text-cream/50 hover:bg-white/5 hover:text-accent transition"
                        onClick={() => action.do(spec)}
                      >
                        {action.icon && <span className="text-cream/50">{action.icon}</span>}
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          }

          const visible = fieldVisible(field, allValues);
          if (!visible) return null;

          const fk = field.k;
          if (!fk) return null;
          if (field.type === 'list') {
            return (
              <div key={fk}>
                <span className="text-[10px] uppercase tracking-widest text-cream/40 mb-1 block">
                  {field.label ?? fk}
                </span>
                <ListItemInput
                  field={field}
                  items={(getValues(fk) as Record<string, unknown>[]) ?? []}
                  onItemsChange={(items) => handleListChange(fk, items)}
                />
              </div>
            );
          }

          return (
            <div key={fk} className="flex flex-col gap-0.5">
              {field.label && (
                <span className="text-[10px] font-medium text-cream/60">{field.label}</span>
              )}
              {field.help && <span className="text-[9px] text-cream/40">{field.help}</span>}
              <FieldInput
                field={field}
                value={getValues(fk)}
                onChange={(value) => handleFieldChange(fk, value)}
              />
              {field.unit && field.type === 'range' && (
                <span className="text-[9px] text-cream/40">{field.unit}</span>
              )}
              {errors[fk] && (
                <span className="text-[9px] text-red/70">{String(errors[fk]?.message)}</span>
              )}
            </div>
          );
        })}
      </div>
    </InspectorSection>
  );
}

/* -------------------------------------------------------------------------- */
/* Form generator                                                             */
/* -------------------------------------------------------------------------- */

export function FormGenerator({ schema, spec, onChange }: FormGeneratorProps): JSX.Element {
  const zodSchema = useMemo(() => buildZodSchema(schema), [schema]);

  const methods = useForm<Record<string, unknown>>({
    resolver: zodResolver(zodSchema),
    defaultValues: spec,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const {
    setValue,
    getValues,
    formState: { errors },
  } = methods;

  // Recalculado a cada render: a visibilidade (showIf) depende dos valores atuais do formulário.
  const allValues: Record<string, unknown> = {};
  for (const group of schema) {
    for (const field of group.fields) {
      if (!field.k) continue;
      allValues[field.k] = field.type === 'list' ? (getValues(field.k) ?? []) : getValues(field.k);
    }
  }

  const handleFieldChange = useCallback(
    (k: string, value: unknown) => {
      setValue(k, value, { shouldValidate: true });
      const next = { ...getValues() };
      next[k] = value;
      onChange(next);
    },
    [setValue, getValues, onChange]
  );

  const handleListChange = useCallback(
    (k: string, items: Record<string, unknown>[]) => {
      setValue(k, items, { shouldValidate: true });
      onChange({ ...getValues(), [k]: items });
    },
    [setValue, getValues, onChange]
  );

  const visibleGroups = visibleFields(schema, allValues);

  return (
    <div className="space-y-4">
      {visibleGroups.map((group, index) => (
        <FormGroupSection
          first={index === 0}
          key={group.group}
          group={group}
          allValues={allValues}
          handleFieldChange={handleFieldChange}
          handleListChange={handleListChange}
          getValues={getValues}
          spec={spec}
          errors={errors}
        />
      ))}
    </div>
  );
}
