"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { weekdays, type PolicyInput } from "@/lib/features/session-hours/editor";

export function SessionPolicyFields({ label, value, onChange, laptop = false }: {
  label: string; value: PolicyInput; onChange: (value: PolicyInput) => void; laptop?: boolean;
}) {
  const patch = (next: Partial<PolicyInput>) => onChange({ ...value, ...next });
  const updateException = (index: number, change: Partial<PolicyInput["exceptions"][number]>) =>
    patch({ exceptions: value.exceptions.map((item, i) => i === index ? { ...item, ...change } : item) });
  return (
    <details className="border-b border-border/60 py-2">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-1 font-medium focus-visible:ring-2 focus-visible:ring-ring">
        <span aria-hidden="true" className="text-muted-foreground">›</span>{label}
      </summary>
      <div className="space-y-4 py-2">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="block min-w-0 space-y-1 text-sm">
            <span>Policy source URL</span>
            <Input type="url" maxLength={500} value={value.source} onChange={(e) => patch({ source: e.target.value })} />
          </label>
          <label className="block min-w-0 space-y-1 text-sm">
            <span>Holiday or exceptions source URL</span>
            <Input type="url" maxLength={500} value={value.coverageSource}
              onChange={(e) => patch({ coverageSource: e.target.value })} />
          </label>
          <label className="block min-w-0 space-y-1 text-sm">
            <span>Exceptions checked through</span>
            <Input type="date" value={value.through} onChange={(e) => patch({ through: e.target.value })} />
          </label>
          {laptop && <label className="block min-w-0 space-y-1 text-sm">
            <span>Stay limit (minutes)</span>
            <Input type="number" min={1} max={1440} step={1} placeholder="Unknown" value={value.maxMinutes}
              onChange={(e) => patch({ maxMinutes: e.target.value })} />
          </label>}
        </div>
        <fieldset className="min-w-0">
          <legend className="font-medium">Weekly hours</legend>
          <p className="mb-2 text-xs text-muted-foreground">Use 09:00-17:00, or separate split shifts with a comma. Write Closed for a confirmed closure. Leave unknown days blank. Split overnight hours at 24:00.</p>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {weekdays.map((day) => (
              <label key={day} className="flex min-w-0 items-center gap-2 text-sm">
                <span className="w-9 shrink-0">{day}</span>
                <Input maxLength={120} placeholder="Unknown" value={value.weekly[day] ?? ""}
                  onChange={(e) => patch({ weekly: { ...value.weekly, [day]: e.target.value } })} />
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="min-w-0 space-y-2">
          <legend className="font-medium">Date exceptions</legend>
          <p className="text-xs text-muted-foreground">A date replaces that day’s weekly hours.</p>
          {value.exceptions.map((item, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]">
              <label className="col-span-2 min-w-0 space-y-1 text-xs sm:col-span-1">
                <span>Exception date {index + 1}</span>
                <Input type="date" value={item.date} onChange={(e) => updateException(index, { date: e.target.value })} />
              </label>
              <label className="min-w-0 space-y-1 text-xs">
                <span>Exception hours {index + 1}</span>
                <Input maxLength={120} value={item.windows} placeholder="Closed or HH:MM-HH:MM"
                  onChange={(e) => updateException(index, { windows: e.target.value })} />
              </label>
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove exception ${index + 1}`}
                onClick={() => patch({ exceptions: value.exceptions.filter((_, i) => i !== index) })}>
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" disabled={value.exceptions.length >= 60}
            onClick={() => patch({ exceptions: [...value.exceptions, { date: "", windows: "" }] })}>
            <Plus aria-hidden="true" /> Add exception
          </Button>
        </fieldset>
      </div>
    </details>
  );
}
