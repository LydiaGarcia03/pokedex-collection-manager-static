import type { User } from 'firebase/auth';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface UserMenuProps {
    user: User;
    onLogout: () => void;
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    const displayName = user.displayName ?? user.email ?? 'User';

    return (
        <div className="user-menu" ref={ref}>
            <button
                type="button"
                className="user-menu__trigger"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
            >
                <UserIcon size={15} />
                <span className="user-menu__email">{displayName}</span>
            </button>

            {open && (
                <div className="user-menu__dropdown">
                    <div className="user-menu__email-full">{user.email}</div>
                    <button
                        type="button"
                        className="user-menu__item user-menu__item--danger"
                        onClick={() => { setOpen(false); onLogout(); }}
                    >
                        <LogOut size={14} />
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}
