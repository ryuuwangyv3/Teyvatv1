
/**
 * YOUTUBE INTELLIGENCE UTILS
 * Mendukung ekstraksi data dan bypass CORS untuk analisis kognitif AI.
 */

export const getYoutubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

export interface YoutubeMetadata {
    title: string;
    author_name: string;
    thumbnail_url: string;
    html?: string;
}

export const fetchYoutubeMetadata = async (url: string): Promise<YoutubeMetadata | null> => {
    try {
        // Menggunakan noembed (provider oembed) dengan proxy untuk mendapatkan info video
        const targetUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) return null;
        
        const data = await response.json();
        if (data.error) return null;

        return {
            title: data.title,
            author_name: data.author_name,
            thumbnail_url: data.thumbnail_url
        };
    } catch (e) {
        console.error("[Akasha] YouTube Metadata Link Severed:", e);
        return null;
    }
};
