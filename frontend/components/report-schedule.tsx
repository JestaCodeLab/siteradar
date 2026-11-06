"use client";

import { Field } from "./ui";
import { Select } from "./select";
import { TimePicker } from "./time-picker";

const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4]}`;
const DAYS = Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `${ordinal(i + 1)} of the month` }));

/** Day and time a workspace's monthly report is sent. The report covers the month before. */
export function ReportSchedule({ day, at, onChange, idPrefix = "rs" }: {
  day: string; at: string; onChange: (next: { day: string; at: string }) => void; idPrefix?: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Send it on" htmlFor={`${idPrefix}-day`}>
        <Select id={`${idPrefix}-day`} value={day} onChange={(v) => onChange({ day: v, at })} options={DAYS} />
      </Field>
      <Field label="At" htmlFor={`${idPrefix}-at`}>
        <TimePicker id={`${idPrefix}-at`} value={at} onChange={(v) => onChange({ day, at: v })} step={15} />
      </Field>
    </div>
  );
}
