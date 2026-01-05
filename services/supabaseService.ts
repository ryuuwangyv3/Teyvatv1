
import { createClient, SupabaseClient, RealtimeChannel, User } from '@supabase/supabase-js';
import {
  UserProfile, Persona, Message, ForumPost, ForumComment,
  SystemLog, GlobalStats, DriveItem, Donator, SupabaseConfig
} from '../types';
import { encryptData, decryptData, SecureStorage } from './securityService';
import { getSystemCredentials } from './credentials';
import { INITIAL_USER_PROFILE } from '../constants';

/* ============================================================================
   ENV & RUNTIME GUARDS
============================================================================ */
const isBrowser = typeof window !== 'undefined';
const safeUUID = () =>
  (crypto as any)?.randomUUID?.() || `${Date.now()}_${Math.random()}`;

/* ============================================================================
   INDEXED DB (BROWSER ONLY)
============================================================================ */
const DB_NAME = "Akasha_VFS_DB";
const STORE_DRIVE = "drive_items";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (!isBrowser) throw new Error("IndexedDB unavailable (SSR)");
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_DRIVE)) {
        db.createObjectStore(STORE_DRIVE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
};

/* ============================================================================
   SUPABASE SINGLETON
============================================================================ */
let supabaseInstance: SupabaseClient | null = null;
let currentUserId = 'guest';

export const getSessionId = () => currentUserId;

export const getSupabaseConfig = (): SupabaseConfig | null => {
  const creds = getSystemCredentials();
  const local = SecureStorage.getItem('supabase_config');

  if (creds.url?.startsWith('http')) {
    return { url: creds.url, key: creds.key, enabled: true };
  }
  if (local?.url?.startsWith('http')) return local;
  return null;
};

export const updateSupabaseCredentials = (url: string, key: string) => {
    SecureStorage.setItem('supabase_config', { url, key, enabled: true });
    supabaseInstance = null; // Force re-init
    return initSupabase();
};

export const initSupabase = (): boolean => {
  if (supabaseInstance) return true;

  const config = getSupabaseConfig();
  if (!config) return false;

  try {
    supabaseInstance = createClient(config.url, config.key, {
      auth: { persistSession: true, autoRefreshToken: true }
    });

    supabaseInstance.auth.getSession().then(({ data }) => {
      if (data.session?.user) currentUserId = data.session.user.id;
    });
    return true;
  } catch (e) {
    console.error("Supabase init failed", e);
    return false;
  }
};

/* ============================================================================
   AUTH
============================================================================ */
export const listenToAuthChanges = (cb: (u: User | null) => void) => {
  if (!supabaseInstance) initSupabase();
  if (!supabaseInstance) return { subscription: { unsubscribe: () => {} } };

  const { data } = supabaseInstance.auth.onAuthStateChange((_e, s) => {
    currentUserId = s?.user?.id || 'guest';
    cb(s?.user || null);
  });

  return data;
};

export const signInWithGoogle = async () => {
    if (!supabaseInstance) initSupabase();
    if (!supabaseInstance) return { error: { message: "Cloud resonance unconfigured." } };
    return await supabaseInstance.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
};

export const signOut = async () => {
    if (!supabaseInstance) return;
    await supabaseInstance.auth.signOut();
    currentUserId = 'guest';
    localStorage.removeItem('has_seen_auth_v2');
    window.location.reload();
};

export const getCurrentSession = async () => {
    if (!supabaseInstance) initSupabase();
    if (!supabaseInstance) return null;
    const { data } = await supabaseInstance.auth.getSession();
    return data.session;
};

/* ============================================================================
   REAL-TIME SYNC ENGINE
============================================================================ */
export const syncUserProfile = async (profile: UserProfile) => {
    await VfsManager.saveItem('profile.json', profile);
    if (supabaseInstance && currentUserId !== 'guest') {
        try {
            await supabaseInstance.from('user_profiles').upsert({
                user_id: currentUserId,
                username: profile.username, bio: profile.bio,
                avatar: profile.avatar, header_background: profile.headerBackground,
                email: profile.email
            });
        } catch (e) {}
    }
};

export const fetchUserProfile = async (): Promise<UserProfile | null> => {
    if (supabaseInstance && currentUserId !== 'guest') {
        try {
            const { data } = await supabaseInstance.from('user_profiles').select('*').eq('user_id', currentUserId).single();
            if (data) {
                const p: UserProfile = { 
                    id: data.user_id, username: data.username, bio: data.bio, avatar: data.avatar, 
                    headerBackground: data.header_background, email: data.email, isAuth: true 
                };
                await VfsManager.saveItem('profile.json', p);
                return p;
            }
        } catch (e) {}
    }
    return await VfsManager.loadItem('profile.json');
};

export const syncUserSettings = async (settings: any) => {
    await VfsManager.saveItem('settings.json', settings);
    if (supabaseInstance && currentUserId !== 'guest') {
        try {
            await supabaseInstance.from('user_settings').upsert({
                user_id: currentUserId,
                data: settings,
                updated_at: new Date().toISOString()
            });
        } catch (err) {}
    }
};

export const fetchUserSettings = async (): Promise<any | null> => {
    if (supabaseInstance && currentUserId !== 'guest') {
        try {
            const { data } = await supabaseInstance.from('user_settings').select('data').eq('user_id', currentUserId).single();
            if (data?.data) return data.data;
        } catch (e) {}
    }
    return await VfsManager.loadItem('settings.json');
};

export const syncChatHistory = async (personaId: string, messages: Message[]) => {
    const limited = messages.slice(-50);
    await VfsManager.saveItem(`history_${personaId}.json`, limited);
    if (supabaseInstance && currentUserId !== 'guest') {
        try {
            const encrypted = encryptData(limited);
            await supabaseInstance.from('chat_histories').upsert({ 
                user_id: currentUserId, 
                persona_id: personaId, 
                messages: encrypted, 
                updated_at: new Date().toISOString() 
            });
        } catch (err) {}
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
        try {
            await supabaseInstance.from('chat_histories').delete().eq('user_id', currentUserId).eq('persona_id', personaId);
        } catch (e) {}
    }
};

/* ============================================================================
   VFS MANAGER (ENCRYPTED)
============================================================================ */
export const VfsManager = {
  async saveItem(fileName: string, data: any) {
    if (!isBrowser) return false;
    const encrypted = encryptData(data);
    const item: DriveItem = {
      id: `sys_${fileName}`,
      parent_id: 'sys_root',
      name: fileName,
      type: 'code',
      size: encrypted.length,
      content: encrypted,
      created_at: Date.now(),
      updated_at: Date.now()
    };
    await (await openDB())
      .transaction(STORE_DRIVE, 'readwrite')
      .objectStore(STORE_DRIVE)
      .put(item);

    if (supabaseInstance && currentUserId !== 'guest') {
      await supabaseInstance.from('drive_items')
        .upsert({ ...item, user_id: currentUserId });
    }
    return true;
  },

  async loadItem(fileName: string) {
    if (!isBrowser) return null;
    const db = await openDB();
    const item = await new Promise<any>(r => {
      const tx = db.transaction(STORE_DRIVE, 'readonly');
      const store = tx.objectStore(STORE_DRIVE);
      const req = store.get(`sys_${fileName}`);
      req.onsuccess = () => r(req.result);
      req.onerror = () => r(null);
    });
    return item?.content ? decryptData(item.content) : null;
  },
  
  async deleteItem(fileName: string) {
    if (!isBrowser) return;
    const fileId = `sys_${fileName}`;
    const db = await openDB();
    await db.transaction(STORE_DRIVE, 'readwrite').objectStore(STORE_DRIVE).delete(fileId);
    if (supabaseInstance && currentUserId !== 'guest') {
        await supabaseInstance.from('drive_items').delete().eq('id', fileId).eq('user_id', currentUserId);
    }
  }
};

/* ============================================================================
   MISC CLOUD METHODS
============================================================================ */
export const uploadToSupabaseStorage = async (file: File | Blob, fileName: string): Promise<string | null> => {
  if (!supabaseInstance || currentUserId === 'guest') return null;
  const path = `${currentUserId}/${safeUUID()}_${fileName}`;
  const { error } = await supabaseInstance.storage.from('drive').upload(path, file);
  if (error) return null;
  return supabaseInstance.storage.from('drive').getPublicUrl(path).data.publicUrl;
};

export const checkDbConnection = async (): Promise<number> => {
    if (!supabaseInstance) initSupabase();
    if (!supabaseInstance) return -1;
    const start = Date.now();
    try {
        const { error } = await supabaseInstance.from('user_profiles').select('user_id').limit(1);
        if (error) {
            if (error.code === '42P01') return -2; // Table not found
            return -3;
        }
        return Date.now() - start;
    } catch (e) { return -3; }
};

export const checkSchemaHealth = async () => {
    return await checkDbConnection() === -2 ? 404 : 200;
};

export const logSystemEvent = async (message: string, type: 'info' | 'warn' | 'error' | 'success') => {
    if (supabaseInstance) await supabaseInstance.from('system_logs').insert({ message, type });
};

export const subscribeToTable = (tableName: string, callback: (payload: any) => void): RealtimeChannel | null => {
    if (!supabaseInstance) return null;
    return supabaseInstance.channel(`public:${tableName}`).on('postgres_changes', { event: '*', schema: 'public', table: tableName }, callback).subscribe();
};

export const fetchSystemLogs = async (): Promise<SystemLog[]> => {
    if (!supabaseInstance) return [];
    const { data } = await supabaseInstance.from('system_logs').order('created_at', { ascending: false }).limit(50);
    return data || [];
};

export const fetchGlobalStats = async (): Promise<GlobalStats> => {
    if (!supabaseInstance) return { total_users: 0, total_posts: 0, active_personas: 12 };
    const { count: u } = await supabaseInstance.from('user_profiles').select('*', { count: 'exact', head: true });
    const { count: p } = await supabaseInstance.from('forum_posts').select('*', { count: 'exact', head: true });
    return { total_users: u || 0, total_posts: p || 0, active_personas: 12 };
};

export const fetchTopDonators = async (): Promise<Donator[]> => {
    if (!supabaseInstance) return [];
    const { data } = await supabaseInstance.from('donations').select('*').order('created_at', { ascending: false }).limit(10);
    return data || [];
};

export const fetchDriveItems = async (parentId: string | null): Promise<DriveItem[]> => {
    if (supabaseInstance && currentUserId !== 'guest') {
        const { data } = await supabaseInstance.from('drive_items').select('*').eq('parent_id', parentId).eq('user_id', currentUserId);
        return data || [];
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
    if (supabaseInstance && currentUserId !== 'guest') {
        await supabaseInstance.from('drive_items').upsert({ ...item, user_id: currentUserId });
    }
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

export const mapUserToProfile = (user: User): UserProfile => ({
    id: user.id,
    username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Traveler',
    email: user.email,
    avatar: user.user_metadata?.avatar_url || INITIAL_USER_PROFILE.avatar,
    bio: "Synchronized with Akasha Cloud Resonance.",
    headerBackground: INITIAL_USER_PROFILE.headerBackground,
    isAuth: true
});

export const fetchForumPosts = async (type: string = 'latest'): Promise<ForumPost[]> => {
    if (!supabaseInstance) return [];
    let q = supabaseInstance.from('forum_posts').select('*');
    if (type === 'trending') q = q.order('likes', { ascending: false });
    else q = q.order('created_at', { ascending: false });
    const { data } = await q;
    return data || [];
};

export const createForumPost = async (post: Partial<ForumPost>): Promise<boolean> => {
    if (!supabaseInstance) return false;
    const { error } = await supabaseInstance.from('forum_posts').insert({ ...post, author_id: currentUserId === 'guest' ? null : currentUserId });
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
