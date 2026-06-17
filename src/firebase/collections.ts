import {
    Timestamp,
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    getFirestore,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore';
import { firebaseApp } from './config';

export interface CloudCollection {
    id: string;
    name: string;
    data: string;
    createdAt: Date;
    updatedAt: Date;
}

const db = getFirestore(firebaseApp);

function userCollectionsRef(uid: string) {
    return collection(db, 'users', uid, 'collections');
}

export async function listCloudCollections(uid: string): Promise<CloudCollection[]> {
    const q = query(userCollectionsRef(uid), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
        id: d.id,
        name: d.data().name as string,
        data: d.data().data as string,
        createdAt: (d.data().createdAt as Timestamp | null)?.toDate() ?? new Date(),
        updatedAt: (d.data().updatedAt as Timestamp | null)?.toDate() ?? new Date(),
    }));
}

export async function saveCloudCollection(uid: string, name: string, data: string): Promise<string> {
    const ref = await addDoc(userCollectionsRef(uid), {
        name,
        data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
}

export async function overwriteCloudCollection(uid: string, id: string, data: string): Promise<void> {
    await updateDoc(doc(db, 'users', uid, 'collections', id), {
        data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteCloudCollection(uid: string, id: string): Promise<void> {
    await deleteDoc(doc(db, 'users', uid, 'collections', id));
}
