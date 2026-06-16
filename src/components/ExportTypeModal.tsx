import { useState } from 'react';
import type { ExportType } from '../utils/collectionFormat';

interface ExportTypeModalProps {
    onClose: () => void;
    onContinue: (type: ExportType) => void;
}

export function ExportTypeModal({ onClose, onContinue }: ExportTypeModalProps) {
    const [type, setType] = useState<ExportType>('games');

    return (
        <div className="collection-modal-backdrop" role="presentation" onClick={onClose}>
            <div
                className="collection-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Export Collection"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="collection-modal__title">Export Collection</h2>

                <div className="collection-modal__body">
                    <label className="collection-modal__label" htmlFor="export-type-select">
                        Collection type
                    </label>
                    <select
                        id="export-type-select"
                        className="collection-modal__select"
                        value={type}
                        onChange={e => setType(e.target.value as ExportType)}
                    >
                        <option value="games">Game Collection</option>
                        <option value="cards">Card Collection</option>
                        <option value="none">No Specification</option>
                    </select>

                    {type === 'none' && (
                        <p className="collection-modal__hint">
                            For "No Specification", games and cards selected will not be considered for the export action.
                        </p>
                    )}
                </div>

                <div className="collection-modal__actions">
                    <button type="button" className="collection-modal__btn-secondary" onClick={onClose}>
                        Close
                    </button>
                    <button type="button" className="collection-modal__btn-primary" onClick={() => onContinue(type)}>
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}
