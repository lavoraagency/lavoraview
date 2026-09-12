"use client";

// Shared date-range picker: presets (Today/Yesterday/Current Week/Last 7-90
// Days/Current Month) + a two-click calendar for custom ranges. Extracted
// from the Analytics tab so every page that needs the same picker (e.g. the
// per-Link-Page click analytics) looks and behaves identically and can't
// drift apart.

import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DateRange { from: string; to: string }

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Local date string YYYY-MM-DD (viewer's own timezone). */
export function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function localToday() {
  return toLocalDateStr(new Date());
}

export function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d);
}

export function DateRangePicker({
  range,
  onChange,
  minDate,
  maxDate,
}: {
  range: DateRange;
  onChange: (r: DateRange) => void;
  minDate: string;
  maxDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState<"from" | "to" | null>(null);
  const [tempFrom, setTempFrom] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(range.to + "T00:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSelecting(null);
        setTempFrom(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Reset view month when opening
  useEffect(() => {
    if (open) {
      const d = new Date(range.to + "T00:00:00");
      setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
      setSelecting("from");
      setTempFrom(null);
    }
  }, [open]);

  function applyPreset(from: string, to: string) {
    // Clamp to min/max
    const clampedFrom = from < minDate ? minDate : from;
    const clampedTo = to > maxDate ? maxDate : to;
    onChange({ from: clampedFrom, to: clampedTo });
    setOpen(false);
    setSelecting(null);
    setTempFrom(null);
  }

  function handleDayClick(dateStr: string) {
    if (dateStr < minDate || dateStr > maxDate) return;

    if (!tempFrom) {
      // First click — set start
      setTempFrom(dateStr);
      setSelecting("to");
    } else {
      // Second click — set end
      const from = dateStr < tempFrom ? dateStr : tempFrom;
      const to = dateStr < tempFrom ? tempFrom : dateStr;
      onChange({ from, to });
      setOpen(false);
      setSelecting(null);
      setTempFrom(null);
    }
  }

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const { year, month } = viewMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Monday = 0
    let startWeekday = firstDay.getDay() - 1;
    if (startWeekday < 0) startWeekday = 6;

    const days: { dateStr: string; day: number; inMonth: boolean }[] = [];

    // Previous month padding
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ dateStr: toLocalDateStr(d), day: d.getDate(), inMonth: false });
    }

    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push({ dateStr: toLocalDateStr(date), day: d, inMonth: true });
    }

    // Next month padding to fill 6 rows
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ dateStr: toLocalDateStr(d), day: d.getDate(), inMonth: false });
    }

    return days;
  }, [viewMonth]);

  function prevMonth() {
    setViewMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  }
  function nextMonth() {
    setViewMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  }

  const today = localToday();

  // Presets
  const presets = useMemo(() => {
    const t = new Date();
    const todayStr = toLocalDateStr(t);

    const yesterdayD = new Date(t);
    yesterdayD.setDate(yesterdayD.getDate() - 1);
    const yesterdayStr = toLocalDateStr(yesterdayD);

    // Current week (Monday to today)
    const dayOfWeek = t.getDay() === 0 ? 6 : t.getDay() - 1;
    const mondayD = new Date(t);
    mondayD.setDate(mondayD.getDate() - dayOfWeek);
    const mondayStr = toLocalDateStr(mondayD);

    // Current month
    const monthStartStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-01`;

    return [
      { label: "Today", from: todayStr, to: todayStr },
      { label: "Yesterday", from: yesterdayStr, to: yesterdayStr },
      { label: "Current Week", from: mondayStr, to: todayStr },
      { label: "Last 7 Days", from: addDays(todayStr, -6), to: todayStr },
      { label: "Last 14 Days", from: addDays(todayStr, -13), to: todayStr },
      { label: "Current Month", from: monthStartStr, to: todayStr },
      { label: "Last 30 Days", from: addDays(todayStr, -29), to: todayStr },
      { label: "Last 90 Days", from: addDays(todayStr, -89), to: todayStr },
    ];
  }, []);

  // Display text
  const displayText = useMemo(() => {
    // Check if matches a preset
    for (const p of presets) {
      const clampedFrom = p.from < minDate ? minDate : p.from;
      const clampedTo = p.to > maxDate ? maxDate : p.to;
      if (range.from === clampedFrom && range.to === clampedTo) return p.label;
    }
    if (range.from === range.to) {
      if (range.from === today) return "Today";
      const d = new Date(range.from + "T00:00:00");
      return d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
    }
    const f = new Date(range.from + "T00:00:00");
    const t = new Date(range.to + "T00:00:00");
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
    return `${fmt(f)} - ${fmt(t)}`;
  }, [range, presets, today, minDate, maxDate]);

  // Active preset
  const activePreset = useMemo(() => {
    for (const p of presets) {
      const clampedFrom = p.from < minDate ? minDate : p.from;
      const clampedTo = p.to > maxDate ? maxDate : p.to;
      if (range.from === clampedFrom && range.to === clampedTo) return p.label;
    }
    return null;
  }, [range, presets, minDate, maxDate]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:border-gray-300 transition-colors"
      >
        <Calendar className="w-4 h-4 text-gray-400" />
        {displayText}
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 flex">
          {/* Presets */}
          <div className="border-r border-gray-100 py-2 w-40">
            {presets.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.from, p.to)}
                className={cn(
                  "block w-full text-left px-4 py-2 text-sm transition-colors",
                  activePreset === p.label
                    ? "bg-brand-50 text-brand-600 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-4 w-[280px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <span className="text-sm font-semibold text-gray-900">
                {MONTH_NAMES[viewMonth.month]} {viewMonth.year}
              </span>
              <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map(({ dateStr, day, inMonth }, i) => {
                const disabled = dateStr < minDate || dateStr > maxDate;
                const isRangeStart = dateStr === (tempFrom || range.from);
                const isRangeEnd = tempFrom ? null : dateStr === range.to;
                const inRange = tempFrom
                  ? dateStr >= tempFrom && dateStr <= tempFrom // single selection so far
                  : dateStr >= range.from && dateStr <= range.to;
                const isSelected = isRangeStart || isRangeEnd;

                return (
                  <button
                    key={i}
                    disabled={disabled}
                    onClick={() => handleDayClick(dateStr)}
                    className={cn(
                      "h-8 text-xs rounded transition-colors relative",
                      !inMonth && "text-gray-300",
                      inMonth && !disabled && !isSelected && !inRange && "text-gray-700 hover:bg-gray-100",
                      disabled && "text-gray-200 cursor-not-allowed",
                      inRange && !isSelected && "bg-brand-50 text-brand-700",
                      isSelected && "bg-gray-900 text-white font-semibold rounded-lg",
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Selection hint */}
            <div className="mt-3 text-xs text-gray-400 text-center">
              {tempFrom
                ? "Select end date"
                : "Select start date"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
