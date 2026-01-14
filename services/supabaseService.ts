
import { createClient, SupabaseClient, RealtimeChannel, User } from '@supabase/supabase-js';
import { UserProfile, Message, DriveItem, SupabaseConfig } from '../types';
import { encryptData, decryptData, SecureStorage } from './securityService';
import { INITIAL_USER_PROFILE } from '../constants';

const isBrowser = typeof window !== 'undefined';

// --- ACTIVATED SUPABASE KREDENSIAL ---
const CLOUD_CONFIG = {
    URL: "https://nrnuuufpyhhwhiqmzgub.supabase.co",
    ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ybnV1dWZweWhod2hpcW16Z3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMjQ4MjEsImV4cCI6MjA4MTgwMDgyMX0.BBFIO9DXqFUrluCe_bs562JqZb_bh4Yknn1HKXgDhm4",
    PROJECT_REF: "nrnuuufpyhhwhiqmzgub"
};

let supabaseInstance: SupabaseClient | null = null;
let currentUserId = 'guest';

export const getSessionId = () => currentUserId;

export const initSupabase = (): boolean => {
  if (supabaseInstance) return true;
  
  const url = CLOUD_CONFIG.URL;
  const key = CLOUD_CONFIG.ANON_KEY;

  if (url && key) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
      console.log("%cCELESTIAL LINK: Resonating with Irminsul Database", "color: #d3bc8e; font-weight: bold;");
      return true;
    } catch (e) {
      console.error("Link failed:", e);
    }
  }
  return false;
};

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
    return await supabaseInstance!.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
};

export const signOut = async () => {
    if (!supabaseInstance) return;
    await supabaseInstance.auth.signOut();
    currentUserId = 'guest';
    SecureStorage.clear();
    window.location.reload();
};

export const getCurrentSession = async () => {
    if (!supabaseInstance) initSupabase();
    const { data } = await supabaseInstance!.auth.getSession();
    return data.session;
};

// --- USER MANAGEMENT ---

export const mapUserToProfile = (user: User): UserProfile => {
  return {
    id: user.id,
    username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Traveler',
    avatar: user.user_metadata?.avatar_url || INITIAL_USER_PROFILE.avatar,
    bio: INITIAL_USER_PROFILE.bio,
    headerBackground: INITIAL_USER_PROFILE.headerBackground,
    email: user.email,
    isAuth: true
  };
};

export const fetchUserStats = async (userId: string) => {
    if (!supabaseInstance) return { achievements: 0, companions: 12, visits: 1, aura: 0 };
    return { achievements: 5, companions: 12, visits: 42, aura: 100 };
};

// --- SYNC ENGINE ---

export const syncUserSettings = async (settings: any) => {
    if (supabaseInstance && currentUserId !== 'guest') {
        await supabaseInstance.from('user_settings').upsert({
            user_id: currentUserId,
            data: settings,
            updated_at: new Date().toISOString()
        });
    } else {
        SecureStorage.setItem('local_settings', settings);
    }
};

export const fetchUserSettings = async () => {
    if (supabaseInstance && currentUserId !== 'guest') {
        const { data } = await supabaseInstance.from('user_settings').select('data').eq('user_id', currentUserId).single();
        return data?.data || null;
    }
    return SecureStorage.getItem('local_settings');
};

export const syncUserProfile = async (profile: UserProfile) => {
    if (supabaseInstance && currentUserId !== 'guest') {
        await supabaseInstance.from('user_profiles').upsert({
            user_id: currentUserId,
            username: profile.username, bio: profile.bio,
            avatar: profile.avatar, header_background: profile.headerBackground,
            email: profile.email
        });
    } else {
        SecureStorage.setItem('local_profile', profile);
    }
};

export const fetchUserProfile = async (): Promise<UserProfile | null> => {
    if (supabaseInstance && currentUserId !== 'guest') {
        const { data } = await supabaseInstance.from('user_profiles').select('*').eq('user_id', currentUserId).single();
        if (data) return { id: data.user_id, username: data.username, bio: data.bio, avatar: data.avatar, headerBackground: data.header_background, email: data.email, isAuth: true };
    }
    return SecureStorage.getItem('local_profile');
};

export const syncChatHistory = async (personaId: string, messages: Message[]) => {
    const limitedHistory = messages.slice(-50);
    if (supabaseInstance && currentUserId !== 'guest') {
        const encrypted = encryptData(limitedHistory);
        await supabaseInstance.from('chat_histories').upsert({ user_id: currentUserId, persona_id: personaId, messages: encrypted });
    } else {
        SecureStorage.setItem(`chat_history_${personaId}`, limitedHistory);
    }
};

export const fetchChatHistory = async (personaId: string): Promise<Message[] | null> => {
    if (supabaseInstance && currentUserId !== 'guest') {
        const { data } = await supabaseInstance.from('chat_histories').select('messages').eq('user_id', currentUserId).eq('persona_id', personaId).single();
        if (data?.messages) return decryptData(data.messages);
    }
    return SecureStorage.getItem(`chat_history_${personaId}`);
};

export const clearChatHistory = async (personaId: string) => {
    if (supabaseInstance && currentUserId !== 'guest') {
        await supabaseInstance.from('chat_histories').delete().eq('user_id', currentUserId).eq('persona_id', personaId);
    } else {
        SecureStorage.removeItem(`chat_history_${personaId}`);
    }
};

