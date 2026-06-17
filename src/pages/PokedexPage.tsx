import { ChevronDown, ChevronUp, User as UserIcon, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchTcgCards, filterPokemon, loadAllPokemon } from '../api/pokemonApi';
import { AuthModal } from '../components/AuthModal';
import { ExportContentModal } from '../components/ExportContentModal';
import { ExportTypeModal } from '../components/ExportTypeModal';
import { ImportCollectionModal } from '../components/ImportCollectionModal';
import { MyCollectionsModal } from '../components/MyCollectionsModal';
import { PokemonCard } from '../components/PokemonCard';
import { PokemonModal } from '../components/PokemonModal';
import { SaveCollectionModal } from '../components/SaveCollectionModal';
import { UserMenu } from '../components/UserMenu';
import { logout } from '../firebase/auth';
import {
    type CloudCollection,
    deleteCloudCollection,
    listCloudCollections,
    overwriteCloudCollection,
    saveCloudCollection,
} from '../firebase/collections';
import { useAuth } from '../hooks/useAuth';
import { useCollection } from '../hooks/useCollection';
import type { Pokemon, PokemonSummary, TcgCard } from '../types/Pokemon';
import { buildExportText, type ExportType } from '../utils/collectionFormat';

type ExportStep = 'closed' | 'type' | 'loading' | 'content';

interface Toast {
    message: string;
    type: 'success' | 'error';
}

const GEN_LABELS: Record<number, string> = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX',
};

