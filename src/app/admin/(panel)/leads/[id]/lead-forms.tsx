"use client";

import { useActionState } from "react";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, SITE_VISIT_STATUSES, type LeadStatus, type SiteVisitStatus } from "@/lib/constants";
import { updateLeadAction, updateSiteVisitAction, type ActionState } from "../../../actions";

export function LeadStatusForm({ leadId, status, adminNotes }: { leadId: string; status: LeadStatus; adminNotes: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateLeadAction.bind(null, leadId), {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="status" className="field-label">Lead status</label>
        <select id="status" name="status" defaultValue={status} className="field">
          {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="adminNotes" className="field-label">Internal notes</label>
        <textarea id="adminNotes" name="adminNotes" rows={5} defaultValue={adminNotes ?? ""} className="field text-sm" placeholder="Calls, follow-ups, customer preferences…" />
      </div>
      {state.message && <p role="status" className={`text-sm font-semibold ${state.ok ? "text-moss-600" : "text-red-700"}`}>{state.message}</p>}
      <button disabled={pending} className="btn btn-dark w-full">{pending ? "Saving…" : "Save lead"}</button>
    </form>
  );
}

const VISIT_LABELS: Record<SiteVisitStatus, string> = { requested: "Requested", scheduled: "Scheduled", completed: "Completed", cancelled: "Cancelled" };

export function SiteVisitForm({ visitId, leadId, status, scheduledFor }: { visitId: string; leadId: string; status: SiteVisitStatus; scheduledFor: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateSiteVisitAction.bind(null, visitId, leadId), {});
  return (
    <form action={action} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="text-xs font-bold text-ink-600">
        Visit status
        <select name="status" defaultValue={status} className="field mt-1 min-h-10 py-1.5 text-sm">
          {SITE_VISIT_STATUSES.map((s) => <option key={s} value={s}>{VISIT_LABELS[s]}</option>)}
        </select>
      </label>
      <label className="text-xs font-bold text-ink-600">
        Scheduled for
        <input type="datetime-local" name="scheduledFor" defaultValue={scheduledFor} className="field mt-1 min-h-10 py-1.5 text-sm" />
      </label>
      <button disabled={pending} className="btn btn-sm btn-dark">{pending ? "Saving…" : "Update"}</button>
      {state.message && <p className={`text-xs font-semibold sm:col-span-3 ${state.ok ? "text-moss-600" : "text-red-700"}`}>{state.message}</p>}
    </form>
  );
}
