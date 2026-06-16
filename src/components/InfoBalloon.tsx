import type { ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface InfoBalloonProps {
    label: ReactNode;
    content?: ReactNode;
    className?: string;
}

const BALLOON_MARGIN = 8;
const BALLOON_OFFSET = 6;

export function InfoBalloon({ label, content, className }: InfoBalloonProps) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const balloonRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!open || !triggerRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const balloonRect = balloonRef.current?.getBoundingClientRect();
        const balloonWidth = balloonRect?.width ?? 220;
        const balloonHeight = balloonRect?.height ?? 60;

        let top = triggerRect.bottom + BALLOON_OFFSET;
        if (top + balloonHeight > window.innerHeight - BALLOON_MARGIN) {
            top = triggerRect.top - balloonHeight - BALLOON_OFFSET;
        }

        let left = triggerRect.left;
        if (left + balloonWidth > window.innerWidth - BALLOON_MARGIN) {
            left = window.innerWidth - balloonWidth - BALLOON_MARGIN;
        }
        if (left < BALLOON_MARGIN) left = BALLOON_MARGIN;

        setPos({ top, left });
    }, [open]);

    useLayoutEffect(() => {
        if (!open) return;

        function handlePointerDown(event: PointerEvent) {
            const target = event.target as Node;
            if (triggerRef.current?.contains(target)) return;
            if (balloonRef.current?.contains(target)) return;
            setOpen(false);
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') setOpen(false);
        }

        function handleClose() {
            setOpen(false);
        }

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleClose);
        window.addEventListener('scroll', handleClose, true);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleClose);
            window.removeEventListener('scroll', handleClose, true);
        };
    }, [open]);

    if (!content) {
        return <span className={className}>{label}</span>;
    }

    return (
        <>
            <button
                type="button"
                ref={triggerRef}
                className={`info-balloon-trigger ${className ?? ''}`}
                onClick={() => setOpen(o => !o)}
            >
                {label}
            </button>

            {open && createPortal(
                <div
                    ref={balloonRef}
                    className="info-balloon"
                    style={{ top: pos.top, left: pos.left }}
                    role="tooltip"
                >
                    {content}
                </div>,
                document.body,
            )}
        </>
    );
}
