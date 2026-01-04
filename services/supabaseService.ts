
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

export const getSupabaseConfig = (): SupabaseConfig | null => {
    const creds = getSystemCredentials();
    const local = SecureStorage.getItem('supabase_config');
    if (local && local.url && local.key) return local;
    if (creds.url && creds.key) return { url: creds.url, key: creds.key, enabled: true };
    return null;
};

export const updateSupabaseCredentials = (url: string, key: string) => {
    SecureStorage.setItem('supabase_config', { url, key, enabled: true });
    return initSupabase();
};

export const initSupabase = (): boolean => {
    const config = getSupabaseConfig();
    
    // CRITICAL FIX: Validate URL to prevent "Failed to construct 'URL'" error
    if (!config || !config.url || !config.url.startsWith('http') || !config.key) {
        console.warn("Supabase Config incomplete. Cloud sync suspended.");
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
            if (data.session?.user) {
                currentUserId = data.session.user.id;
            }
        });
        return true;
    } catch (e) {
        console.error("Supabase init failed:", e);
        return false;
    }
};

export const getCurrentSession = async () => {
    if (!supabaseInstance) return null;
    const { data } = await supabaseInstance.auth.getSession();
    if (data.session?.user) currentUserId = data.session.user.id;
    return data.session;
};

export const listenToAuthChanges = (callback: (user: any | null) => void) => {
    if (!supabaseInstance) return { subscription: { unsubscribe: () => {} } };
    
    const { data } = supabaseInstance.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.user) {
                currentUserId = session.user.id;
                callback(session.user);
            }
        } else if (event === 'SIGNED_OUT') {
            currentUserId = 'guest';
            callback(null);
        }
    });
    return data;
};

export const signInWithGoogle = async () => {
    if (!supabaseInstance) return { error: { message: "Supabase not connected" } };
    const { data, error } = await supabaseInstance.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        }
    });
    return { data, error };
};

export const signOut = async () => {
    if (!supabaseInstance) return;
    await supabaseInstance.auth.signOut();
};

export const checkSchemaHealth = async () => {
    if (!supabaseInstance) return 500;
    const { error } = await supabaseInstance.from('user_profiles').select('user_id').limit(1);
    if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
        return 404;
    }
    return 200;
};

export const checkDbConnection = async (): Promise<number> => {
    if (!supabaseInstance) return -1;
    const start = Date.now();
    const { error } = await supabaseInstance.from('system_logs').select('id').limit(1);
    if (error && error.code === '42P01') return -2; 
    if (error) return -1;
    return Date.now() - start;
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
    const { data } = await supabaseInstance.from('system_logs').select('*').order('created_at', { ascending: false }).limit(50);
    return data || [];
};

export const fetchGlobalStats = async (): Promise<GlobalStats> => {
    if (!supabaseInstance) return { total_users: 0, total_posts: 0, active_personas: 12 };
    const { count: users } = await supabaseInstance.from('user_profiles').select('*', { count: 'exact', head: true });
    const { count: posts } = await supabaseInstance.from('forum_posts').select('*', { count: 'exact', head: true });
    return {
        total_users: users || 0,
        total_posts: posts || 0,
        active_personas: 12
    };
};

// --- STORAGE PROTOCOL ---
const BUCKET_NAME = getSystemCredentials().s3.bucket || 'drive';

export const uploadToSupabaseStorage = async (file: File | Blob, fileName: string): Promise<string | null> => {
    if (!supabaseInstance || currentUserId === 'guest') return null;
    
    const fileExt = fileName.split('.').pop();
    const filePath = `${currentUserId}/${crypto.randomUUID()}.${fileExt}`;

    const { data, error } = await supabaseInstance.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (error) {
        console.error("Akasha Storage Error:", error.message);
        return null;
    }
    
    const { data: urlData } = supabaseInstance.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    return urlData.publicUrl;
};

export const deleteFromSupabaseStorage = async (publicUrl: string) => {
    if (!supabaseInstance || currentUserId === 'guest' || !publicUrl.includes(BUCKET_NAME)) return;
    const parts = publicUrl.split(`${BUCKET_NAME}/`);
    if (parts.length < 2) return;
    const filePath = parts[1];
    await supabaseInstance.storage.from(BUCKET_NAME).remove([filePath]);
};