export const checkDbConnection = async (): Promise<number> => {
    if (!supabaseInstance) initSupabase();
    if (!supabaseInstance) return -1;
    const start = Date.now();
    try {
        const { error } = await supabaseInstance.from('user_profiles').select('user_id').limit(1);
        if (error && error.code === '42P01') return -2;
        return Date.now() - start;
    } catch (e) { return -3; }
};

export const checkSchemaHealth = async (): Promise<number> => {
    return checkDbConnection();
};

export const subscribeToTable = (tableName: string, callback: (payload: any) => void) => {
    if (!supabaseInstance) return null;
    return supabaseInstance.channel(`public:${tableName}`).on('postgres_changes', { event: '*', schema: 'public', table: tableName }, callback).subscribe();
};

// --- FORUM ---

export const fetchForumPosts = async (type: string = 'latest') => {
    if (!supabaseInstance) return [];
    let q = supabaseInstance.from('forum_posts').select('*');
    if (type === 'trending') q = q.order('likes', { ascending: false });
    else q = q.order('created_at', { ascending: false });
    const { data } = await q;
    return data || [];
};

export const createForumPost = async (post: any) => {
    if (!supabaseInstance) return false;
    const { error } = await supabaseInstance.from('forum_posts').insert({
        ...post,
        author_id: currentUserId !== 'guest' ? currentUserId : null
    });
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

export const updatePostCounters = async (id: string, counters: { likes: number, dislikes: number }) => {
    if (!supabaseInstance) return false;
    const { error } = await supabaseInstance.from('forum_posts').update(counters).eq('id', id);
    return !error;
};

export const fetchComments = async (postId: string) => {
    if (!supabaseInstance) return [];
    const { data } = await supabaseInstance.from('forum_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
    return data || [];
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

// --- SYSTEM ---

export const logSystemEvent = async (message: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    if (supabaseInstance) {
        await supabaseInstance.from('system_logs').insert({ message, type });
    }
};

export const fetchSystemLogs = async () => {
    if (!supabaseInstance) return [];
    const { data } = await supabaseInstance.from('system_logs').select('*').order('created_at', { ascending: false }).limit(50);
    return data || [];
};

export const fetchGlobalStats = async () => {
    if (!supabaseInstance) return { total_users: 0, total_posts: 0, active_personas: 12 };
    const { count: u } = await supabaseInstance.from('user_profiles').select('*', { count: 'exact', head: true });
    const { count: p } = await supabaseInstance.from('forum_posts').select('*', { count: 'exact', head: true });
    return { total_users: u || 0, total_posts: p || 0, active_personas: 12 };
};

export const fetchTopDonators = async () => {
    if (!supabaseInstance) return [];
    const { data } = await supabaseInstance.from('donations').select('*').order('created_at', { ascending: false }).limit(10);
    return data || [];
};

// --- STORAGE ---

export const fetchDriveItems = async (parentId: string | null) => {
    if (!supabaseInstance || currentUserId === 'guest') return [];
    let q = supabaseInstance.from('drive_items').select('*').eq('user_id', currentUserId);
    if (parentId === null) q = q.is('parent_id', null);
    else q = q.eq('parent_id', parentId);
    const { data } = await q;
    return data || [];
};

export const fetchDriveItemContent = async (itemId: string) => {
    if (!supabaseInstance || currentUserId === 'guest') return null;
    const { data } = await supabaseInstance.from('drive_items').select('content').eq('id', itemId).single();
    return data?.content || null;
};

export const saveDriveItem = async (item: DriveItem) => {
    if (!supabaseInstance || currentUserId === 'guest') return false;
    const { error } = await supabaseInstance.from('drive_items').upsert({
        ...item,
        user_id: currentUserId
    });
    return !error;
};

export const deleteDriveItem = async (itemId: string) => {
    if (!supabaseInstance || currentUserId === 'guest') return false;
    const { error } = await supabaseInstance.from('drive_items').delete().eq('id', itemId);
    return !error;
};

export const findDriveItemByName = async (parentId: string | null, name: string) => {
    if (!supabaseInstance || currentUserId === 'guest') return null;
    let q = supabaseInstance.from('drive_items').select('*').eq('user_id', currentUserId).eq('name', name);
    if (parentId === null) q = q.is('parent_id', null);
    else q = q.eq('parent_id', parentId);
    const { data } = await q.single();
    return data || null;
};

export const updateDriveItem = async (itemId: string, updates: Partial<DriveItem>) => {
    if (!supabaseInstance || currentUserId === 'guest') return false;
    const { error } = await supabaseInstance.from('drive_items').update(updates).eq('id', itemId);
    return !error;
};

export const uploadToSupabaseStorage = async (file: File | Blob, fileName: string): Promise<string | null> => {
  if (!supabaseInstance || currentUserId === 'guest') return null;
  const path = `${currentUserId}/${Date.now()}_${fileName}`;
  const { error } = await supabaseInstance.storage.from('drive').upload(path, file);
  if (error) return null;
  return supabaseInstance.storage.from('drive').getPublicUrl(path).data.publicUrl;
};

export const getSupabaseConfig = () => ({ url: CLOUD_CONFIG.URL, key: CLOUD_CONFIG.ANON_KEY });
export const updateSupabaseCredentials = (u: string, k: string) => true; 
