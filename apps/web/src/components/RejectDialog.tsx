"use client";

import { useState } from "react";
import { Button, Field, Modal } from "./ui";

const REASONS = ["Zorunlu kriterleri karşılamıyor", "Deneyim seviyesi uygun değil", "Maaş beklentisi bütçe dışında", "Başka adayla ilerlendi", "Aday ilgisini kaybetti"];

export function RejectDialog({ open, count, onClose, onConfirm }: { open: boolean; count: number; onClose: () => void; onConfirm: (reason: string, email: boolean) => void }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [email, setEmail] = useState(true);
  return (
    <Modal open={open} onClose={onClose} title={count > 1 ? `${count} adayı ele` : "Adayı ele"}>
      <div className="space-y-4">
        <Field label="Neden" hint="Yalnızca ekibiniz görür; adaya iletilmez.">
          <select className="field" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/[0.03]">
          <input type="checkbox" className="mt-0.5 accent-brand-600" checked={email} onChange={(e) => setEmail(e.target.checked)} />
          <span>
            <b className="font-medium">Adaya nazik bir olumsuz dönüş e-postası gönder</b>
            <span className="block text-xs text-slate-500">Kısa bir dönüş adayın deneyimini ve şirketinizin itibarını korur.</span>
          </span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Vazgeç</Button>
          <Button variant="danger" onClick={() => onConfirm(reason, email)}>Ele</Button>
        </div>
      </div>
    </Modal>
  );
}