// --- PROFILE SYNC ---
export const syncUserProfile = async (profile: UserProfile) => {
    // AES-encrypted local storage
    await VfsManager.saveItem('profile.json', profile);

    if (supabaseInstance && currentUserId !== 'guest') {
        const { error } = await supabaseInstance.from('user_profiles').upsert({
            user_id: currentUserId,
            username: profile.username,
            bio: profile.bio,
            avatar: profile.avatar,
            header_background: profile.headerBackground,
            email: profile.email
        });
        if (error) console.error("Profile Sync Error", error);
    }
};

export const fetchUserProfile = async (): Promise<UserProfile | null> => {
    try {
        if (supabaseInstance && currentUserId !== 'guest') {
            const { data } = await supabaseInstance.from('user_profiles').select('*').eq('user_id', currentUserId).single();
            if (data) {
                const profile: UserProfile = {
                    username: data.username,
                    bio: data.bio,
                    avatar: data.avatar,
                    headerBackground: data.header_background,
                    email: data.email,
                    isAuth: true
                };
                await VfsManager.saveItem('profile.json', profile);
                return profile;
            }
        }
        return await VfsManager.loadItem('profile.json');
    } catch (e) { return null; }
};

// --- CHAT HISTORY ---
export const syncChatHistory = async (personaId: string, messages: Message[]) => {
    try {
        const limitedMessages = messages.slice(-50);
        await VfsManager.saveItem(`history_${personaId}.json`, limitedMessages);

        if (supabaseInstance && currentUserId !== 'guest') {
            const encrypted = encryptData(limitedMessages);
            await supabaseInstance.from('chat_histories').upsert({
                user_id: currentUserId,
                persona_id: personaId,
                messages: encrypted,
                updated_at: new Date().toISOString()
            }).catch(e => console.error("Cloud Chat Sync Failed", e));
        }
        return true;
    } catch (e) {
        return false;
    }
};

export const fetchChatHistory = async (personaId: string): Promise<Message[] | null> => {
    try {
        const local = await VfsManager.loadItem(`history_${personaId}.json`);
        if (local) return local;

        if (supabaseInstance && currentUserId !== 'guest') {
            const { data } = await supabaseInstance
                .from('chat_histories')
                .select('messages')
                .eq('user_id', currentUserId)
                .eq('persona_id', personaId)
                .single();

            if (data && data.messages) {
                const decrypted = decryptData(data.messages);
                if (decrypted) {
                    await VfsManager.saveItem(`history_${personaId}.json`, decrypted);
                    return decrypted;
                }
            }
        }
        return null;
    } catch (e) { return null; }
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
    let query = supabaseInstance.from('forum_posts').select('*');
    if (sort === 'latest') {
        query = query.order('created_at', { ascending: false });
    } else {
        query = query.order('likes', { ascending: false });
    }
    const { data } = await query.limit(50);
    return data || [];
};

export const createForumPost = async (post: Omit<ForumPost, 'id' | 'created_at' | 'updated_at'>) => {
    if (!supabaseInstance) return false;
    const { error } = await supabaseInstance.from('forum_posts').insert(post);
    return !error;
};

export const updateForumPost = async (id: string, updates: Partial<ForumPost>) => {
    if (!supabaseInstance) return false;
    const { error } = await supabaseInstance.from('forum_posts').update(updates).eq('id', id);
    return !error;
};

export const deleteForumPost = async (id: string) => {
    if (!supabaseInstance) return false;
    const { error } = await supabaseInstance.from('forum_posts').delete().eq('id', id);
    return !error;
};

export const updatePostCounters = async (id: string, counters: { likes: number, dislikes: number }) => {
    if (!supabaseInstance) return;
    await supabaseInstance.from('forum_posts').update(counters).eq('id', id);
};

