'use client';

import { useState } from 'react';
import { PlusCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SLIP_FIELDS, SLIP_TYPE_LABELS, getEmptySlipValues } from '@/lib/slips/slip-fields';
import type { SlipFieldDef } from '@/lib/slips/slip-fields';

interface ManualEntryFormProps {
  onAdd: (type: string, issuerName: string, data: Record<string, number | string>) => void;
  defaultType?: string;
  /**
   * Pre-populate the form with an existing slip's data (edit mode).
   * Keys present in defaultData are shown; keys absent remain blank.
   */
  defaultData?: Record<string, number | string>;
  /** When true: no tab strip, larger inputs, "Save" button label. */
  isEditing?: boolean;
}

function parseFormNumber(raw: string): number | string {
  if (raw === '') return '';
  const n = parseFloat(raw);
  return isNaN(n) ? '' : n;
}

const SLIP_TYPES = Object.keys(SLIP_TYPE_LABELS);

/** A single field card — shared between add and edit modes. */
function FieldCard({
  field,
  value,
  error,
  idPrefix,
  onChange,
}: {
  field: SlipFieldDef;
  value: number | string | undefined;
  error?: string;
  idPrefix: string;
  onChange: (key: string, raw: string, valueType: 'number' | 'text') => void;
}) {
  const hasError = !!error;
  return (
    <div
      className="rounded-xl p-3.5 flex flex-col gap-2"
      style={{
        background: hasError ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hasError ? 'rgba(239,68,68,0.30)' : 'rgba(255,255,255,0.09)'}`,
      }}
    >
      <label
        htmlFor={`${idPrefix}-${field.key}`}
        className="text-xs font-medium text-white/50 leading-tight cursor-pointer"
      >
        {field.label}
        {field.required && <span className="text-red-400/70 ml-1">*</span>}
      </label>

      <Input
        id={`${idPrefix}-${field.key}`}
        type={field.valueType === 'number' ? 'number' : 'text'}
        placeholder={field.placeholder ?? (field.valueType === 'number' ? '0.00' : '')}
        value={value ?? ''}
        onChange={(e) => onChange(field.key, e.target.value, field.valueType)}
        className={[
          'w-full h-11 text-base font-mono',
          field.valueType === 'number' ? 'text-right' : 'text-left',
          hasError
            ? 'bg-red-400/5 border-red-400/40 text-white focus-visible:ring-red-400/30'
            : 'bg-white/5 border-white/10 text-white',
        ].join(' ')}
        step={field.valueType === 'number' ? '0.01' : undefined}
        min={field.valueType === 'number' ? '0' : undefined}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${idPrefix}-err-${field.key}` : undefined}
      />

      {hasError && (
        <p id={`${idPrefix}-err-${field.key}`} className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Card grid of fields for a given slip type — used in both add and edit modes. */
function SlipFieldGrid({
  slipType,
  values,
  errors,
  idPrefix,
  onChange,
}: {
  slipType: string;
  values: Record<string, number | string>;
  errors: Record<string, string>;
  idPrefix: string;
  onChange: (key: string, raw: string, valueType: 'number' | 'text') => void;
}) {
  const fields = SLIP_FIELDS[slipType] ?? [];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {fields.map((field) => (
        <FieldCard
          key={field.key}
          field={field}
          value={values[field.key]}
          error={errors[field.key]}
          idPrefix={idPrefix}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

export function ManualEntryForm({
  onAdd,
  defaultType = 'T4',
  defaultData,
  isEditing = false,
}: ManualEntryFormProps) {
  const [activeTab, setActiveTab] = useState(defaultType);
  const [formState, setFormState] = useState<Record<string, Record<string, number | string>>>(
    () => {
      const initial = Object.fromEntries(SLIP_TYPES.map((t) => [t, getEmptySlipValues(t)]));
      if (defaultData) {
        initial[defaultType] = { ...initial[defaultType], ...defaultData };
      }
      return initial;
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<string | null>(null);

  const handleChange = (slipType: string) => (key: string, raw: string, valueType: 'number' | 'text') => {
    setFormState((prev) => ({
      ...prev,
      [slipType]: {
        ...prev[slipType],
        [key]: valueType === 'number' ? parseFormNumber(raw) : raw,
      },
    }));
    setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  };

  const handleSubmit = (slipType: string) => {
    const fields = SLIP_FIELDS[slipType] ?? [];
    const values = formState[slipType] ?? {};
    const newErrors: Record<string, string> = {};

    for (const field of fields) {
      if (field.required) {
        const v = values[field.key];
        if (v === '' || v === undefined || v === null ||
          (field.valueType === 'number' && v === 0 && field.key !== 'box22')) {
          newErrors[field.key] = 'Required';
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const issuerKey = slipType === 'T2202' ? 'institutionName' : 'issuerName';
    onAdd(slipType, String(values[issuerKey] ?? ''), values);

    setFormState((prev) => ({ ...prev, [slipType]: getEmptySlipValues(slipType) }));
    setErrors({});
    setSubmitted(slipType);
    setTimeout(() => setSubmitted(null), 2000);
  };

  // ── Edit mode: no tabs, just the fields for this slip ──────────────────────
  if (isEditing) {
    const values = formState[defaultType] ?? {};
    const issuerKey = defaultType === 'T2202' ? 'institutionName' : 'issuerName';
    const issuerValue = values[issuerKey];

    return (
      <div className="space-y-5">
        {/* Slip identity — small header showing what you're editing */}
        <div className="flex items-center gap-2.5 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span className="text-xs font-bold px-2 py-1 rounded-md text-white/60"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            {defaultType}
          </span>
          {issuerValue && (
            <span className="text-sm text-white/50 truncate">{issuerValue}</span>
          )}
        </div>

        <SlipFieldGrid
          slipType={defaultType}
          values={values}
          errors={errors}
          idPrefix={`edit-${defaultType}`}
          onChange={handleChange(defaultType)}
        />

        <Button
          onClick={() => handleSubmit(defaultType)}
          className="w-full bg-[var(--emerald)] hover:bg-[var(--emerald-dark)] gap-2"
        >
          {submitted === defaultType ? 'Saved!' : (
            <><Save className="h-4 w-4" /> Save {defaultType} Slip</>
          )}
        </Button>
      </div>
    );
  }

  // ── Add mode: tab strip + card grid per slip type ───────────────────────────
  return (
    <Tabs value={activeTab} onValueChange={(t) => { setActiveTab(t); setErrors({}); }}>
      <TabsList
        className="flex flex-wrap h-auto gap-1 p-1 rounded-lg mb-6"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        {SLIP_TYPES.map((t) => (
          <TabsTrigger
            key={t} value={t}
            className="text-xs px-2.5 py-1.5 text-white/50 data-[state=active]:text-white data-[state=active]:shadow-sm"
            style={{ ['--tw-ring-color' as string]: 'transparent' }}
          >
            {t}
          </TabsTrigger>
        ))}
      </TabsList>

      {SLIP_TYPES.map((slipType) => {
        const values = formState[slipType] ?? {};
        const isActive = activeTab === slipType;
        return (
          <TabsContent key={slipType} value={slipType}>
            {isActive && (
              <div className="space-y-5">
                <p className="text-sm text-white/45">
                  {SLIP_TYPE_LABELS[slipType]} — enter the values exactly as shown on your CRA slip.
                </p>

                <SlipFieldGrid
                  slipType={slipType}
                  values={values}
                  errors={errors}
                  idPrefix={`add-${slipType}`}
                  onChange={handleChange(slipType)}
                />

                <Button
                  onClick={() => handleSubmit(slipType)}
                  className="w-full bg-[var(--emerald)] hover:bg-[var(--emerald-dark)] gap-2"
                >
                  {submitted === slipType ? 'Slip Added!' : (
                    <><PlusCircle className="h-4 w-4" /> Add {slipType} Slip</>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
