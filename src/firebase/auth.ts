import {
    createUserWithEmailAndPassword,
    getAuth,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import { firebaseApp } from './config';

export const auth = getAuth(firebaseApp);

export function login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
}

export function register(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
}

export function logout() {
    return signOut(auth);
}
