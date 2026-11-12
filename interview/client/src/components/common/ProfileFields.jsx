import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from './FormField';
import {
  CUSTOM_ROLE,
  DEGREES,
  PREFERRED_LANGUAGES,
  PREPARATION_GOALS,
  PREPARATION_LEVELS,
  TARGET_ROLES,
} from '@/lib/constants';
import { cn } from '@/lib/utils';

export function AcademicFields({ values, errors, onChange }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormField label="College / University" error={errors.college} required>
          <Input value={values.college} onChange={(e) => onChange('college', e.target.value)} autoComplete="organization" />
        </FormField>
      </div>
      <FormField label="Degree" error={errors.degree} required>
        <Select value={values.degree} onChange={(e) => onChange('degree', e.target.value)}>
          <option value="">Select degree</option>
          {DEGREES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Branch / Major" error={errors.branch} required>
        <Input value={values.branch} onChange={(e) => onChange('branch', e.target.value)} placeholder="e.g. Computer Science" />
      </FormField>
      <FormField label="Graduation year" error={errors.graduationYear} required>
        <Input
          type="number"
          inputMode="numeric"
          value={values.graduationYear}
          onChange={(e) => onChange('graduationYear', e.target.value)}
          placeholder={String(new Date().getFullYear() + 1)}
        />
      </FormField>
    </div>
  );
}

function TargetRoleField({ value, error, onChange }) {
  const isCustom = Boolean(value) && !TARGET_ROLES.includes(value);
  const [customMode, setCustomMode] = useState(isCustom);
  const selectValue = customMode || isCustom ? CUSTOM_ROLE : value;

  return (
    <div className="space-y-3">
      <FormField label="Target job role" error={customMode ? undefined : error} required>
        <Select
          value={selectValue}
          onChange={(e) => {
            if (e.target.value === CUSTOM_ROLE) {
              setCustomMode(true);
              onChange('targetRole', '');
            } else {
              setCustomMode(false);
              onChange('targetRole', e.target.value);
            }
          }}
        >
          <option value="">Select a role</option>
          {TARGET_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
          <option value={CUSTOM_ROLE}>{CUSTOM_ROLE}</option>
        </Select>
      </FormField>
      {(customMode || isCustom) && (
        <FormField label="Custom role" error={error} required>
          <Input value={value} onChange={(e) => onChange('targetRole', e.target.value)} placeholder="e.g. Site Reliability Engineer" />
        </FormField>
      )}
    </div>
  );
}

export function GoalFields({ values, errors, onChange }) {
  const toggleGoal = (goal) => {
    const set = new Set(values.preparationGoals);
    if (set.has(goal)) set.delete(goal);
    else set.add(goal);
    onChange('preparationGoals', PREPARATION_GOALS.filter((g) => set.has(g)));
  };

  return (
    <div className="space-y-5">
      <TargetRoleField value={values.targetRole} error={errors.targetRole} onChange={onChange} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Preparation level" error={errors.preparationLevel} required>
          <Select value={values.preparationLevel} onChange={(e) => onChange('preparationLevel', e.target.value)}>
            <option value="">Select level</option>
            {PREPARATION_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Preferred programming language" error={errors.preferredLanguage} required>
          <Select value={values.preferredLanguage} onChange={(e) => onChange('preferredLanguage', e.target.value)}>
            <option value="">Select language</option>
            {PREFERRED_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Main preparation goals <span className="text-destructive">*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {PREPARATION_GOALS.map((goal) => {
            const checked = values.preparationGoals.includes(goal);
            return (
              <label
                key={goal}
                className={cn(
                  'cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring',
                  checked ? 'border-primary bg-primary/10 font-medium text-primary' : 'bg-card hover:bg-muted',
                )}
              >
                <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleGoal(goal)} />
                {goal}
              </label>
            );
          })}
        </div>
        {errors.preparationGoals && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {errors.preparationGoals}
          </p>
        )}
      </fieldset>
    </div>
  );
}

export function profileToForm(user) {
  return {
    name: user?.name ?? '',
    college: user?.college ?? '',
    degree: user?.degree ?? '',
    branch: user?.branch ?? '',
    graduationYear: user?.graduationYear ? String(user.graduationYear) : '',
    targetRole: user?.targetRole ?? '',
    preparationLevel: user?.preparationLevel ?? '',
    preferredLanguage: user?.preferredLanguage ?? '',
    preparationGoals: user?.preparationGoals ?? [],
  };
}

