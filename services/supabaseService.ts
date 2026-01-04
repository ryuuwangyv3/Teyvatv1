
import { createClient, SupabaseClient, RealtimeChannel, User } from '@supabase/supabase-js';
import { UserProfile, Persona, Message, ForumPost, ForumComment, SystemLog, GlobalStats, DriveItem, Donator, SupabaseConfig } from '../types';
import { encryptData, decryptData, SecureStorage } from './securityService';
import { getSystemCredentials } from './credentials';
import { INITIAL_USER_PROFILE } from '../constants';

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

// Helper to get current module-level userId
export const getSessionId = () => currentUserId;

/**
 * Mendapatkan konfigurasi Supabase dengan proteksi kredensial.
 */
export const getSupabaseConfig = (): SupabaseConfig | null => {
    const creds = getSystemCredentials();
    const local = SecureStorage.getItem('supabase_config');
    
    // Periksa apakah URL kredensial internal valid (bukan placeholder)
    if (creds.url && creds.url.startsWith('http') && !creds.url.includes('your-project')) {
        return { url: creds.url, key: creds.key, enabled: true };
    }
    
    if (local && local.url && local.url.startsWith('http')) {
        return local;
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
        console.error("Supabase connection fault:", e);
        supabaseInstance = null;
        return false;
    }
};

