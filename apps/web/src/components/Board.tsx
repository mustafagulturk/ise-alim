"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { STAGES, stageMeta } from "@/lib/format";
import type { Card, Stage, TemplateKey } from "@/lib/types";
import { CardBody, SortableCard } from "./CandidateCard";
import { RejectDialog } from "./RejectDialog";

type Columns = Record<Stage, string[]>;

function group(cards: Card[]): Columns {
  const cols = Object.fromEntries(STAGES.map((s) => [s, [] as string[]])) as Columns;
  for (const c of [...cards].sort((a, b) => a.rank - b.rank)) cols[c.stage].push(c.id);
  return cols;
}

function rankBetween(before?: number, after?: number) {
  if (before == null && after == null) return 1000;
  if (before == null) return after! - 1000;
  if (after == null) return before + 1000;
  return (before + after) / 2;
}

function Column({ stage, ids, cards, selected, toggle, canEdit, collapsed, onCollapse }: {
  stage: Stage;
  ids: string[];
  cards: Map<string, Card>;
  selected: Set<string>;
  toggle: (id: string) => void;
  canEdit: boolean;
  collapsed?: boolean;
  onCollapse?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const m = stageMeta[stage];
  const scores = ids.map((id) => cards.get(id)?.score).filter((s): s is number => s != null);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  if (collapsed) {
    return (
      <button ref={setNodeRef} onClick={onCollapse} className={clsx("flex w-12 shrink-0 flex-col items-center gap-3 rounded-2xl bg-slate-100/70 py-4 transition dark:bg-white/[0.03]", isOver && "bg-rose-50 ring-2 ring-rose-300")}>
        <ChevronLeft className="size-4 text-slate-400" />
        <span className="rounded-full bg-white px-1.5 text-xs font-semibold tabular-nums dark:bg-white/10">{ids.length}</span>
        <span className="text-xs font-medium text-slate-500 [writing-mode:vertical-rl]">{m.label}</span>
      </button>
    );
  }

  return (
    <div className="flex w-[290px] shrink-0 flex-col">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className={clsx("size-2 rounded-full", m.dot)} />
        <h3 className="text-sm font-semibold">{m.label}</h3>
        <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-medium tabular-nums dark:bg-white/10">{ids.length}</span>
        {avg != null && <span className="text-xs text-slate-400">ort. {avg}</span>}
        {onCollapse && <button onClick={onCollapse} className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10" aria-label="Daralt"><ChevronRight className="size-4" /></button>}
      </div>
      <div
        ref={setNodeRef}
        className={clsx(
          "flex min-h-40 flex-1 flex-col gap-2 rounded-2xl p-2 transition-colors",
          isOver ? "bg-brand-50 ring-2 ring-brand-300 ring-inset dark:bg-brand-500/10" : "bg-slate-100/70 dark:bg-white/[0.025]",
        )}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {ids.map((id) => {
            const card = cards.get(id);
            return card ? <SortableCard key={id} card={card} selected={selected.has(id)} onSelect={() => toggle(id)} disabled={!canEdit} /> : null;
          })}
        </SortableContext>
        {!ids.length && <p className="grid flex-1 place-items-center py-8 text-center text-xs text-slate-400">Adayı buraya sürükleyin</p>}
      </div>
    </div>
  );
}

export function Board({ jobId, cards, selected, toggle, canEdit, showRejected, setShowRejected }: {
  jobId: string;
  cards: Card[];
  selected: Set<string>;
  toggle: (id: string) => void;
  canEdit: boolean;
  showRejected: boolean;
  setShowRejected: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const [cols, setCols] = useState<Columns>(() => group(cards));
  const [active, setActive] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Stage | null>(null);
  const [rejecting, setRejecting] = useState<{ id: string; before?: string; after?: string } | null>(null);

  // Sürükleme yokken sunucudan gelen veri (canlı güncellemeler dahil) sütunları yeniler.
  useEffect(() => {
    if (!active) setCols(group(cards));
  }, [cards, active]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const move = useMutation({
    mutationFn: (v: { id: string; stage: Stage; beforeId?: string; afterId?: string; reason?: string; email?: TemplateKey }) =>
      api.patch<Card>(`/applications/${v.id}/move`, v),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["board", jobId] });
      const prev = qc.getQueryData<Card[]>(["board", jobId]);
      const rank = rankBetween(v.beforeId ? byId.get(v.beforeId)?.rank : undefined, v.afterId ? byId.get(v.afterId)?.rank : undefined);
      qc.setQueryData<Card[]>(["board", jobId], (old) => old?.map((c) => (c.id === v.id ? { ...c, stage: v.stage, rank, stageChangedAt: c.stage === v.stage ? c.stageChangedAt : new Date().toISOString() } : c)));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(["board", jobId], ctx?.prev);
      toast.error(e.message);
    },
    onSuccess: (card, v) => {
      if (v.stage === "INTERVIEW" || v.stage === "OFFER") {
        const template: TemplateKey = v.stage === "INTERVIEW" ? "interview" : "offer";
        toast.success(`${stageMeta[v.stage].label} aşamasına taşındı`, {
          action: { label: "E-posta gönder", onClick: () => api.post(`/applications/${card.id}/emails`, { template }).then(() => toast.success("E-posta kuyruğa alındı")) },
        });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["board", jobId] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const find = (id: string): Stage | undefined => (STAGES as string[]).includes(id) ? (id as Stage) : STAGES.find((s) => cols[s].includes(id));

  function onDragStart(e: DragStartEvent) {
    setActive(String(e.active.id));
    setOrigin(find(String(e.active.id)) ?? null);
  }

  function onDragOver({ active: a, over }: DragOverEvent) {
    if (!over) return;
    const from = find(String(a.id));
    const to = find(String(over.id));
    if (!from || !to || from === to) return;
    setCols((c) => {
      const fromIds = c[from].filter((x) => x !== a.id);
      const overIndex = c[to].indexOf(String(over.id));
      const toIds = [...c[to]];
      toIds.splice(overIndex >= 0 ? overIndex : toIds.length, 0, String(a.id));
      return { ...c, [from]: fromIds, [to]: toIds };
    });
  }

  function onDragEnd({ active: a, over }: DragEndEvent) {
    const id = String(a.id);
    setActive(null);
    if (!over || !origin) return setCols(group(cards));
    const stage = find(id)!;
    let ids = cols[stage];
    const oldIndex = ids.indexOf(id);
    const overIndex = ids.indexOf(String(over.id));
    if (overIndex >= 0 && overIndex !== oldIndex) {
      ids = [...ids];
      ids.splice(oldIndex, 1);
      ids.splice(overIndex, 0, id);
      setCols((c) => ({ ...c, [stage]: ids }));
    }
    const index = ids.indexOf(id);
    const before = ids[index - 1];
    const after = ids[index + 1];
    const card = byId.get(id)!;
    if (stage === card.stage && index === group(cards)[stage].indexOf(id)) return;

    if (stage === "REJECTED" && card.stage !== "REJECTED") return setRejecting({ id, before, after });
    move.mutate({ id, stage, beforeId: before, afterId: after });
  }

  const visible = STAGES.filter((s) => s !== "REJECTED");
  const activeCard = active ? byId.get(active) : null;

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => { setActive(null); setCols(group(cards)); }}>
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-6 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
          {visible.map((s) => (
            <Column key={s} stage={s} ids={cols[s]} cards={byId} selected={selected} toggle={toggle} canEdit={canEdit} />
          ))}
          <Column stage="REJECTED" ids={cols.REJECTED} cards={byId} selected={selected} toggle={toggle} canEdit={canEdit} collapsed={!showRejected} onCollapse={() => setShowRejected(!showRejected)} />
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" }}>{activeCard ? <CardBody card={activeCard} overlay /> : null}</DragOverlay>
      </DndContext>

      <RejectDialog
        open={!!rejecting}
        count={1}
        onClose={() => { setRejecting(null); setCols(group(cards)); }}
        onConfirm={(reason, email) => {
          move.mutate({ id: rejecting!.id, stage: "REJECTED", beforeId: rejecting!.before, afterId: rejecting!.after, reason, email: email ? "rejected" : undefined });
          setRejecting(null);
        }}
      />
    </>
  );
}
