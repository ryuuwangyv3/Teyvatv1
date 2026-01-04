
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { UserProfile, Persona, Message, ForumPost, ForumComment, SystemLog, GlobalStats, DriveItem, Donator, SupabaseConfig } from '../types';
import { encryptData, decryptData, SecureStorage } from './securityService';
import { getSystemCredentials } from './credentials';

// --- INDEXED DB HELPERS (LOCAL VFS & CACHE) ---
const DB_NAME = "Akasha_VFS_DB";
const STORE_DRIVE = "drive_items";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;
    
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_DRIVE)) {
                db.createObjectStore(STORE_DRIVE, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return dbPromise;
};

const idbGet = async (storeName: string, id: string): Promise<any | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};

const idbGetAll = async (storeName: string): Promise<any[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const idbPut = async (storeName: string, item: any): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const idbDelete = async (storeName: string, id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// --- SUPABASE CLIENT ---
let supabaseInstance: SupabaseClient | null = null;
let currentUserId = 'guest';

/**
 * Mendapatkan konfigurasi Supabase dengan proteksi placeholder.
 */
export const getSupabaseConfig = (): SupabaseConfig | null => {
    const creds = getSystemCredentials();
    const local = SecureStorage.getItem('supabase_config');
    
    // PRIORITY 1: Local storage (Admin Console manual override)
    if (local && local.url && local.url.startsWith('http') && !local.url.includes('your-project')) {
        return local;
    }
    
    // PRIORITY 2: System credentials (credentials.ts)
    if (creds.url && creds.url.startsWith('http') && !creds.url.includes('your-project')) {
        return { url: creds.url, key: creds.key, enabled: true };
    }
    
    return null;
};

export const updateSupabaseCredentials = (url: string, key: string) => {
    SecureStorage.setItem('supabase_config', { url, key, enabled: true });
    return initSupabase();
};

export const initSupabase = (): boolean => {
    const config = getSupabaseConfig();
    
    if (!config) {
        supabaseInstance = null;
        return false;
    }

    try {
        supabaseInstance = createClient(config.url, config.key, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
            }
        });
        
        supabaseInstance.auth.getSession().then(({ data }) => {
            if (data.session?.user) currentUserId = data.session.user.id;
        });
        
        return true;
    } catch (e) {
        supabaseInstance = null;
        return false;
    }
};

/**
 * Mengecek apakah Supabase benar-benar terhubung ke database.
 * -1: Config Missing/Placeholder, -2: Table Missing, >0: Latency (Online), -3: Network Error
 */
export const checkDbConnection = async (): Promise<number> => {
    const config = getSupabaseConfig();
    if (!config) return -1;
    
    if (!supabaseInstance) initSupabase();
    if (!supabaseInstance) return -1;

    const start = Date.now();
    try {
        const { error } = await supabaseInstance.from('user_profiles').select('user_id').limit(1);
        if (error) {
            if (error.code === '42P01' || error.message.includes('not found')) return -2;
            if (error.code === '42501' || error.message.includes('JWT') || error.code === 'PGRST301') return -3;
            return -3;
        }
        return Date.now() - start;
    } catch (e) {
        return -3;
    }
};

export const getCurrentSession = async () => {
    if (!supabaseInstance) return null;
    try {
        const { data } = await supabaseInstance.auth.getSession();
        if (data.session?.user) currentUserId = data.session.user.id;
        return data.session;
    } catch (e) {
        return null;
    }
};

export const listenToAuthChanges = (callback: (user: any | null) => void) => {
    if (!supabaseInstance) return { subscription: { unsubscribe: () => {} } };
    const { data } = supabaseInstance.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            currentUserId = session.user.id;
            callback(session.user);
        } else {
            currentUserId = 'guest';
            callback(null);
        }
    });
    return data;
};

export const signInWithGoogle = async () => {
    if (!supabaseInstance) return { error: { message: "Akasha Cloud not configured." } };
    return await supabaseInstance.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
};

