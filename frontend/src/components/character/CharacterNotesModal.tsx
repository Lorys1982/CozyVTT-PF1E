import { useState } from 'react';
import { NotebookPen, Save, X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/services/api';
import type { Character } from '@/types';

interface Props {
  character: Character;
  onClose: () => void;
  onSaved?: (character: Character) => void;
}

export default function CharacterNotesModal({ character, onClose, onSaved }: Props) {
  const originalData = character.data && typeof character.data === 'object' && !Array.isArray(character.data)
    ? character.data as unknown as Record<string, unknown>
    : {};
  const [notes, setNotes] = useState(typeof originalData.notes === 'string' ? originalData.notes : '');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const modalRef = useFocusTrap(true, onClose);

  const save = async () => {
    try {
      setSaving(true);
      const data = { ...originalData, notes } as unknown as Character['data'];
      const response = await api.updateCharacter(character.id, { data });
      onSaved?.(response.character);
      showToast('Character notes saved.', 'success');
      onClose();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to save character notes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="character-notes-title" className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border-2 border-moss-green/30 bg-soft-cream shadow-2xl">
      <header className="flex items-center justify-between border-b border-moss-green/20 bg-parchment/40 px-5 py-4">
        <div className="flex items-center gap-3"><NotebookPen className="h-5 w-5 text-brand-ink"/><div><h2 id="character-notes-title" className="text-xl font-bold text-brand-ink">{character.name} · Notes</h2><p className="text-xs text-warm-gray">Editable by the character owner and campaign DM.</p></div></div>
        <button type="button" onClick={onClose} aria-label="Close notes" className="rounded-lg p-2 text-stone-gray hover:bg-black/5"><X className="h-5 w-5"/></button>
      </header>
      <div className="flex-1 overflow-y-auto p-5"><textarea autoFocus aria-label="Character notes" maxLength={50000} value={notes} onChange={event=>setNotes(event.target.value)} placeholder="Session notes, plans, clues, reminders…" className="min-h-[50vh] w-full resize-y rounded-xl border border-moss-green/30 bg-white p-4 text-sm leading-relaxed text-stone-gray outline-none focus:border-moss-green focus:ring-2 focus:ring-moss-green/20"/></div>
      <footer className="flex items-center justify-end gap-3 border-t border-moss-green/20 bg-parchment/30 p-4"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-stone-gray hover:bg-black/5">Cancel</button><button type="button" disabled={saving} onClick={()=>void save()} className="inline-flex items-center gap-2 rounded-lg bg-moss-green px-4 py-2 font-semibold text-white hover:bg-moss-green/90 disabled:opacity-60"><Save className="h-4 w-4"/>{saving?'Saving…':'Save notes'}</button></footer>
    </div>
  </div>;
}
