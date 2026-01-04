
import { GitHubConfig, DriveItem, FileType } from '../types';
import { saveDriveItem, fetchDriveItems, findDriveItemByName, logSystemEvent } from './supabaseService';

/**
 * Celestial Bridge Service
 * Integrates GitHub Repositories directly with Irminsul Drive (VFS)
 */

interface GitHubTreeItem {
    path: string;
    mode: string;
    type: 'blob' | 'tree';
    sha: string;
    size?: number;
    url: string;
}

const getMimeType = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
        'js': 'application/javascript',
        'ts': 'application/typescript',
        'html': 'text/html',
        'css': 'text/css',
        'json': 'application/json',
        'md': 'text/markdown',
        'txt': 'text/plain',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'svg': 'image/svg+xml',
        'gif': 'image/gif'
    };
    return map[ext || ''] || 'text/plain';
};

const getFileType = (fileName: string): FileType => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (['js', 'ts', 'py', 'json', 'c', 'cpp', 'html', 'css'].includes(ext || '')) return 'code';
    if (['md', 'txt'].includes(ext || '')) return 'text';
    if (['mp3', 'wav', 'ogg'].includes(ext || '')) return 'audio';
    if (['mp4', 'webm', 'mov'].includes(ext || '')) return 'video';
    return 'binary';
};

export const syncGithubRepo = async (config: GitHubConfig): Promise<{ success: boolean; synced: number; errors: number }> => {
    if (!config.owner || !config.repo) return { success: false, synced: 0, errors: 0 };

    const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json'
    };
    if (config.token) headers['Authorization'] = `token ${config.token}`;

    try {
        await logSystemEvent(`Initiating sync with GitHub: ${config.owner}/${config.repo}`, 'info');

        // 1. Fetch recursive tree
        const treeUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/git/trees/${config.branch || 'main'}?recursive=1`;
        const treeResponse = await fetch(treeUrl, { headers });
        
        if (!treeResponse.ok) throw new Error(`GitHub API Error: ${treeResponse.statusText}`);
        
        const treeData = await treeResponse.json();
        const tree: GitHubTreeItem[] = treeData.tree;

        // 2. Map of existing VFS items to detect changes via SHA
        const currentVfsItems = await fetchDriveItems(null); 
        const vfsMap = new Map<string, DriveItem>();
        // Note: For deep sync we'd need to fetch all folders recursively, but for simplicity 
        // we'll handle creation of missing structures.

        let syncedCount = 0;
        let errorCount = 0;

        // Process Tree (Folders first, then Files)
        const folders = tree.filter(i => i.type === 'tree');
        const blobs = tree.filter(i => i.type === 'blob');

        // Mapping folder paths to VFS IDs
        const folderPathToId = new Map<string, string | null>();
        folderPathToId.set('', null);

        // A. Ensure Folders Exist
        for (const f of folders) {
            const pathParts = f.path.split('/');
            const name = pathParts.pop() || '';
            const parentPath = pathParts.join('/');
            const parentId = folderPathToId.get(parentPath) || null;

            // Check if exists
            const existingItems = await fetchDriveItems(parentId);
            const found = existingItems.find(item => item.name === name && item.type === 'folder');
            
            if (found) {
                folderPathToId.set(f.path, found.id);
            } else {
                const newId = crypto.randomUUID();
                await saveDriveItem({
                    id: newId,
                    parent_id: parentId,
                    name,
                    type: 'folder',
                    size: 0,
                    created_at: Date.now(),
                    updated_at: Date.now()
                });
                folderPathToId.set(f.path, newId);
            }
        }

        // B. Sync Blobs (Files)
        for (const b of blobs) {
            const pathParts = b.path.split('/');
            const name = pathParts.pop() || '';
            const parentPath = pathParts.join('/');
            const parentId = folderPathToId.get(parentPath) || null;

            const existingItems = await fetchDriveItems(parentId);
            const found = existingItems.find(item => item.name === name && item.type !== 'folder');

            // Skip if SHA is same
            if (found && found.github_sha === b.sha) continue;

            try {
                // Fetch blob content
                const blobUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/git/blobs/${b.sha}`;
                const blobResponse = await fetch(blobUrl, { headers });
                const blobData = await blobResponse.json();
                
                let content = "";
                const type = getFileType(name);
                const mime = getMimeType(name);

                if (blobData.encoding === 'base64') {
                    if (['code', 'text'].includes(type)) {
                        content = decodeURIComponent(escape(atob(blobData.content)));
                        // Wrap back to base64 for unified VFS storage
                        content = `data:${mime};base64,${btoa(unescape(encodeURIComponent(content)))}`;
                    } else {
                        content = `data:${mime};base64,${blobData.content}`;
                    }
                }

                await saveDriveItem({
                    id: found?.id || crypto.randomUUID(),
                    parent_id: parentId,
                    name,
                    type,
                    size: b.size || 0,
                    mime_type: mime,
                    content,
                    created_at: found?.created_at || Date.now(),
                    updated_at: Date.now(),
                    github_sha: b.sha
                });
                
                syncedCount++;
            } catch (err) {
                console.error(`Sync error for ${b.path}:`, err);
                errorCount++;
            }
        }

        if (syncedCount > 0) {
            await logSystemEvent(`GitHub Sync Complete. Synced ${syncedCount} items.`, 'success');
        }

        return { success: true, synced: syncedCount, errors: errorCount };

    } catch (err: any) {
        await logSystemEvent(`GitHub Sync Failed: ${err.message}`, 'error');
        return { success: false, synced: 0, errors: 0 };
    }
};
