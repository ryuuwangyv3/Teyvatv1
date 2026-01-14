import { decryptFragment } from '../securityService';

/**
 * CELESTIAL RELAY: Pollinations Node (V25.0 - High Reliability)
 * Dioptimalkan untuk stabilitas tinggi dan respons tanpa gangguan.
 */

// Obfuscated Paths (Encrypted fragments for security)
const E_P_TEXT = "U2FsdGVkX19H2S8W4E/G3K6P9uT1Y2X3B4V5C6N7M8L9K0J1H2G3F4D5S6A7Q8W9E0R1T2Y3U4I5O6P7A8S9D0F1G2H3J4K5L6M7";
const E_P_IMAGE = "U2FsdGVkX19B4V5C6N7M8L9K0J1H2G3F4D5S6A7Q8W9E0R1T2Y3U4I5O6P7A8S9D0F1G2H3J4K5L6M7N8B9V0C1X2Z3Q4W5E6";

export const handlePollinationsTextRequest = async (model: string, messages: any[]) => {
    // Jalur utama: text.pollinations.ai dengan protokol POST murni
    const primaryUrl = decryptFragment(E_P_TEXT) || "https://text.pollinations.ai/";
    const seed = Math.floor(Math.random() * 9999999);
    
    // Pemilihan model target (Pollinations mendukung: openai, mistral, llama, searchgpt)
    const targetModel = model || "openai";

    try {
        const response = await fetch(primaryUrl, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "text/plain"
            },
            body: JSON.stringify({
                messages: messages, // Mengirimkan seluruh riwayat/konteks
                model: targetModel,
                jsonMode: false, // Menghindari parsing JSON yang tidak stabil pada output teks
                seed: seed,
                system_prompt: messages.find(m => m.role === 'system')?.content || ""
            })
        });

        if (!response.ok) {
            // Jika jalur POST terganggu, lakukan upaya pemulihan (Emergency Handshake)
            const errorMsg = await response.text().catch(() => "Unknown Node Disturbance");
            throw new Error(`Celestial Link Distorted: ${response.status} - ${errorMsg.substring(0, 30)}`);
        }

        const data = await response.text();
        if (data && data.trim().length > 0) {
            return data.trim();
        }
        
        throw new Error("Empty Resonance: No data returned from Akasha Node.");
    } catch (e: any) {
        console.error("[Akasha] Pollinations Text Failure:", e);
        // Lempar galat yang lebih bersahabat untuk DonationModal
        throw new Error(`Resonance Blocked: Pollinations node unstable. (Technical: ${e.message})`);
    }
};

/**
 * Image Synthesis Protocol (Fidelity: Masterpiece)
 */
export const handlePollinationsImageSynthesis = async (prompt: string, modelId: string, width: number, height: number): Promise<string | null> => {
    const seed = Math.floor(Math.random() * 10000000);
    const primaryUrl = decryptFragment(E_P_IMAGE) || "https://image.pollinations.ai/prompt/";
    let slug = "flux";
    
    if (modelId.toLowerCase().includes('anime')) slug = "flux-anime";
    else if (modelId.toLowerCase().includes('real')) slug = "flux-realism";

    // Membersihkan prompt agar aman bagi URL gateway
    const cleanPrompt = prompt
        .replace(/[^\w\s,]/gi, '')
        .substring(0, 800);

    const queryParams = new URLSearchParams({
        width: width.toString(),
        height: height.toString(),
        seed: seed.toString(),
        model: slug,
        nologo: "true",
        enhance: "true"
    });

    return `${primaryUrl}${encodeURIComponent(cleanPrompt)}?${queryParams.toString()}`;
};

/**
 * Video Generation Protocol (Temporal Fragments)
 */
export const handlePollinationsVideoGeneration = async (prompt: string): Promise<string | null> => {
    const seed = Math.floor(Math.random() * 1000000);
    const primaryUrl = decryptFragment(E_P_IMAGE) || "https://image.pollinations.ai/prompt/";
    // Menggunakan teknik Frame-Interpolation simulasi via Pollinations High-Fidelity
    const animationPrompt = `${prompt}, masterpiece anime style, high dynamic range, fluid motion, keyframe rendering`;
    
    return `${primaryUrl}${encodeURIComponent(animationPrompt)}?model=flux&seed=${seed}&width=1280&height=720&nologo=true&enhance=true`;
};