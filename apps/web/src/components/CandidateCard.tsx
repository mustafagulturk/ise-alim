"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { clsx } from "clsx";
import { AlertTriangle, CalendarClock, MessageSquare } from "lucide-react";
import Link from "next/link";
import { relative } from "@/lib/format";
import type { Card } from "@/lib/types";
import { useBlind } from "@/lib/use-blind";
import { Avatar, ScoreRing } from "./ui";

export function CardBody({ card, selected, onSelect, overlay }: { card: Card; selected?: boolean; onSelect?: () => void; overlay?: boolean }) {
  const { name, blind } = useBlind();
  const pending = card.aiStatus === "PENDING" || card.aiStatus === "PROCESSING";
  return (
    <div
      className={clsx(
        "group relative rounded-xl border bg-white p-3 transition dark:bg-[#17172a]",
        selected ? "border-brand-400 ring-2 ring-brand-500/20" : "border-slate-200/80 hover:border-slate-300 dark:border-white/[0.07] dark:hover:border-white/20",
        overlay ? "rotate-2 shadow-2xl shadow-brand-900/20" : "shadow-sm hover:shadow-md",
      )}
    >
      {onSelect && (
        <input
          type="checkbox"
          checked={!!selected}
          onChange={onSelect}
          onPointerDown={(e) => e.stopPropagation()}
          className={clsx("absolute -top-1.5 -left-1.5 z-10 size-4 accent-brand-600 transition", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
          aria-label="Seç"
        />
      )}
      <div className="flex items-start gap-3">
        <Avatar name={card.candidate.name} id={card.candidate.id} size="sm" blind={blind} />
        <div className="min-w-0 flex-1">
          <Link href={`/panel/basvurular/${card.id}`} className="block truncate text-sm font-medium hover:text-brand-600" draggable={false}>
            {name(card.candidate)}
          </Link>
          <p className="truncate text-xs text-slate-500">
            {card.experienceYears != null ? `${card.experienceYears} yıl deneyim` : "Deneyim belirsiz"}
            {!blind && card.candidate.city ? ` · ${card.candidate.city}` : ""}
          </p>
        </div>
        <ScoreRing score={card.score} size={38} stroke={3.5} pending={pending} />
      </div>
      {card.skills.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {card.skills.map((s) => (
            <span key={s} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600 dark:bg-white/5 dark:text-slate-300">{s}</span>
          ))}
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-400">
        {card.mustHaveMissing && (
          <span className="flex items-center gap-1 font-medium text-rose-500" title="Zorunlu kriterlerden en az biri karşılanmıyor">
            <AlertTriangle className="size-3" /> Zorunlu eksik
          </span>
        )}
        {card.interviewCount > 0 && <span className="flex items-center gap-1"><CalendarClock className="size-3" />{card.interviewCount}</span>}
        {card.noteCount > 0 && <span className="flex items-center gap-1"><MessageSquare className="size-3" />{card.noteCount}</span>}
        <span className="ml-auto" title="Bu aşamadaki süre">{relative(card.stageChangedAt)}</span>
      </div>
    </div>
  );
}

export function SortableCard({ card, selected, onSelect, disabled }: { card: Card; selected: boolean; onSelect: () => void; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={clsx("touch-none", isDragging && "opacity-30", !disabled && "cursor-grab active:cursor-grabbing")}
      {...attributes}
      {...listeners}
    >
      <CardBody card={card} selected={selected} onSelect={onSelect} />
    </div>
  );
}
