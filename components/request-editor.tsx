'use client';
import { useActionState, useState } from 'react';
import { updateContactRequest } from '@/app/admin/(dashboard)/requests/actions';
export function RequestEditor({
  id,
  revision,
  status,
  note,
}: {
  id: string;
  revision: string;
  status: string;
  note: string;
}) {
  const [state, action, pending] = useActionState(updateContactRequest, {});
  const [currentStatus, setStatus] = useState(status);
  const [currentNote, setNote] = useState(note);
  return (
    <form action={action} className="request-editor admin-panel">
      <h2>Manage request</h2>
      <p>Track your progress and keep a private note.</p>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={revision} />
      <label htmlFor="request-status">Status</label>
      <select
        id="request-status"
        name="status"
        value={currentStatus}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="new">New</option>
        <option value="in_progress">In progress</option>
        <option value="resolved">Resolved</option>
        <option value="archived">Archived</option>
      </select>
      <label htmlFor="request-note">Private note</label>
      <textarea
        id="request-note"
        name="note"
        maxLength={2000}
        rows={7}
        value={currentNote}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Next steps, context, or a reminder…"
      />
      <small>Only visible to you. {currentNote.length.toLocaleString('en-US')} / 2,000</small>
      <p className={state.success ? 'request-success' : 'request-error'} role="status">
        {pending ? 'Saving changes…' : state.message}
      </p>
      <button className="button button-dark" disabled={pending}>
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
