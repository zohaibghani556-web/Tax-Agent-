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
}

const SLIP_TYPES = Object.keys(SLIP_TYPE_LABELS);

export function ManualEntryForm({ onAdd, defaultType = 'T4' }: ManualEntryFormProps) {
  const [activeTab, setActiveTab] = useState(defaultType);
  // Separate form state per slip type so switching tabs doesn't lose entered data
  const [formState, setFormState] = useState<Record<string, Record<string, number | string>>>(
    () => Object.fromEntries(SLIP_TYPES.map((t) => [t, getEmptySlipValues(t)]))
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
        [key]: valueType === 'number' ? (parseFloat(raw) || 0) : raw,
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
      <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1 rounded-lg mb-6">
        {SLIP_TYPES.map((t) => (
          <TabsTrigger
            key={t}
            value={t}
            className="text-xs px-2.5 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
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
                <p className="text-sm text-slate-500">
                  {SLIP_TYPE_LABELS[slipType]} — enter the values exactly as shown on your CRA slip.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {fields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <Label htmlFor={`manual-${slipType}-${field.key}`} className="text-xs">
                        {field.label}
                        {field.required && (
                          <span className="text-red-500 ml-1" aria-hidden>*</span>
                        )}
                      </Label>
                      <Input
                        id={`manual-${slipType}-${field.key}`}
                        type={field.valueType === 'number' ? 'number' : 'text'}
                        placeholder={field.placeholder ?? (field.valueType === 'number' ? '0.00' : '')}
                        value={values[field.key] ?? (field.valueType === 'number' ? 0 : '')}
                        onChange={(e) =>
                          handleChange(slipType, field.key, e.target.value, field.valueType)
                        }
                        className={[
                          'text-sm',
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
                  className="w-full bg-[#1A2744] hover:bg-[#243461]"
                >
                  {submitted === slipType ? (
                    'Slip Added!'
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add {slipType} Slip
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