export function PokedexPage() {
    // All Pokémon loaded once at startup from pokemon-compiled.json
    const [allPokemon, setAllPokemon] = useState<Pokemon[]>([]);
    // Detail cache: populated synchronously from allPokemon when a modal opens
    const [detailCache, setDetailCache] = useState<Record<string, Pokemon>>({});
    const [activePokemonIndex, setActivePokemonIndex] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [exportStep, setExportStep] = useState<ExportStep>('closed');
    const [exportContent, setExportContent] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedGeneration, setSelectedGeneration] = useState<number | null>(null);
    const [genDropdownOpen, setGenDropdownOpen] = useState(false);
    const genDropdownRef = useRef<HTMLDivElement>(null);
    const [collectionVisible, setCollectionVisible] = useState(false);
    const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

    // Cloud / auth state
    const { user } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showMyCollections, setShowMyCollections] = useState(false);
    const [cloudCollections, setCloudCollections] = useState<CloudCollection[]>([]);
    const [cloudLoading, setCloudLoading] = useState(false);
    const [toast, setToast] = useState<Toast | null>(null);

    // Ref used in export to order selected Pokémon — always the full unfiltered list
    const allPokemonRef = useRef<Pokemon[]>([]);

    const collection = useCollection();

    // Scroll-to-top button: appear after scrolling one full viewport
    useEffect(() => {
        function handleScroll() {
            setShowScrollTop(window.scrollY > window.innerHeight);
        }
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Auto-dismiss toast after 4 seconds
    useEffect(() => {
        if (!toast) return;
        const id = window.setTimeout(() => setToast(null), 4000);
        return () => window.clearTimeout(id);
    }, [toast]);

    async function fetchCloudCollections(uid: string) {
        setCloudLoading(true);
        try {
            const cols = await listCloudCollections(uid);
            setCloudCollections(cols);
            return cols;
        } finally {
            setCloudLoading(false);
        }
    }

    async function handleAuthSuccess(isNewUser: boolean) {
        setShowAuthModal(false);
        if (isNewUser) {
            setToast({ message: 'Account created! Welcome to your Pokédex.', type: 'success' });
            return;
        }
        // Load the most recently updated collection automatically
        const uid = (await import('../firebase/auth')).auth.currentUser?.uid;
        if (!uid) return;
        const cols = await fetchCloudCollections(uid);
        if (cols.length === 0) {
            setToast({ message: 'Logged in. No saved collections found.', type: 'success' });
            return;
        }
        const latest = cols[0];
        const ok = collection.importFromJson(latest.data);
        if (ok) {
            setToast({ message: `Collection "${latest.name}" loaded from the cloud.`, type: 'success' });
        } else {
            setToast({ message: `Logged in. Could not auto-load "${latest.name}".`, type: 'error' });
        }
    }

    async function handleLogout() {
        await logout();
        setCloudCollections([]);
        setToast({ message: 'Logged out.', type: 'success' });
    }

    async function handleOpenMyCollections() {
        if (!user) return;
        setShowMyCollections(true);
        await fetchCloudCollections(user.uid);
    }

    async function handleOpenSaveModal() {
        if (!user) return;
        setShowSaveModal(true);
        if (cloudCollections.length === 0) {
            await fetchCloudCollections(user.uid);
        }
    }

    async function handleSaveNew(name: string) {
        if (!user) return;
        const data = collection.exportAsJson();
        const id = await saveCloudCollection(user.uid, name, data);
        setCloudCollections(prev => [{
            id,
            name,
            data,
            createdAt: new Date(),
            updatedAt: new Date(),
        }, ...prev]);
        setToast({ message: `Collection "${name}" saved to the cloud.`, type: 'success' });
    }

    async function handleOverwrite(collectionId: string) {
        if (!user) return;
        const data = collection.exportAsJson();
        await overwriteCloudCollection(user.uid, collectionId, data);
        setCloudCollections(prev => prev.map(c =>
            c.id === collectionId ? { ...c, data, updatedAt: new Date() } : c
        ));
        const name = cloudCollections.find(c => c.id === collectionId)?.name ?? '';
        setToast({ message: `Collection "${name}" updated.`, type: 'success' });
    }

    async function handleDeleteCloud(collectionId: string) {
        if (!user) return;
        await deleteCloudCollection(user.uid, collectionId);
        setCloudCollections(prev => prev.filter(c => c.id !== collectionId));
    }

    function handleLoadCloud(data: string, name: string) {
        const ok = collection.importFromJson(data);
        if (ok) {
            setToast({ message: `Collection "${name}" loaded.`, type: 'success' });
        } else {
            setToast({ message: `Failed to load "${name}".`, type: 'error' });
        }
    }

    // Load all Pokémon data once on mount
    useEffect(() => {
        loadAllPokemon().then(data => {
            setAllPokemon(data);
            allPokemonRef.current = data;
        });
    }, []);

    // Debounce search input (250ms — matches original backend debounce)
    useEffect(() => {
        const id = window.setTimeout(() => setDebouncedSearch(search), 250);
        return () => window.clearTimeout(id);
    }, [search]);

    // Close generation dropdown when clicking outside
    useEffect(() => {
        function handleOutsideClick(e: MouseEvent) {
            if (genDropdownRef.current && !genDropdownRef.current.contains(e.target as Node)) {
                setGenDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    // Client-side filtering — same logic as PokemonSearchFilter.java
    const summaries: PokemonSummary[] = useMemo(
        () => filterPokemon(allPokemon, debouncedSearch, null, selectedGeneration),
        [allPokemon, debouncedSearch, selectedGeneration]
    );

    const activeSummary = activePokemonIndex !== null ? summaries[activePokemonIndex] ?? null : null;
    const activePokemonDetail = activeSummary ? detailCache[activeSummary.id] ?? null : null;
    // No async detail fetch in static version — data is already in allPokemon
    const detailLoading = false;

    useEffect(() => {
        if (activePokemonIndex !== null && activePokemonIndex >= summaries.length) {
            setActivePokemonIndex(null);
        }
    }, [activePokemonIndex, summaries.length]);

    function handleOpenModal(index: number) {
        const summary = summaries[index];
        if (!summary) return;

        setActivePokemonIndex(index);

        // Populate detail cache synchronously from pre-loaded data
        if (!detailCache[summary.id]) {
            const detail = allPokemon.find(p => p.id === summary.id);
            if (detail) {
                setDetailCache(prev => ({ ...prev, [summary.id]: detail }));
            }
        }
    }

    function handleCloseModal() {
        setActivePokemonIndex(null);
    }

    function handleClearAll() {
        collection.clear();
        setShowClearConfirm(false);
    }

    async function handleExportContinue(type: ExportType) {
        setExportStep('loading');

        let tcgCardsByPokemonId: Record<string, TcgCard[]> | undefined;

        if (type === 'cards') {
            const pokemonWithCards = collection.selectedPokemonIds.filter(
                id => (collection.selectedCardsByPokemonId[id]?.length ?? 0) > 0
            );

            if (pokemonWithCards.length > 0) {
                tcgCardsByPokemonId = {};
                await Promise.all(
                    pokemonWithCards.map(async id => {
                        // Look up the Pokémon name by ID so fetchTcgCards can find the right bucket
                        const pokemon = allPokemonRef.current.find(p => p.id === id);
                        if (!pokemon) return;
                        const response = await fetchTcgCards(pokemon.name);
                        tcgCardsByPokemonId![id] = response.cards;
                    })
                );
            }
        }

        const content = buildExportText({
            type,
            selectedPokemonIds: collection.selectedPokemonIds,
            selectedGamesByPokemonId: collection.selectedGamesByPokemonId,
            selectedCardsByPokemonId: collection.selectedCardsByPokemonId,
            // Use the full unfiltered list so export order is always correct
            summaries: allPokemonRef.current as PokemonSummary[],
            tcgCardsByPokemonId,
        });

        setExportContent(content);
        setExportStep('content');
    }

    function handleImportContent(content: string) {
        return collection.importFromText(content);
    }

    return (
        <main className="pokedex-page">
            <section className="pokedex-toolbar">
                <input
                    className="pokedex-search"
                    type="search"
                    placeholder="Search Pokémon..."
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                />

                <div className="gen-filter" ref={genDropdownRef}>
                    <button
                        type="button"
                        className={`gen-filter__button${selectedGeneration ? ' gen-filter__button--active' : ''}`}
                        onClick={() => setGenDropdownOpen(o => !o)}
                        aria-expanded={genDropdownOpen}
                    >
                        {selectedGeneration ? `Gen ${GEN_LABELS[selectedGeneration]}` : 'All Gens'}
                        <ChevronDown size={14} />
                    </button>

                    {genDropdownOpen && (
                        <div className="gen-filter__dropdown" role="listbox">
                            {([null, 1, 2, 3, 4, 5, 6, 7, 8, 9] as (number | null)[]).map(gen => (
                                <button
                                    key={gen ?? 'all'}
                                    type="button"
                                    role="option"
                                    aria-selected={selectedGeneration === gen}
                                    className={`gen-filter__option${selectedGeneration === gen ? ' gen-filter__option--selected' : ''}`}
                                    onClick={() => { setSelectedGeneration(gen); setGenDropdownOpen(false); }}
                                >
                                    {gen === null ? 'All Gens' : `Gen ${GEN_LABELS[gen]}`}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Mobile header band with branding */}
            <div className="mobile-header-band" aria-hidden="true">
                <span className="mobile-header-band__title">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h6.5" />
                        <path d="M15.5 12H22" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                    Pokédex CM
                </span>
            </div>

            {/* Auth corner — absolute on desktop, fixed circle on mobile */}
            <div className="pokedex-auth-corner">
                {user ? (
                    <UserMenu user={user} onLogout={handleLogout} />
                ) : (
                    <button
                        type="button"
                        className="collection-action-button collection-action-button--login"
                        onClick={() => setShowAuthModal(true)}
                        aria-label="Login"
                    >
                        <UserIcon size={16} className="login-btn__icon" />
                        <span className="login-btn__text">Login</span>
                    </button>
                )}
            </div>

            {/* Mobile actions toggle */}
            <div className="collection-actions-mobile-header">
                <button
                    type="button"
                    className="collection-actions-mobile-trigger"
                    onClick={() => setMobileActionsOpen(o => !o)}
                    aria-expanded={mobileActionsOpen}
                >
                    Actions {mobileActionsOpen ? '▲' : '▾'}
                </button>
            </div>

            <section className={`collection-actions${mobileActionsOpen ? ' collection-actions--mobile-open' : ''}`}>
                <button
                    type="button"
                    className="collection-action-button"
                    onClick={() => { setShowImportModal(true); setMobileActionsOpen(false); }}
                >
                    Import Collection
                </button>

                <button
                    type="button"
                    className="collection-action-button"
                    onClick={() => { setExportStep('type'); setMobileActionsOpen(false); }}
                >
                    Export Collection
                </button>

                <button
                    type="button"
                    className={`collection-action-button ${collectionVisible ? 'collection-action-button--active' : ''}`}
                    onClick={() => setCollectionVisible(v => !v)}
                >
                    Toggle Collection Visibility
                </button>

                {user && (
                    <>
                        <button
                            type="button"
                            className="collection-action-button collection-action-button--cloud"
                            onClick={() => { handleOpenSaveModal(); setMobileActionsOpen(false); }}
                        >
                            Save Collection
                        </button>

                        <button
                            type="button"
                            className="collection-action-button collection-action-button--cloud"
                            onClick={() => { handleOpenMyCollections(); setMobileActionsOpen(false); }}
                        >
                            My Collections
                        </button>
                    </>
                )}

                {collection.selectedPokemonIds.length > 0 && (
                    <button
                        type="button"
                        className="collection-action-button collection-action-button--danger collection-actions__clear-mobile"
                        onClick={() => { setShowClearConfirm(true); setMobileActionsOpen(false); }}
                    >
                        <X size={14} />
                        Clear all
                    </button>
                )}
            </section>

            <div className="pokedex-count-row">
                <div className="pokedex-count">
                    <span>
                        Showing {summaries.length} Pokémon · Selected {collection.selectedPokemonIds.length}
                    </span>
                </div>

                {collection.selectedPokemonIds.length > 0 && (
                    <button
                        type="button"
                        className="clear-all-button"
                        onClick={() => setShowClearConfirm(true)}
                    >
                        <X size={14} />
                        Clear all
                    </button>
                )}
            </div>

            <section className="pokedex-grid">
                {summaries.map((item, index) => (
                    <PokemonCard
                        key={item.id}
                        pokemon={item}
                        selected={collection.isPokemonSelected(item.id)}
                        collectionVisible={collectionVisible}
                        onToggleSelected={collection.togglePokemon}
                        onOpenDetails={() => handleOpenModal(index)}
                        onCommitDeselection={collection.commitPendingCleanup}
                    />
                ))}
            </section>

            <PokemonModal
                pokemonList={summaries}
                activePokemonIndex={activePokemonIndex}
                activePokemonDetail={activePokemonDetail}
                detailLoading={detailLoading}
                onChangePokemon={handleOpenModal}
                onClose={handleCloseModal}
                collection={collection}
                collectionVisible={collectionVisible}
                onToggleCollectionVisible={() => setCollectionVisible(v => !v)}
            />

            {showClearConfirm && (
                <div
                    className="clear-confirm-backdrop"
                    role="presentation"
                    onClick={() => setShowClearConfirm(false)}
                >
                    <div
                        className="clear-confirm-modal"
                        role="dialog"
                        aria-modal="true"
                        onClick={e => e.stopPropagation()}
                    >
                        <p className="clear-confirm-modal__message">
                            Are you sure you want to clear all selections?
                            <br />
                            <small>This action cannot be undone.</small>
                        </p>

                        <div className="clear-confirm-modal__actions">
                            <button
                                type="button"
                                className="clear-confirm-modal__cancel"
                                onClick={() => setShowClearConfirm(false)}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="clear-confirm-modal__confirm"
                                onClick={handleClearAll}
                            >
                                Clear all
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {exportStep === 'type' && (
                <ExportTypeModal
                    onClose={() => setExportStep('closed')}
                    onContinue={handleExportContinue}
                />
            )}

            {exportStep === 'loading' && (
                <div className="collection-loading-overlay" role="status" aria-label="Gerando arquivo...">
                    <span className="collection-loading-overlay__spinner" />
                </div>
            )}

            {exportStep === 'content' && (
                <ExportContentModal
                    content={exportContent}
                    onClose={() => setExportStep('closed')}
                />
            )}

            {showImportModal && (
                <ImportCollectionModal
                    onClose={() => setShowImportModal(false)}
                    onImport={handleImportContent}
                />
            )}

            {showAuthModal && (
                <AuthModal
                    onClose={() => setShowAuthModal(false)}
                    onSuccess={handleAuthSuccess}
                />
            )}

            {showSaveModal && user && (
                <SaveCollectionModal
                    onClose={() => setShowSaveModal(false)}
                    onSaveNew={handleSaveNew}
                    onOverwrite={handleOverwrite}
                    existingCollections={cloudCollections}
                />
            )}

            {showMyCollections && user && (
                <MyCollectionsModal
                    onClose={() => setShowMyCollections(false)}
                    onLoad={handleLoadCloud}
                    onDelete={handleDeleteCloud}
                    collections={cloudCollections}
                    loading={cloudLoading}
                />
            )}

            {toast && (
                <div className={`pokedex-toast pokedex-toast--${toast.type}`} role="status">
                    {toast.message}
                </div>
            )}

            {showScrollTop && (
                <button
                    type="button"
                    className="scroll-to-top"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    aria-label="Back to top"
                >
                    <ChevronUp size={22} />
                </button>
            )}
        </main>
    );
}
