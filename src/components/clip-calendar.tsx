"use client";

import { ko } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";
import { dateKey } from "@/lib/alarm";

function toDate(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function ClipCalendar({
  days,
  selected,
  today,
  onSelect,
}: {
  days: string[];
  selected: string;
  today: string;
  onSelect: (day: string) => void;
}) {
  const enabled = new Set([...days, today]);
  return (
    <div className="bg-card mx-auto rounded-(--radius) border-[3px] border-foreground shadow-[3px_3px_0_var(--foreground)]">
      <Calendar
        mode="single"
        required
        locale={ko}
        selected={toDate(selected)}
        defaultMonth={toDate(selected)}
        onSelect={(date) => onSelect(dateKey(date))}
        disabled={(date) => !enabled.has(dateKey(date))}
        className="bg-transparent"
      />
    </div>
  );
}
