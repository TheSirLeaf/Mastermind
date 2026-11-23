// components/Inspector/forms/fieldVisibility.ts
// Quais campos do formulário aparecem (campos com `showIf` dependem de outros valores).
import type { FormField, FormGroup } from '../../../packages/core/types';

export function fieldVisible(field: FormField, values: Record<string, unknown>): boolean {
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

export function visibleFields(groups: FormGroup[], values: Record<string, unknown>): FormGroup[] {
  return groups.map((group) => ({
    ...group,
    fields: group.fields.filter((field) => fieldVisible(field, values)),
  }));
}
