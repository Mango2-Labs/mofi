"use client";

import { Icon } from "@/components/phone";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

// A number pad for dollar amounts: up to two decimals and seven digits.
export function Keypad({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const press = (key: string) => {
    const next = key === "back" ? value.slice(0, -1) : value === "0" && key !== "." ? key : value + key;
    if (next === "" || /^\d{0,7}(\.\d{0,2})?$/.test(next)) onChange(next === "." ? "0." : next);
  };
  return (
    <div className="grid grid-cols-3 gap-1">
      {KEYS.map((key) => (
        <button key={key} type="button" onClick={() => press(key)} aria-label={key === "back" ? "Delete" : undefined} className="flex h-14 cursor-pointer items-center justify-center rounded-2xl text-[26px] font-medium active:bg-card">
          {key === "back" ? <Icon name="back" size={22} stroke={2} /> : key}
        </button>
      ))}
    </div>
  );
}
