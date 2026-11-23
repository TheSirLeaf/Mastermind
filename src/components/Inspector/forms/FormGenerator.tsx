import { zodResolver } from '@hookform/resolvers/zod';
import { BarChart3, Code2, Palette, Play, Table2, Type } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { z, type ZodTypeAny } from 'zod';

import type { FormField, FormGroup, FormSchema } from '../../../packages/core/types';
import { InspectorSection } from '../InspectorSection';

import { FieldInput, ListItemInput } from './FieldInput';
import { fieldVisible, visibleFields } from './fieldVisibility';

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
