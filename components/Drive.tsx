
import React, { useState, useEffect, useRef } from 'react';
import { 
  HardDrive, Folder, File, FolderPlus, Upload, Grid, List, 
  ChevronRight, MoreVertical, Download, Trash2, Eye, FileText, Image, Code, Music, Film, Loader2, Home, X, Link, Play,
  FilePlus, Edit, ArrowRight, CornerUpLeft, Check, Copy, ExternalLink, RefreshCw, Save
} from 'lucide-react';
import { DriveItem, FileType } from '../types';
import { 
    fetchDriveItems, fetchDriveItemContent, saveDriveItem, deleteDriveItem, 
    subscribeToTable, findDriveItemByName, updateDriveItem, uploadToSupabaseStorage 
} from '../services/supabaseService';

// --- UTILS: UTF-8 SAFE BASE64 ---
const utf8_to_b64 = (str: string) => {
  return window.btoa(unescape(encodeURIComponent(str)));
};

const b64_to_utf8 = (str: string) => {
  try {
    return decodeURIComponent(escape(window.atob(str)));
  } catch(e) {
    return window.atob(str);
  }
};

const Drive: React.FC = () => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{id: string | null, name: string}[]>([{id: null, name: 'Root'}]);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DriveItem | null>(null);
  
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  
  const [isRenaming, setIsRenaming] = useState(false);
  
  const [previewContent, setPreviewContent] = useState<DriveItem | null>(null);
  const [previewMode, setPreviewMode] = useState<'code' | 'render'>('render');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [simulatedHtml, setSimulatedHtml] = useState<string | null>(null);

  const [showEditor, setShowEditor] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetHistory, setMoveTargetHistory] = useState<{id: string | null, name: string}[]>([{id: null, name: 'Root'}]);
  const [moveTargetItems, setMoveTargetItems] = useState<DriveItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const loadItems = async () => {
    setIsLoading(true);
    const data = await fetchDriveItems(currentFolderId);
    setItems(data.sort((a, b) => (a.type === 'folder' && b.type !== 'folder' ? -1 : 1)));
    setIsLoading(false);
  };

  useEffect(() => {
    loadItems();
    const channel = subscribeToTable('drive_items', (payload) => {
        if (payload.new && (payload.new.parent_id === currentFolderId || payload.old?.parent_id === currentFolderId)) {
            loadItems();
        }
    });
    return () => { if (channel) channel.unsubscribe(); };
  }, [currentFolderId]);

  const handleNavigate = (folderId: string | null, folderName: string) => {
    setCurrentFolderId(folderId);
    const index = folderHistory.findIndex(f => f.id === folderId);
    if (index !== -1) {
        setFolderHistory(prev => prev.slice(0, index + 1));
    } else {
        setFolderHistory(prev => [...prev, { id: folderId, name: folderName }]);
    }
  };

  const handleCreateFolder = async () => {
    if (!newItemName.trim()) return;
    const newFolder: DriveItem = {
        id: crypto.randomUUID(),
        parent_id: currentFolderId,
        name: newItemName,
        type: 'folder',
        size: 0,
        created_at: Date.now(),
        updated_at: Date.now()
    };
    await saveDriveItem(newFolder);
    setNewItemName('');
    setShowNewFolderInput(false);
    loadItems();
  };

  const handleCreateFile = async () => {
      if (!newItemName.trim()) return;
      let name = newItemName;
      if (!name.includes('.')) name += '.txt';

      const mimeMap: Record<string, string> = {
          'txt': 'text/plain', 'html': 'text/html', 'css': 'text/css', 'js': 'application/javascript', 'json': 'application/json', 'md': 'text/markdown'
      };
      const ext = name.split('.').pop() || 'txt';
      const mime = mimeMap[ext] || 'text/plain';
      const emptyContent = `data:${mime};base64,`; 

      const newFile: DriveItem = {
          id: crypto.randomUUID(),
          parent_id: currentFolderId,
          name: name,
          type: ext === 'js' || ext === 'json' ? 'code' : 'text',
          mime_type: mime,
          size: 0,
          content: emptyContent,
          created_at: Date.now(),
          updated_at: Date.now()
      };

      await saveDriveItem(newFile);
      setNewItemName('');
      setShowNewFileInput(false);
      loadItems();
  };

  const determineFileType = (file: File): FileType => {
      if (file.type.startsWith('image/')) return 'image';
      if (file.type.startsWith('text/') || file.name.endsWith('.html') || file.name.endsWith('.css') || file.name.endsWith('.md')) return 'text';
      if (file.type.includes('json') || file.type.includes('javascript') || file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.py')) return 'code';
      if (file.type.startsWith('audio/')) return 'audio';
      if (file.type.startsWith('video/')) return 'video';
      return 'binary';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    try {
        let contentUrl: string | null = null;
        
        // Use Supabase Storage for binaries or files > 100KB
        if (file.size > 100 * 1024 || !['text', 'code'].includes(determineFileType(file))) {
            contentUrl = await uploadToSupabaseStorage(file, file.name);
        }

        if (!contentUrl) {
            // Fallback to Base64 for local/guest or small files
            await new Promise<void>((resolve) => {
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    const result = ev.target?.result as string;
                    await saveDriveItem({
                        id: crypto.randomUUID(),
                        parent_id: currentFolderId,
                        name: file.name,
                        type: determineFileType(file),
                        size: file.size,
                        mime_type: file.type || 'text/plain',
                        content: result,
                        created_at: Date.now(),
                        updated_at: Date.now()
                    });
                    resolve();
                };
                reader.readAsDataURL(file);
            });
        } else {
            await saveDriveItem({
                id: crypto.randomUUID(),
                parent_id: currentFolderId,
                name: file.name,
                type: determineFileType(file),
                size: file.size,
                mime_type: file.type || 'text/plain',
                content: contentUrl,
                created_at: Date.now(),
                updated_at: Date.now()
            });
        }
        
        loadItems();
    } catch (err) {
        alert("Upload Failed.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setIsLoading(true);
      
      const ensureFolder = async (name: string, parentId: string | null): Promise<string> => {
          const existingItems = await fetchDriveItems(parentId);
          const existingFolder = existingItems.find(i => i.name === name && i.type === 'folder');
          if (existingFolder) return existingFolder.id;
          const newId = crypto.randomUUID();
          await saveDriveItem({
              id: newId,
              parent_id: parentId,
              name: name,
              type: 'folder',
              size: 0,
              created_at: Date.now(),
              updated_at: Date.now()
          });
          return newId;
      };

      try {
          let count = 0;
          for (let i = 0; i < files.length; i++) {
              const file = files[i];
              const pathParts = file.webkitRelativePath.split('/');
              let parentId = currentFolderId;
              for (let j = 0; j < pathParts.length - 1; j++) {
                  const folderName = pathParts[j];
                  parentId = await ensureFolder(folderName, parentId);
              }
              
              const storageUrl = await uploadToSupabaseStorage(file, file.name);
              await saveDriveItem({
                  id: crypto.randomUUID(),
                  parent_id: parentId,
                  name: file.name,
                  type: determineFileType(file),
                  size: file.size,
                  mime_type: file.type || 'text/plain',
                  content: storageUrl || undefined,
                  created_at: Date.now(),
                  updated_at: Date.now()
              });
              count++;
          }
          alert(`Successfully uploaded structure: ${count} files.`);
      } catch (err) {
          console.error("Folder upload error", err);
          alert("Partial upload failure.");
      } finally {
          setIsLoading(false);
          loadItems();
      }
  };

  const handleDelete = async (item: DriveItem) => {
    if (confirm(`Permanently delete ${item.name}? This cannot be undone.`)) {
        await deleteDriveItem(item.id);
        setSelectedItem(null);
        loadItems();
    }
  };

  const handleRename = async () => {
      if (!selectedItem || !newItemName.trim()) return;
      await updateDriveItem(selectedItem.id, { name: newItemName });
      setIsRenaming(false);
      setNewItemName('');
      setSelectedItem(prev => prev ? ({...prev, name: newItemName}) : null);
      loadItems();
  };

  const handleOpenMoveModal = () => {
      setShowMoveModal(true);
      setMoveTargetHistory([{id: null, name: 'Root'}]);
      loadMoveTargetItems(null);
  };

  const loadMoveTargetItems = async (folderId: string | null) => {
      const all = await fetchDriveItems(folderId);
      setMoveTargetItems(all.filter(i => i.type === 'folder' && i.id !== selectedItem?.id));
  };

  const navigateMoveTarget = (folderId: string | null, folderName: string) => {
      if (selectedItem?.type === 'folder' && folderId === selectedItem.id) return;
      const index = moveTargetHistory.findIndex(f => f.id === folderId);
      if (index !== -1) {
          setMoveTargetHistory(prev => prev.slice(0, index + 1));
      } else {
          setMoveTargetHistory(prev => [...prev, { id: folderId, name: folderName }]);
      }
      loadMoveTargetItems(folderId);
  };

  const executeMove = async () => {
      if (!selectedItem) return;
      const targetFolderId = moveTargetHistory[moveTargetHistory.length - 1].id;
      if (targetFolderId === selectedItem.id) {
          alert("Cannot move a folder into itself.");
          return;
      }
      await updateDriveItem(selectedItem.id, { parent_id: targetFolderId });
      setShowMoveModal(false);
      setSelectedItem(null);
      loadItems();
  };

  const handleEditContent = async (item: DriveItem) => {
      setIsLoading(true);
      const content = await fetchDriveItemContent(item.id);
      setIsLoading(false);
      if (content) {
          try {
              let decoded = "";
              if (content.startsWith("http")) {
                  const res = await fetch(content);
                  decoded = await res.text();
              } else if (content.includes("base64,")) {
                  const base64Part = content.split(',')[1];
                  decoded = b64_to_utf8(base64Part);
              } else {
                  decoded = content;
              }
              setEditorContent(decoded);
              setSelectedItem(item);
              setShowEditor(true);
          } catch (e) {
              console.error(e);
              alert("Cannot edit this file. Format corrupted or not text.");
          }
      } else {
          setEditorContent('');
          setSelectedItem(item);
          setShowEditor(true);
      }
  };

  const handleSaveEdit = async () => {
      if (!selectedItem) return;
      setIsSaving(true);
      try {
          const mime = selectedItem.mime_type || 'text/plain';
          const blob = new Blob([editorContent], { type: mime });
          
          let newContent = "";
          // If already on storage, re-upload to storage
          if (selectedItem.content?.startsWith('http')) {
              newContent = await uploadToSupabaseStorage(blob, selectedItem.name) || selectedItem.content;
          } else {
              const encoded = utf8_to_b64(editorContent);
              newContent = `data:${mime};base64,${encoded}`;
          }

          await updateDriveItem(selectedItem.id, { content: newContent, size: editorContent.length });
          setShowEditor(false);
          if (previewContent?.id === selectedItem.id) {
              setPreviewContent({...selectedItem, content: newContent});
              if (selectedItem.name.endsWith('.html')) {
                  const simulated = await injectVirtualResources(editorContent, selectedItem.parent_id);
                  setSimulatedHtml(simulated);
              }
          }
      } catch (e) {
          alert("Failed to save content.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleCopyCode = () => {
      navigator.clipboard.writeText(editorContent);
      alert("Code copied to clipboard!");
  };

  const injectVirtualResources = async (htmlContent: string, parentFolderId: string | null) => {
      let processed = htmlContent;
      const linkRegex = /<link[^>]+href=["']([^"']+)["'][^>]*>/g;
      let match;
      while ((match = linkRegex.exec(htmlContent)) !== null) {
          const relPath = match[1];
          if (!relPath.startsWith('http')) {
              const file = await findDriveItemByName(parentFolderId, relPath);
              if (file && file.content) {
                  processed = processed.replace(relPath, file.content);
              }
          }
      }
      const scriptRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>/g;
      while ((match = scriptRegex.exec(htmlContent)) !== null) {
          const relPath = match[1];
          if (!relPath.startsWith('http')) {
              const file = await findDriveItemByName(parentFolderId, relPath);
              if (file && file.content) {
                  processed = processed.replace(relPath, file.content);
              }
          }
      }
      const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/g;
      while ((match = imgRegex.exec(htmlContent)) !== null) {
          const relPath = match[1];
          if (!relPath.startsWith('http') && !relPath.startsWith('data:')) {
              const file = await findDriveItemByName(parentFolderId, relPath);
              if (file && file.content) {
                  processed = processed.replace(relPath, file.content);
              }
          }
      }
      return processed;
  };

  const handlePreview = async (item: DriveItem) => {
      setIsPreviewLoading(true);
      const content = await fetchDriveItemContent(item.id);
      setIsPreviewLoading(false);
      if (content) {
          setPreviewContent({ ...item, content });
          if (item.name.endsWith('.html')) {
              try {
                  let decoded = "";
                  if (content.startsWith('http')) {
                      const res = await fetch(content);
                      decoded = await res.text();
                  } else {
                      decoded = b64_to_utf8(content.split(',')[1] || '');
                  }
                  setSimulatedHtml(null); 
                  injectVirtualResources(decoded, item.parent_id).then(res => {
                      setSimulatedHtml(res);
                  });
                  setPreviewMode('render');
              } catch(e) {
                  setSimulatedHtml("<h1>Error decoding HTML</h1>");
              }
          } else {
              setSimulatedHtml(null);
          }
      } else {
          alert("Could not load file content.");
      }
  };

  const handleFullWebPreview = async () => {
      if (!simulatedHtml) return;
      const blob = new Blob([simulatedHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
  };

  const handleDownload = async (item: DriveItem) => {
      let content = item.content;
      if (!content) {
          content = await fetchDriveItemContent(item.id) || undefined;
      }
      if (content) {
          const a = document.createElement('a');
          a.href = content;
          a.download = item.name;
          a.click();
      } else {
          alert("File content unavailable.");
      }
  };

  const handleCopyPath = (item: DriveItem) => {
      const path = folderHistory.map(f => f.name === 'Root' ? '' : f.name).join('/') + '/' + item.name;
      const cleanPath = path.startsWith('/') ? path : '/' + path;
      const virtualUrl = `vfs://${cleanPath}`;
      navigator.clipboard.writeText(virtualUrl);
      alert(`Path copied: ${virtualUrl}`);
  };

  const getIcon = (type: FileType) => {
      switch (type) {
          case 'folder': return <Folder className="w-10 h-10 text-amber-500 fill-amber-500/20" />;
          case 'image': return <Image className="w-10 h-10 text-purple-400" />;
          case 'code': return <Code className="w-10 h-10 text-blue-400" />;
          case 'audio': return <Music className="w-10 h-10 text-green-400" />;
          case 'video': return <Film className="w-10 h-10 text-red-400" />;
          default: return <FileText className="w-10 h-10 text-gray-400" />;
      }
  };

  const formatSize = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-full flex flex-col p-6 lg:p-10 relative overflow-hidden select-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
                <h1 className="text-3xl font-bold genshin-gold flex items-center gap-3">
                    <HardDrive className="w-8 h-8" />
                    Archive Storage
                </h1>
                <p className="text-gray-400 text-sm">Secure Vault for Neural Patterns and Data Fragments.</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
                <button onClick={() => setShowNewFolderInput(true)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center gap-2 text-sm font-bold transition-all text-gray-300">
                    <FolderPlus className="w-4 h-4 text-amber-500" /> <span>Folder</span>
                </button>
                <button onClick={() => setShowNewFileInput(true)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center gap-2 text-sm font-bold transition-all text-gray-300">
                    <FilePlus className="w-4 h-4 text-green-400" /> <span>File</span>
                </button>
                <button onClick={() => folderInputRef.current?.click()} className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 flex items-center gap-2 text-sm font-bold transition-all">
                    <Upload className="w-4 h-4" /> <span>Up Folder</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 rounded-xl genshin-button text-white flex items-center gap-2 text-sm font-bold shadow-lg transition-all">
                    <Upload className="w-4 h-4" /> <span>Up File</span>
                </button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                <input type="file" ref={folderInputRef} className="hidden" onChange={handleFolderUpload} {...({webkitdirectory: "", directory: ""} as any)} />
            </div>
        </div>

        {/* Breadcrumbs & View Toggle */}
        <div className="flex items-center justify-between mb-6 bg-black/40 p-3 rounded-2xl border border-white/10">
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
                {folderHistory.map((folder, index) => (
                    <div key={folder.id || 'root'} className="flex items-center">
                        {index > 0 && <ChevronRight className="w-4 h-4 text-gray-600 mx-1" />}
                        <button 
                            onClick={() => handleNavigate(folder.id, folder.name)}
                            className={`flex items-center gap-2 px-2 py-1 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors ${index === folderHistory.length - 1 ? 'text-amber-500' : 'text-gray-400'}`}
                        >
                            {folder.id === null && <Home className="w-3 h-3" />}
                            {folder.name}
                        </button>
                    </div>
                ))}
            </div>
            <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}><Grid className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}><List className="w-4 h-4" /></button>
            </div>
        </div>

        {(showNewFolderInput || showNewFileInput) && (
            <div className="mb-6 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 bg-black/40 p-4 rounded-xl border border-amber-500/50">
                {showNewFolderInput ? <Folder className="w-6 h-6 text-amber-500" /> : <File className="w-6 h-6 text-green-400" />}
                <input autoFocus type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { showNewFolderInput ? handleCreateFolder() : handleCreateFile(); } }} placeholder={showNewFolderInput ? "Folder Name..." : "File Name (e.g., notes.txt)"} className="bg-transparent border-b border-amber-500 px-2 py-1 text-white outline-none w-64 text-sm select-text" />
                <div className="flex gap-2 ml-4">
                    <button onClick={showNewFolderInput ? handleCreateFolder : handleCreateFile} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold hover:bg-green-500/30">Create</button>
                    <button onClick={() => { setShowNewFolderInput(false); setShowNewFileInput(false); }} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30">Cancel</button>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar relative min-h-[300px]">
            {isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                    <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-2" />
                    <p className="text-amber-500 font-bold text-xs tracking-widest uppercase">Processing Files...</p>
                </div>
            ) : items.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 pointer-events-none">
                    <HardDrive className="w-24 h-24 text-gray-500 mb-4" />
                    <p className="text-xl font-bold">Storage Empty</p>
                    <p className="text-sm">Drag & Drop files or create a folder to begin.</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {items.map(item => (
                        <div key={item.id} onClick={() => item.type === 'folder' ? handleNavigate(item.id, item.name) : setSelectedItem(item)} className="genshin-panel p-4 rounded-xl border border-white/5 hover:border-amber-500/50 hover:bg-white/5 transition-all cursor-pointer group flex flex-col items-center text-center relative">
                            <div className="mb-3 transform group-hover:scale-110 transition-transform">{getIcon(item.type)}</div>
                            <div className="w-full">
                                <p className="text-xs font-bold text-gray-200 truncate w-full mb-1">{item.name}</p>
                                <p className="text-[10px] text-gray-500 uppercase">{item.type === 'folder' ? 'DIR' : formatSize(item.size)}</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }} className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full"><MoreVertical className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-1">
                    {items.map(item => (
                        <div key={item.id} onClick={() => item.type === 'folder' ? handleNavigate(item.id, item.name) : setSelectedItem(item)} className="flex items-center gap-4 p-3 rounded-xl border border-white/5 hover:border-amber-500/30 hover:bg-white/5 transition-all cursor-pointer group">
                             <div className="shrink-0">{getIcon(item.type)}</div>
                             <div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-200 truncate">{item.name}</p></div>
                             <div className="text-xs text-gray-500 w-24 text-right">{item.type === 'folder' ? '-' : formatSize(item.size)}</div>
                             <div className="text-xs text-gray-500 w-32 text-right hidden md:block">{new Date(item.created_at).toLocaleDateString()}</div>
                             <button onClick={(e) => { e.stopPropagation(); handleDelete(item); }} className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {selectedItem && !showEditor && !showMoveModal && (
             <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                 <div className="genshin-panel w-full max-w-md p-6 rounded-3xl border border-amber-500/30 relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                     <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                     <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">{getIcon(selectedItem.type)}</div>
                        <div className="flex-1 min-w-0">
                            {isRenaming ? (
                                <div className="flex items-center gap-2">
                                    <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="bg-black/50 border border-amber-500 rounded px-2 py-1 text-white w-full select-text" autoFocus />
                                    <button onClick={handleRename} className="text-green-400 hover:text-white"><Check className="w-4 h-4"/></button>
                                    <button onClick={() => setIsRenaming(false)} className="text-red-400 hover:text-white"><X className="w-4 h-4"/></button>
                                </div>
                            ) : (
                                <h3 className="text-lg font-bold text-white break-all line-clamp-2" onClick={() => { setIsRenaming(true); setNewItemName(selectedItem.name); }}>{selectedItem.name} <Edit className="w-3 h-3 inline text-gray-500 ml-1 hover:text-amber-500 cursor-pointer"/></h3>
                            )}
                            <p className="text-xs text-gray-500 uppercase mt-1">{selectedItem.type} • {formatSize(selectedItem.size)}</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-3 mb-6">
                         {selectedItem.type !== 'folder' && (
                             <button onClick={() => handlePreview(selectedItem)} disabled={isPreviewLoading} className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-sm font-bold disabled:opacity-50">
                                 {isPreviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Preview
                             </button>
                         )}
                         {['text', 'code'].includes(selectedItem.type) && (
                             <button onClick={() => handleEditContent(selectedItem)} className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-sm font-bold">
                                 <Edit className="w-4 h-4" /> Edit Content
                             </button>
                         )}
                         <button onClick={handleOpenMoveModal} className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-sm font-bold"><CornerUpLeft className="w-4 h-4" /> Move</button>
                         <button onClick={() => handleDownload(selectedItem)} className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-sm font-bold"><Download className="w-4 h-4" /> Download</button>
                         <button onClick={() => handleCopyPath(selectedItem)} className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-sm font-bold"><Link className="w-4 h-4" /> Copy Path</button>
                         <button onClick={() => handleDelete(selectedItem)} className="flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/30 text-red-400 text-sm font-bold"><Trash2 className="w-4 h-4" /> Delete</button>
                     </div>
                 </div>
             </div>
        )}

        {/* EDITOR MODAL */}
        {showEditor && selectedItem && (
            <div className="fixed inset-0 z-[120] bg-[#0b0e14] flex flex-col animate-in slide-in-from-bottom-10 select-text">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 md:p-4 border-b border-white/10 bg-[#131823] shrink-0 safe-area-top select-none gap-3 z-50 relative shadow-md">
                    <div className="flex items-center gap-3 overflow-hidden w-full md:w-auto">
                        <FileText className="w-5 h-5 text-amber-500 shrink-0" />
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-bold text-white text-sm truncate">{selectedItem.name}</span>
                            <span className="text-[10px] text-gray-500 italic hidden md:block">Editing</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0 w-full md:w-auto justify-end">
                        <button onClick={handleCopyCode} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 flex items-center gap-2 text-gray-300 whitespace-nowrap"><Copy className="w-4 h-4" /> <span className="hidden md:inline">Copy</span></button>
                        <button onClick={handleSaveEdit} disabled={isSaving} className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-bold hover:bg-amber-400 flex items-center gap-2 shadow-lg transition-all whitespace-nowrap">{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} <span>Save</span></button>
                        <button onClick={() => setShowEditor(false)} className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm font-bold hover:bg-red-500/20 flex items-center gap-2 transition-all whitespace-nowrap"><X className="w-4 h-4" /> <span className="hidden md:inline">Close</span></button>
                    </div>
                </div>
                <div className="flex-1 relative w-full h-full select-text">
                    <textarea 
                        value={editorContent}
                        onChange={(e) => setEditorContent(e.target.value)}
                        className="w-full h-full bg-[#0b0e14] text-green-400 font-mono p-4 outline-none resize-none custom-scrollbar leading-relaxed select-text pb-20 md:pb-4"
                        spellCheck={false}
                        autoCorrect="off"
                        autoCapitalize="off"
                        onContextMenu={(e) => e.stopPropagation()} 
                    />
                </div>
            </div>
        )}

        {/* PREVIEW MODAL */}
        {previewContent && (
             <div className="fixed inset-0 z-[150] bg-black/95 flex flex-col animate-in zoom-in-95 duration-200 select-text">
                 <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-[#131823] border-b border-white/10 shrink-0 select-none gap-4 z-50 relative shadow-lg">
                     <span className="font-bold text-white truncate w-full md:w-auto md:max-w-md text-sm md:text-base pr-4">{previewContent.name}</span>
                     <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                         {previewContent.name.endsWith('.html') && (
                             <>
                                 <div className="flex bg-black/50 rounded-full border border-white/10 p-1 shrink-0">
                                     <button onClick={() => setPreviewMode('render')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs font-bold uppercase transition-colors ${previewMode === 'render' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}><Play className="w-3 h-3 inline md:mr-1" /> <span className="hidden md:inline">Live</span></button>
                                     <button onClick={() => setPreviewMode('code')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs font-bold uppercase transition-colors ${previewMode === 'code' ? 'bg-blue-500 text-black' : 'text-gray-400 hover:text-white'}`}><Code className="w-3 h-3 inline md:mr-1" /> <span className="hidden md:inline">Code</span></button>
                                 </div>
                                 <button onClick={handleFullWebPreview} className="p-2 md:p-3 bg-green-500 text-black rounded-full hover:bg-green-400 shadow-lg font-bold flex items-center justify-center shrink-0" title="Open Full Site"><ExternalLink className="w-4 h-4 md:w-5 md:h-5" /></button>
                             </>
                         )}
                         <button onClick={() => { setPreviewContent(null); setSimulatedHtml(null); }} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded-full transition-colors font-bold shrink-0"><X className="w-4 h-4" /> <span className="hidden md:inline">Close</span></button>
                     </div>
                 </div>
                 
                 <div className="flex-1 w-full relative overflow-hidden bg-[#1e1e1e] select-text z-0">
                    {previewContent.type === 'image' ? (
                        <div className="w-full h-full flex items-center justify-center p-4">
                            <img src={previewContent.content} className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" />
                        </div>
                    ) : previewContent.name.endsWith('.html') && previewMode === 'render' ? (
                        simulatedHtml ? (
                            <iframe srcDoc={simulatedHtml} className="w-full h-full bg-white border-0" title="Live Preview" sandbox="allow-scripts allow-modals allow-forms allow-popups" />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-2"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /><span className="text-xs text-gray-400">Compiling Assets...</span></div>
                        )
                    ) : (
                        <pre onContextMenu={(e) => e.stopPropagation()} className="bg-[#1e1e1e] p-6 text-gray-300 font-mono text-sm overflow-auto w-full h-full border-0 whitespace-pre-wrap select-text cursor-text pb-20">
                            {(() => { 
                                try { 
                                    if (!previewContent.content) return "No content.";
                                    if (previewContent.content.startsWith('http')) return "Direct external link: " + previewContent.content;
                                    return b64_to_utf8(previewContent.content?.split(',')[1] || ''); 
                                } catch (e) { 
                                    return "Preview unavailable (Binary Data)"; 
                                } 
                            })()}
                        </pre>
                    )}
                 </div>
             </div>
        )}
    </div>
  );
};

export default Drive;