export const signOut = async () => {
    if (!supabaseInstance) return;
    await supabaseInstance.auth.signOut();
};

export const subscribeToTable = (tableName: string, callback: (payload: any) => void): RealtimeChannel | null => {
    if (!supabaseInstance) return null;
    return supabaseInstance
        .channel(`public:${tableName}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, callback)
        .subscribe();
};

// --- LOGGING ---
export const logSystemEvent = async (message: string, type: 'info' | 'warn' | 'error' | 'success') => {
    console.log(`[${type.toUpperCase()}] ${message}`);
    if (supabaseInstance) {
        await supabaseInstance.from('system_logs').insert({ message, type }).catch(() => {});
    }
};

export const fetchSystemLogs = async (): Promise<SystemLog[]> => {
    if (!supabaseInstance) return [];
    try {
        const { data } = await supabaseInstance.from('system_logs').select('*').order('created_at', { ascending: false }).limit(50);
        return data || [];
    } catch (e) { return []; }
};

export const fetchGlobalStats = async (): Promise<GlobalStats> => {
    if (!supabaseInstance) return { total_users: 0, total_posts: 0, active_personas: 12 };
    try {
        const { count: users } = await supabaseInstance.from('user_profiles').select('*', { count: 'exact', head: true });
        const { count: posts } = await supabaseInstance.from('forum_posts').select('*', { count: 'exact', head: true });
        return { total_users: users || 0, total_posts: posts || 0, active_personas: 12 };
    } catch (e) { return { total_users: 0, total_posts: 0, active_personas: 12 }; }
};

// --- STORAGE ---
const getBucketName = () => 'drive';

export const uploadToSupabaseStorage = async (file: File | Blob, fileName: string): Promise<string | null> => {
    if (!supabaseInstance || currentUserId === 'guest') return null;
    try {
        const filePath = `${currentUserId}/${crypto.randomUUID()}_${fileName}`;
        const bucket = getBucketName();
        const { error } = await supabaseInstance.storage.from(bucket).upload(filePath, file);
        if (error) return null;
        const { data: urlData } = supabaseInstance.storage.from(bucket).getPublicUrl(filePath);
        return urlData.publicUrl;
    } catch (e) { return null; }
};

export const deleteFromSupabaseStorage = async (publicUrl: string) => {
    if (!supabaseInstance || currentUserId === 'guest') return;
    try {
        const bucket = getBucketName();
        const parts = publicUrl.split(`${bucket}/`);
        if (parts.length < 2) return;
        await supabaseInstance.storage.from(bucket).remove([parts[1]]);
    } catch (e) {}
};

// --- SYNC ENGINE ---
export const syncUserProfile = async (profile: UserProfile) => {
    await VfsManager.saveItem('profile.json', profile);
    if (supabaseInstance && currentUserId !== 'guest') {
        await supabaseInstance.from('user_profiles').upsert({
            user_id: currentUserId,
            username: profile.username, bio: profile.bio,
            avatar: profile.avatar, header_background: profile.headerBackground,
            email: profile.email
        });
    }
};

export const fetchUserProfile = async (): Promise<UserProfile | null> => {
    if (supabaseInstance && currentUserId !== 'guest') {
        try {
            const { data } = await supabaseInstance.from('user_profiles').select('*').eq('user_id', currentUserId).single();
            if (data) {
                const p = { username: data.username, bio: data.bio, avatar: data.avatar, headerBackground: data.header_background, email: data.email, isAuth: true };
                await VfsManager.saveItem('profile.json', p);
                return p;
            }
        } catch (e) {}
    }
    return await VfsManager.loadItem('profile.json');
};

export const syncChatHistory = async (personaId: string, messages: Message[]) => {
    const limited = messages.slice(-50);
    await VfsManager.saveItem(`history_${personaId}.json`, limited);
    if (supabaseInstance && currentUserId !== 'guest') {
        const encrypted = encryptData(limited);
        await supabaseInstance.from('chat_histories').upsert({ user_id: currentUserId, persona_id: personaId, messages: encrypted, updated_at: new Date().toISOString() });
    }
};

export const fetchChatHistory = async (personaId: string): Promise<Message[] | null> => {
    const local = await VfsManager.loadItem(`history_${personaId}.json`);
    if (local) return local;
    if (supabaseInstance && currentUserId !== 'guest') {
        try {
            const { data } = await supabaseInstance.from('chat_histories').select('messages').eq('user_id', currentUserId).eq('persona_id', personaId).single();
            if (data?.messages) return decryptData(data.messages);
        } catch (e) {}
    }
    return null;
};

export const clearChatHistory = async (personaId: string) => {
    await VfsManager.deleteItem(`history_${personaId}.json`);
    if (supabaseInstance && currentUserId !== 'guest') {
        await supabaseInstance.from('chat_histories').delete().eq('user_id', currentUserId).eq('persona_id', personaId);
    }
};

// --- FORUM ---
export const fetchForumPosts = async (sort: 'latest' | 'trending'): Promise<ForumPost[]> => {
    if (!supabaseInstance) return [];
    try {
        let q = supabaseInstance.from('forum_posts').select('*');
        q = sort === 'latest' ? q.order('created_at', { ascending: false }) : q.order('likes', { ascending: false });
        const { data } = await q.limit(50);
        return data || [];
    } catch (e) { return []; }
};

export const createForumPost = async (post: any) => {
    if (!supabaseInstance) return false;
    const { error } = await supabaseInstance.from('forum_posts').insert(post);
    return !error;
};

export const updateForumPost = async (id: string, updates: any) => {
    if (!supabaseInstance) return false;
    const { error } = await supabaseInstance.from('forum_posts').update(updates).eq('id', id);
    return !error;
};

export const deleteForumPost = async (id: string) => {
    if (!supabaseInstance) return false;
    const { error } = await supabaseInstance.from('forum_posts').delete().eq('id', id);
    return !error;
};

export const updatePostCounters = async (id: string, counters: any) => {
    if (supabaseInstance) await supabaseInstance.from('forum_posts').update(counters).eq('id', id);
};

export const fetchComments = async (postId: string): Promise<ForumComment[]> => {
    if (!supabaseInstance) return [];
    try {
        const { data } = await supabaseInstance.from('forum_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
        return data || [];
    } catch (e) { return []; }
};

export const postComment = async (comment: any) => {
    if (!supabaseInstance) return false;
    const { error } = await supabaseInstance.from('forum_comments').insert(comment);
    return !error;
};

export const updateForumComment = async (id: string, content: string) => {
    if (!supabaseInstance) return false;
    const { error } = await supabaseInstance.from('forum_comments').update({ content }).eq('id', id);
    return !error;
};

export const deleteForumComment = async (id: string) => {
    if (!supabaseInstance) return false;
    const { error } = await supabaseInstance.from('forum_comments').delete().eq('id', id);
    return !error;
};

// --- VFS MANAGER ---
export const VfsManager = {
    saveItem: async (fileName: string, data: any) => {
        const fileId = `sys_file_${fileName}`;
        const encrypted = encryptData(data);
        const item: DriveItem = { id: fileId, parent_id: 'sys_root', name: fileName, type: 'code', size: encrypted.length, content: encrypted, created_at: Date.now(), updated_at: Date.now() };
        await idbPut(STORE_DRIVE, item);
        if (supabaseInstance && currentUserId !== 'guest') {
            await supabaseInstance.from('drive_items').upsert({ ...item, user_id: currentUserId }).catch(() => {});
        }
        return true;
    },
    loadItem: async (fileName: string): Promise<any | null> => {
        const fileId = `sys_file_${fileName}`;
        const target = await idbGet(STORE_DRIVE, fileId);
        let content = target?.content;
        if (!content && supabaseInstance && currentUserId !== 'guest') {
            try {
                const { data } = await supabaseInstance.from('drive_items').select('content').eq('id', fileId).eq('user_id', currentUserId).single();
                if (data) content = data.content;
            } catch (e) {}
        }
        return content ? decryptData(content) : null;
    },
    deleteItem: async (fileName: string) => {
        const fileId = `sys_file_${fileName}`;
        await idbDelete(STORE_DRIVE, fileId);
        if (supabaseInstance && currentUserId !== 'guest') {
            await supabaseInstance.from('drive_items').delete().eq('id', fileId).catch(() => {});
        }
    }
};

// --- DRIVE ---
export const fetchDriveItems = async (parentId: string | null): Promise<DriveItem[]> => {
    const localItems = await idbGetAll(STORE_DRIVE);
    const localFiltered = localItems.filter(i => i.parent_id === parentId && !i.id.startsWith('sys_file_'));
    if (supabaseInstance && currentUserId !== 'guest') {
        try {
            const { data } = await supabaseInstance.from('drive_items').select('*').eq('parent_id', parentId || null).eq('user_id', currentUserId);
            if (data) {
                const map = new Map();
                localFiltered.forEach(i => map.set(i.id, i));
                data.forEach(i => map.set(i.id, i));
                return Array.from(map.values());
            }
        } catch (e) {}
    }
    return localFiltered;
};

export const fetchDriveItemContent = async (itemId: string): Promise<string | null> => {
    const local = await idbGet(STORE_DRIVE, itemId);
    if (local?.content) return local.content;
    if (supabaseInstance && currentUserId !== 'guest') {
        try {
            const { data } = await supabaseInstance.from('drive_items').select('content').eq('id', itemId).single();
            return data?.content || null;
        } catch (e) { return null; }
    }
    return null;
};

export const saveDriveItem = async (item: DriveItem) => {
    await idbPut(STORE_DRIVE, item);
    if (supabaseInstance && currentUserId !== 'guest') {
        await supabaseInstance.from('drive_items').upsert({ ...item, user_id: currentUserId });
    }
    return true;
};

export const updateDriveItem = async (id: string, updates: any) => {
    const item = await idbGet(STORE_DRIVE, id);
    if (item) {
        const updated = { ...item, ...updates, updated_at: Date.now() };
        await idbPut(STORE_DRIVE, updated);
        if (supabaseInstance && currentUserId !== 'guest') {
            await supabaseInstance.from('drive_items').update({ ...updates, updated_at: Date.now() }).eq('id', id);
        }
    }
};

export const deleteDriveItem = async (id: string) => {
    const item = await idbGet(STORE_DRIVE, id);
    if (item?.content?.startsWith('http')) await deleteFromSupabaseStorage(item.content);
    await idbDelete(STORE_DRIVE, id);
    if (supabaseInstance && currentUserId !== 'guest') {
        await supabaseInstance.from('drive_items').delete().eq('id', id);
    }
};

export const findDriveItemByName = async (parentId: string | null, name: string): Promise<DriveItem | undefined> => {
    const items = await fetchDriveItems(parentId);
    return items.find(i => i.name === name);
};

export const fetchTopDonators = async (): Promise<Donator[]> => {
    if (!supabaseInstance) return [];
    try {
        const { data } = await supabaseInstance.from('donations').select('*').order('created_at', { ascending: false }).limit(10);
        return data || [];
    } catch (e) { return []; }
};

// Aliases
export const syncCustomPersonas = (personas: Persona[]) => VfsManager.saveItem('custom_personas.json', personas);
export const fetchCustomPersonas = () => VfsManager.loadItem('custom_personas.json');
export const deleteCustomPersona = async (personaId: string) => {
    const p = await fetchCustomPersonas() || [];
    await syncCustomPersonas(p.filter((x: Persona) => x.id !== personaId));
};
export const syncUserSettings = (s: any) => VfsManager.saveItem('settings.json', s);
export const fetchUserSettings = () => VfsManager.loadItem('settings.json');
export const checkSchemaHealth = async () => {
    if (!supabaseInstance) return 500;
    try {
        const { error } = await supabaseInstance.from('user_profiles').select('user_id').limit(1);
        return error ? 404 : 200;
    } catch { return 500; }
};