export const fetchComments = async (postId: string): Promise<ForumComment[]> => {
    if (!supabaseInstance) return [];
    const { data } = await supabaseInstance.from('forum_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
    return data || [];
};

export const postComment = async (comment: Omit<ForumComment, 'id' | 'created_at'>) => {
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

// --- VFS MANAGER (DRIVE) ---
// Secure VFS with AES encryption at rest
export const VfsManager = {
    saveItem: async (fileName: string, data: any) => {
        try {
            const fileId = `sys_file_${fileName}`;
            const folderId = 'sys_root';
            const encryptedContent = encryptData(data); 

            const item: DriveItem = {
                id: fileId,
                parent_id: folderId,
                name: fileName,
                type: 'code',
                size: encryptedContent.length,
                content: encryptedContent,
                created_at: Date.now(),
                updated_at: Date.now()
            };

            await idbPut(STORE_DRIVE, item);

            if (supabaseInstance && currentUserId !== 'guest') {
                await supabaseInstance.from('drive_items').upsert({ ...item, user_id: currentUserId }).catch(() => {});
            }
            return true;
        } catch (e) {
            return false;
        }
    },

    loadItem: async (fileName: string): Promise<any | null> => {
        try {
            const fileId = `sys_file_${fileName}`;
            const target = await idbGet(STORE_DRIVE, fileId);
            let content: string | undefined = target?.content;

            if (!content && supabaseInstance && currentUserId !== 'guest') {
                 const { data } = await supabaseInstance.from('drive_items').select('content').eq('id', fileId).eq('user_id', currentUserId).single();
                 if (data) content = data.content;
            }

            if (!content) return null;
            return decryptData(content);
        } catch (e) { return null; }
    },

    deleteItem: async (fileName: string) => {
        const fileId = `sys_file_${fileName}`;
        await idbDelete(STORE_DRIVE, fileId);
        if (supabaseInstance && currentUserId !== 'guest') {
            await supabaseInstance.from('drive_items').delete().eq('id', fileId).catch(() => {});
        }
    }
};

// Aliases
export const syncCustomPersonas = (personas: Persona[]) => VfsManager.saveItem('custom_personas.json', personas);
export const fetchCustomPersonas = () => VfsManager.loadItem('custom_personas.json');
export const deleteCustomPersona = async (personaId: string) => {
    const personas = await fetchCustomPersonas() || [];
    const filtered = personas.filter((p: Persona) => p.id !== personaId);
    await syncCustomPersonas(filtered);
};

export const syncUserSettings = (settings: any) => VfsManager.saveItem('settings.json', settings);
export const fetchUserSettings = () => VfsManager.loadItem('settings.json');
export const saveToSystemDrive = VfsManager.saveItem;
export const loadFromSystemDrive = VfsManager.loadItem;

// --- DRIVE (USER FILES) ---
export const fetchDriveItems = async (parentId: string | null): Promise<DriveItem[]> => {
    const localItems = await idbGetAll(STORE_DRIVE);
    const localFiltered = localItems.filter(i => i.parent_id === parentId && !i.id.startsWith('sys_file_'));

    if (supabaseInstance && currentUserId !== 'guest') {
        const { data } = await supabaseInstance.from('drive_items').select('*').eq('parent_id', parentId || null).eq('user_id', currentUserId);
        if (data) {
             const map = new Map();
             localFiltered.forEach(i => map.set(i.id, i));
             data.forEach(i => map.set(i.id, i));
             return Array.from(map.values());
        }
    }
    return localFiltered;
};

export const fetchDriveItemContent = async (itemId: string): Promise<string | null> => {
    const localItem = await idbGet(STORE_DRIVE, itemId);
    if (localItem && localItem.content) return localItem.content;
    if (supabaseInstance && currentUserId !== 'guest') {
        const { data } = await supabaseInstance.from('drive_items').select('content').eq('id', itemId).single();
        if (data) return data.content;
    }
    return null;
};

export const saveDriveItem = async (item: DriveItem) => {
    try {
        await idbPut(STORE_DRIVE, item);
        if (supabaseInstance && currentUserId !== 'guest') {
            await supabaseInstance.from('drive_items').upsert({ ...item, user_id: currentUserId });
        }
        return true;
    } catch (e) {
        return false;
    }
};

export const updateDriveItem = async (id: string, updates: Partial<DriveItem>) => {
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
    if (item?.content?.startsWith('http')) {
        await deleteFromSupabaseStorage(item.content);
    }
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
    const { data } = await supabaseInstance.from('donations').select('*').order('created_at', { ascending: false }).limit(10);
    return data || [];
};
