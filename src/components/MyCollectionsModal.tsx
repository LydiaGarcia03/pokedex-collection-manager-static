import { CloudOff, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { CloudCollection } from '../firebase/collections';

interface MyCollectionsModalProps {
    onClose: () => void;
    onLoad: (data: string, name: string) => void;
    onDelete: (id: string) => Promise<void>;
    collections: CloudCollection[];
    loading: boolean;
}

interface DeleteConfirm {
    id: string;
    name: string;
}

export function MyCollectionsModal({ onClose, onLoad, onDelete, collections, loading }: MyCollectionsModalProps) {
    const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    async function handleConfirmDelete() {
        if (!deleteConfirm) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            await onDelete(deleteConfirm.id);
            setDeleteConfirm(null);
        } catch {
            setDeleteError('Failed to delete. Please try again.');
        } finally {
            setDeleting(false);
        }
    }

    return (
        <>
            <div className="collection-modal-backdrop" role="presentation" onClick={onClose}>
                <div
                    className="collection-modal my-collections-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label="My Collections"
                    onClick={e => e.stopPropagation()}
                >
                    <h2 className="collection-modal__title">My Collections</h2>

                    <div className="my-collections-modal__list">
                        {loading && (
                            <p className="my-collections-modal__empty">Loading…</p>
                        )}

                        {!loading && collections.length === 0 && (
                            <div className="my-collections-modal__empty">
                                <CloudOff size={28} />
                                <span>No collections saved yet.</span>
                            </div>
                        )}

                        {!loading && collections.map(c => (
                            <div key={c.id} className="my-collections-modal__item">
                                <button
                                    type="button"
                                    className="my-collections-modal__item-main"
                                    onClick={() => { onLoad(c.data, c.name); onClose(); }}
                                >
                                    <span className="my-collections-modal__item-name">{c.name}</span>
                                    <span className="my-collections-modal__item-date">
                                        Updated {formatDate(c.updatedAt)}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className="my-collections-modal__delete"
                                    aria-label={`Delete ${c.name}`}
                                    onClick={() => { setDeleteConfirm({ id: c.id, name: c.name }); setDeleteError(null); }}
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="collection-modal__actions">
                        <button type="button" className="collection-modal__btn-secondary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {deleteConfirm && (
                <div className="collection-modal-backdrop collection-modal-backdrop--top" role="presentation" onClick={() => setDeleteConfirm(null)}>
                    <div
                        className="collection-modal clear-confirm-modal"
                        role="dialog"
                        aria-modal="true"
                        onClick={e => e.stopPropagation()}
                    >
                        <p className="clear-confirm-modal__message">
                            Do you wish to delete <strong>"{deleteConfirm.name}"</strong> from your collection list?
                        </p>

                        {deleteError && <p className="auth-modal__error">{deleteError}</p>}

                        <div className="clear-confirm-modal__actions">
                            <button
                                type="button"
                                className="clear-confirm-modal__cancel"
                                onClick={() => setDeleteConfirm(null)}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="clear-confirm-modal__confirm"
                                onClick={handleConfirmDelete}
                                disabled={deleting}
                            >
                                {deleting ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function formatDate(date: Date): string {
    return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}
