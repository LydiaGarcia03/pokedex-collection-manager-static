import { useState } from 'react';
import type { CloudCollection } from '../firebase/collections';

interface SaveCollectionModalProps {
    onClose: () => void;
    onSaveNew: (name: string) => Promise<void>;
    onOverwrite: (id: string) => Promise<void>;
    existingCollections: CloudCollection[];
}

type SaveMode = 'new' | 'overwrite';

export function SaveCollectionModal({ onClose, onSaveNew, onOverwrite, existingCollections }: SaveCollectionModalProps) {
    const hasExisting = existingCollections.length > 0;
    const [mode, setMode] = useState<SaveMode>(hasExisting ? 'overwrite' : 'new');
    const [name, setName] = useState('');
    const [selectedId, setSelectedId] = useState<string>(existingCollections[0]?.id ?? '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canSave = mode === 'new' ? name.trim().length > 0 : selectedId.length > 0;

    async function handleSave() {
        setError(null);
        setLoading(true);
        try {
            if (mode === 'new') {
                await onSaveNew(name.trim());
            } else {
                await onOverwrite(selectedId);
            }
            onClose();
        } catch {
            setError('Failed to save collection. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="collection-modal-backdrop" role="presentation" onClick={onClose}>
            <div
                className="collection-modal save-collection-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Save Collection"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="collection-modal__title">Save Collection</h2>

                <div className="save-collection-modal__body">
                    {hasExisting && (
                        <div className="save-collection-modal__options">
                            <label className="save-collection-modal__option">
                                <input
                                    type="radio"
                                    name="save-mode"
                                    checked={mode === 'new'}
                                    onChange={() => setMode('new')}
                                />
                                Save as new collection
                            </label>
                            <label className="save-collection-modal__option">
                                <input
                                    type="radio"
                                    name="save-mode"
                                    checked={mode === 'overwrite'}
                                    onChange={() => setMode('overwrite')}
                                />
                                Replace existing collection
                            </label>
                        </div>
                    )}

                    {mode === 'new' ? (
                        <div className="save-collection-modal__field">
                            <label htmlFor="collection-name" className="auth-modal__label">Collection name</label>
                            <input
                                id="collection-name"
                                type="text"
                                className="auth-modal__input"
                                placeholder="e.g. Kanto 100%, Shiny Hunt…"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                maxLength={60}
                                disabled={loading}
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div className="save-collection-modal__field">
                            <label htmlFor="collection-select" className="auth-modal__label">Choose collection to replace</label>
                            <select
                                id="collection-select"
                                className="auth-modal__input save-collection-modal__select"
                                value={selectedId}
                                onChange={e => setSelectedId(e.target.value)}
                                disabled={loading}
                            >
                                {existingCollections.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} — {formatDate(c.updatedAt)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {error && <p className="auth-modal__error">{error}</p>}
                </div>

                <div className="collection-modal__actions">
                    <button
                        type="button"
                        className="collection-modal__btn-secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="collection-modal__btn-primary"
                        onClick={handleSave}
                        disabled={!canSave || loading}
                    >
                        {loading ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function formatDate(date: Date): string {
    return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}
