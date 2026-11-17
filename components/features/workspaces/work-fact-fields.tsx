"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function WorkFactSelect({ label, value, onChange }: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}) {
  const id = useId();
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value === null ? "unknown" : value ? "yes" : "no"}
        onValueChange={(next) => onChange(next === "unknown" ? null : next === "yes")}>
        <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="unknown">Unknown</SelectItem>
          <SelectItem value="yes">Yes</SelectItem>
          <SelectItem value="no">No</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function StayLimitField({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  const id = useId();
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>Stay limit (hours)</Label>
      <div className="flex items-center gap-2">
        <Input id={id} type="number" min={0} max={168} step={1} value={value || ""}
          className="min-w-0"
          placeholder={value === 0 ? "No limit" : "Unknown"}
          onChange={(event) => {
            const hours = event.currentTarget.valueAsNumber;
            onChange(Number.isInteger(hours) && hours >= 0 && hours <= 168 ? hours : null);
          }} />
        <Button type="button" variant={value === 0 ? "secondary" : "outline"} aria-pressed={value === 0}
          onClick={() => onChange(value === 0 ? null : 0)}>No limit</Button>
      </div>
    </div>
  );
}
