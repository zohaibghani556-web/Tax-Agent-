'use client';

import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SLIP_FIELDS, SLIP_TYPE_LABELS, getEmptySlipValues } from '@/lib/slips/slip-fields';

interface ManualEntryFormProps {
  /** Called when the user submits a completed slip form. */
  onAdd: (type: string, issuerName: string, data: Record<string, number | string>) => void;
  /** Pre-select a slip type tab. */
  defaultType?: string;
  /**
   * Pre-populate the form with an existing slip's data (edit mode).
   * Keys present in defaultData are shown; keys absent remain blank.
   */
  defaultData?: Record<string, number | string>;
  /** When true, the submit button reads "Save … Slip" instead of "Add … Slip". */
  isEditing?: boolean;
}

/** Parse a raw string from a number input: '' → '' (blank), invalid → '', valid → number */
function parseFormNumber(raw: string): number | string {
  if (raw === '') return '';
  const n = parseFloat(raw);
  return isNaN(n) ? '' : n;
}

const SLIP_TYPES = Object.keys(SLIP_TYPE_LABELS);

export function ManualEntryForm({ onAdd, defaultType = 'T4', defaultData, isEditing = false }: ManualEntryFormProps) {
  const [activeTab, setActiveTab] = useState(defaultType);
  // Separate form state per slip type so switching tabs doesn't lose entered data.
  // When defaultData is provided (edit mode), seed the active type's values from it.
  const [formState, setFormState] = useState<Record<string, Record<string, number | string>>>(
    () => {
      const initial = Object.fromEntries(SLIP_TYPES.map((t) => [t, getEmptySlipValues(t)]));
      if (defaultData) {
        // Merge saved data over the blank base — keys not in defaultData stay blank
        initial[defaultType] = { ...initial[defaultType], ...defaultData };
      }
      return initial;
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<string | null>(null);

  const handleChange = (
    slipType: string,
    key: string,
    raw: string,
    valueType: 'number' | 'text'
  ) => {
    setFormState((prev) => ({
      ...prev,
      [slipType]: {
        ...prev[slipType],
        [key]: valueType === 'number' ? parseFormNumber(raw) : raw,
      },
    }));
    // Clear error on edit
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = (slipType: string) => {
    const fields = SLIP_FIELDS[slipType] ?? [];
    const values = formState[slipType] ?? {};

    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required) {
        const v = values[field.key];
        if (v === '' || v === undefined || v === null || (field.valueType === 'number' && v === 0 && field.key !== 'box22')) {
          newErrors[field.key] = 'Required';
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const issuerKey = slipType === 'T2202' ? 'institutionName' : 'issuerName';
    const issuerName = String(values[issuerKey] ?? '');
    onAdd(slipType, issuerName, values);

    // Reset this slip type's form
    setFormState((prev) => ({
      ...prev,
      [slipType]: getEmptySlipValues(slipType),
    }));
    setErrors({});
    setSubmitted(slipType);
    setTimeout(() => setSubmitted(null), 2000);
  };

  return (
    <Tabs value={activeTab} onValueChange={(t) => { setActiveTab(t); setErrors({}); }}>
      <TabsList className="flex flex-wrap h-auto gap-1 p-1 rounded-lg mb-6" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {SLIP_TYPES.map((t) => (
          <TabsTrigger
            key={t}
            value={t}
            className="text-xs px-2.5 py-1.5 text-white/50 data-[state=active]:text-white data-[state=active]:shadow-sm"
            style={{ ['--tw-ring-color' as string]: 'transparent' }}
          >
            {t}
          </TabsTrigger>
        ))}
      </TabsList>

      {SLIP_TYPES.map((slipType) => {
        const fields = SLIP_FIELDS[slipType] ?? [];
        const values = formState[slipType] ?? {};
        const isActive = activeTab === slipType;

        return (
          <TabsContent key={slipType} value={slipType}>
            {isActive && (
              <div className="space-y-5">
                <p className="text-sm text-white/50">
                  {SLIP_TYPE_LABELS[slipType]} — enter the values exactly as shown on your CRA slip.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {fields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <Label htmlFor={`manual-${slipType}-${field.key}`} className="text-xs text-white/50">
                        {field.label}
                        {field.required && (
                          <span className="text-red-400 ml-1" aria-hidden>*</span>
                        )}
                      </Label>
                      <Input
                        id={`manual-${slipType}-${field.key}`}
                        type={field.valueType === 'number' ? 'number' : 'text'}
                        placeholder={field.placeholder ?? (field.valueType === 'number' ? '0.00' : '')}
                        value={values[field.key] ?? ''}
                        onChange={(e) =>
                          handleChange(slipType, field.key, e.target.value, field.valueType)
                        }
                        className={[
                          'text-sm bg-white/5 border-white/10 text-white placeholder:text-white/25',
                          errors[field.key] ? 'border-red-400 focus-visible:ring-red-400' : '',
                        ].join(' ')}
                        step={field.valueType === 'number' ? '0.01' : undefined}
                        min={field.valueType === 'number' ? '0' : undefined}
                        aria-invalid={!!errors[field.key]}
                        aria-describedby={
                          errors[field.key] ? `manual-err-${field.key}` : undefined
                        }
                      />
                      {errors[field.key] && (
                        <p
                          id={`manual-err-${field.key}`}
                          className="text-xs text-red-500"
                          role="alert"
                        >
                          {errors[field.key]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handleSubmit(slipType)}
                  className="w-full bg-[var(--emerald)] hover:bg-[var(--emerald-dark)]"
                >
                  {submitted === slipType ? (
                    isEditing ? 'Saved!' : 'Slip Added!'
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {isEditing ? `Save ${slipType} Slip` : `Add ${slipType} Slip`}
                    </>
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
