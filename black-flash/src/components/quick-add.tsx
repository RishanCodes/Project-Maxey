"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleCheck, Dumbbell, Moon, Repeat, Timer } from "lucide-react";
import { Sheet } from "./ui";
import { TaskForm } from "./forms/task-form";
import { HabitForm } from "./forms/habit-form";
import { TrainingForm } from "./forms/training-form";
import { CheckinForm } from "./forms/checkin-form";
import { usePrefs, useToday } from "@/hooks/use-data";

type Kind = "task" | "habit" | "training" | "checkin" | null;

export function QuickAdd({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const prefs = usePrefs();
  const { today } = useToday(prefs?.timezone);
  const router = useRouter();
  const [form, setForm] = useState<Kind>(null);
  const items = [
    { k: "task" as const, label: "Task", sub: "Something to get done", icon: CircleCheck },
    { k: "habit" as const, label: "Habit", sub: "Something to repeat", icon: Repeat },
    { k: "training" as const, label: "Training", sub: "Log or plan a session", icon: Dumbbell },
    { k: "focus" as const, label: "Focus", sub: "Start a timer", icon: Timer },
    { k: "checkin" as const, label: "Check-in", sub: "Sleep, energy, rest", icon: Moon },
  ];
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} title="Quick add">
        <div className="flex flex-col gap-2">
          {items.map((it) => (
            <button key={it.k} className="flex min-h-15 items-center gap-4 rounded-2xl border border-line bg-graphite/60 px-4 text-left transition hover:border-flash/60 active:scale-[.99]"
              onClick={() => { onOpenChange(false); if (it.k === "focus") router.push("/focus"); else setForm(it.k); }}>
              <it.icon size={20} className="text-flash" aria-hidden="true" />
              <span className="flex flex-col"><span className="font-semibold">{it.label}</span><span className="text-sm text-muted">{it.sub}</span></span>
            </button>
          ))}
        </div>
      </Sheet>
      <TaskForm open={form === "task"} onOpenChange={(o) => !o && setForm(null)} defaultDate={today} />
      <HabitForm open={form === "habit"} onOpenChange={(o) => !o && setForm(null)} />
      <TrainingForm open={form === "training"} onOpenChange={(o) => !o && setForm(null)} defaultDate={today} />
      <CheckinForm open={form === "checkin"} onOpenChange={(o) => !o && setForm(null)} date={today} />
    </>
  );
}