export const checkDbConnection = async (): Promise<number> => {
    const config = getSupabaseConfig();
    if (!config) return -1;
    
    if (!supabaseInstance) initSupabase();
    if (!supabaseInstance) return -1;

    const start = Date.now();
    try {
        // Cek tabel user_profiles sebagai indikator kesehatan schema
        const { error } = await supabaseInstance.from('user_profiles').select('user_id').limit(1);
        if (error) {
            // Error code 42P01 berarti tabel tidak ada (Schema missing)
            if (error.code === '42P01' || error.message.includes('not found')) return -2; 
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
    } catch (e) { return null; }
};

export const listenToAuthChanges = (callback: (user: User | null) => void) => {
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
    if (!supabaseInstance) {
        initSupabase();
    }
    if (!supabaseInstance) return { error: { message: "Akasha Cloud not configured." } };
    
    return await supabaseInstance.auth.signInWithOAuth({
        provider: 'google',
        options: { 
            redirectTo: window.location.origin,
            queryParams: {
                access_type: 'offline',
                prompt: 'select_account',
            }
        }
    });
};

export const signOut = async () => {
    if (!supabaseInstance) return;
    await supabaseInstance.auth.signOut();
    currentUserId = 'guest';
    localStorage.removeItem('has_seen_auth_v2');
    window.location.reload();
};

export const mapUserToProfile = (user: User): UserProfile => {
    return {
        id: user.id,
        username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Traveler',
        email: user.email,
        avatar: user.user_metadata?.avatar_url || INITIAL_USER_PROFILE.avatar,
        bio: "Connected via Akasha Celestial Network.",
        headerBackground: INITIAL_USER_PROFILE.headerBackground,
        isAuth: true
    };
};

// --- REAL-TIME SYNC ENGINE ---
export const syncUserProfile = async (profile: UserProfile) => {
    await VfsManager.saveItem('profile.json', profile);
    if (supabaseInstance && currentUserId !== 'guest') {
        const { error } = await supabaseInstance.from('user_profiles').upsert({
            user_id: currentUserId,
            username: profile.username, bio: profile.bio,
            avatar: profile.avatar, header_background: profile.headerBackground,
            email: profile.email
        });
        if (error) console.error("Profile sync failed:", error);
    }
};

export const fetchUserProfile = async (): Promise<UserProfile | null> => {
    if (supabaseInstance && currentUserId !== 'guest') {
        try {
            const { data } = await supabaseInstance.from('user_profiles').select('*').eq('user_id', currentUserId).single();
            if (data) {
                const p: UserProfile = { 
                    id: data.user_id,
                    username: data.username, bio: data.bio, avatar: data.avatar, 
                    headerBackground: data.header_background, email: data.email, isAuth: true 
                };
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
        await supabaseInstance.from('chat_histories').upsert({ 
            user_id: currentUserId, 
            persona_id: personaId, 
            messages: encrypted, 
            updated_at: new Date().toISOString() 
        }).catch(err => console.error("History sync error:", err));
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

export const syncUserSettings = async (settings: any) => {
    await VfsManager.saveItem('settings.json', settings);
    if (supabaseInstance && currentUserId !== 'guest') {
        await supabaseInstance.from('user_settings').upsert({
            user_id: currentUserId,
            data: settings,
            updated_at: new Date().toISOString()
        }).catch(err => console.error("Settings sync error:", err));
    }
};

export const fetchUserSettings = async (): Promise<any | null> => {
    if (supabaseInstance && currentUserId !== 'guest') {
        try {
            const { data } = await supabaseInstance.from('user_settings').select('data').eq('user_id', currentUserId).single();
            if (data?.data) {
                await VfsManager.saveItem('settings.json', data.data);
                return data.data;
            }
        } catch (e) {}
    }
    return await VfsManager.loadItem('settings.json');
};

export const subscribeToTable = (tableName: string, callback: (payload: any) => void): RealtimeChannel | null => {
    if (!supabaseInstance) return null;
    return supabaseInstance
        .channel(`public:${tableName}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, callback)
        .subscribe();
};

// --- LOGGING & STATS ---
export const logSystemEvent = async (message: string, type: 'info' | 'warn' | 'error' | 'success') => {
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
            await supabaseInstance.from('drive_items').delete().eq('id', fileId).eq('user_id', currentUserId).catch(() => {});
        }
    }
};

// --- DRIVE STORAGE METHODS ---
export const fetchDriveItems = async (parentId: string | null): Promise<DriveItem[]> => {
    if (supabaseInstance && currentUserId !== 'guest') {
        const { data } = await supabaseInstance.from('drive_items').select('*').eq('parent_id', parentId).eq('user_id', currentUserId);
        if (data) return data;
    }
    return []; 
};

export const fetchDriveItemContent = async (itemId: string): Promise<string | null> => {
    if (supabaseInstance && currentUserId !== 'guest') {
        const { data } = await supabaseInstance.from('drive_items').select('content').eq('id', itemId).single();
        return data?.content || null;
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
    if (supabaseInstance && currentUserId !== 'guest') {
        await supabaseInstance.from('drive_items').update({ ...updates, updated_at: Date.now() }).eq('id', id);
    }
};

export const deleteDriveItem = async (id: string) => {
    if (supabaseInstance && currentUserId !== 'guest') {
        await supabaseInstance.from('drive_items').delete().eq('id', id);
    }
};

export const findDriveItemByName = async (parentId: string | null, name: string): Promise<DriveItem | undefined> => {
    const items = await fetchDriveItems(parentId);
    return items.find(i => i.name === name);
};

export const uploadToSupabaseStorage = async (file: File | Blob, fileName: string): Promise<string | null> => {
    if (!supabaseInstance || currentUserId === 'guest') return null;
    const filePath = `${currentUserId}/${crypto.randomUUID()}_${fileName}`;
    const { error } = await supabaseInstance.storage.from('drive').upload(filePath, file);
    if (error) return null;
    const { data: urlData } = supabaseInstance.storage.from('drive').getPublicUrl(filePath);
    return urlData.publicUrl;
};

// --- FORUM & SOCIAL METHODS ---
export const fetchForumPosts = async (type: string = 'latest'): Promise<ForumPost[]> => {
    if (!supabaseInstance) return [];
    let query = supabaseInstance.from('forum_posts').select('*');
    if (type === 'trending') query = query.order('likes', { ascending: false });
    else query = query.order('created_at', { ascending: false });
    const { data } = await query;
    return data || [];
};

export const createForumPost = async (post: Partial<ForumPost>): Promise<boolean> => {
    if (!supabaseInstance) return false;
    const { error } = await supabaseInstance.from('forum_posts').insert({
        ...post,
        author_id: currentUserId === 'guest' ? null : currentUserId
    });
    return !error;
};

export const updateForumPost = async (id: string, updates: Partial<ForumPost>): Promise<boolean> => {
    if (!supabaseInstance) return false;
    const { error } = await supabaseInstance.from('forum_posts').update(updates).eq('id', id);
    return !error;
};

export const deleteForumPost = async (id: string): Promise<boolean> => {
    if (!supabaseInstance) return false;
    const { error } = await supabaseInstance.from('forum_posts').delete().eq('id', id);
    return !error;
};

export const updatePostCounters = async (id: string, counters: { likes: number, dislikes: number }): Promise<boolean> => {
    if (!supabaseInstance) return false;
    const { error } = await supabaseInstance.from('forum_posts').update(counters).eq('id', id);
    return !error;
};

export const fetchComments = async (postId: string): Promise<ForumComment[]> => {
    if (!supabaseInstance) return [];
    const { data } = await supabaseInstance.from('forum_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
    return data || [];
};

export const postComment = async (comment: Partial<ForumComment>): Promise<boolean> => {
    if (!supabaseInstance) return false;
    const { error } = await supabaseInstance.from('forum_comments').insert(comment);
    return !error;
};

export const updateForumComment = async (id: string, content: string): Promise<boolean> => {
    if (!supabaseInstance) return false;
    const { error } = await supabaseInstance.from('forum_comments').update({ content }).eq('id', id);
    return !error;
};

export const deleteForumComment = async (id: string): Promise<boolean> => {
    if (!supabaseInstance) return false;
    const { error } = await supabaseInstance.from('forum_comments').delete().eq('id', id);
    return !error;
};

export const fetchTopDonators = async (): Promise<Donator[]> => {
    if (!supabaseInstance) return [];
    const { data } = await supabaseInstance.from('donations').select('*').order('created_at', { ascending: false }).limit(10);
    return data || [];
};

export const checkSchemaHealth = async () => {
    if (!supabaseInstance) return 500;
    try {
        const { error } = await supabaseInstance.from('user_profiles').select('user_id').limit(1);
        return error ? 404 : 200;
    } catch { return 500; }
};
