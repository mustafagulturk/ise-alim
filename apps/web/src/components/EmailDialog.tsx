"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { TemplateKey } from "@/lib/types";
import { Button, Field, Modal, Skeleton, Tabs } from "./ui";

const LABELS: Record<TemplateKey, string> = { received: "Başvuru alındı", interview: "Mülakat daveti", offer: "Teklif", rejected: "Olumsuz dönüş" };

export function EmailDialog({ open, onClose, applicationId, initial = "interview" }: { open: boolean; onClose: () => void; applicationId: string; initial?: TemplateKey }) {
  const qc = useQueryClient();
  const [template, setTemplate] = useState<TemplateKey>(initial);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const preview = useQuery({
    queryKey: ["email-preview", applicationId, template],
    queryFn: () => api.get<{ to: string; subject: string; body: string }>(`/applications/${applicationId}/email-preview?template=${template}`),
    enabled: open,
  });
  useEffect(() => {
    if (preview.data) {
      setSubject(preview.data.subject);
      setBody(preview.data.body);
    }
  }, [preview.data]);

  const send = useMutation({
    mutationFn: () => api.post(`/applications/${applicationId}/emails`, { template, subject, body }),
    onSuccess: () => {
      toast.success("E-posta gönderim kuyruğuna alındı");
      qc.invalidateQueries({ queryKey: ["application", applicationId] });
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title="Adaya e-posta gönder" wide>
      <div className="space-y-4">
        <div className="overflow-x-auto"><Tabs value={template} onChange={setTemplate} items={(Object.keys(LABELS) as TemplateKey[]).map((k) => ({ value: k, label: LABELS[k] }))} /></div>
        {preview.isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            <p className="text-sm text-slate-500">Alıcı: <b className="text-slate-700 dark:text-slate-200">{preview.data?.to}</b></p>
            <Field label="Konu"><input className="field" value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
            <Field label="İleti" hint="Şablon aday, pozisyon ve takip bağlantısıyla dolduruldu. Gönderim öncesi düzenleyebilirsiniz.">
              <textarea className="field min-h-56 leading-6" value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Vazgeç</Button>
          <Button icon={<Send className="size-4" />} onClick={() => send.mutate()} loading={send.isPending} disabled={!subject || !body}>Gönder</Button>
        </div>
      </div>
    </Modal>
  );
}
