
// ATENÇÃO: Substitua pela sua API Key real da ElevenLabs.
// Em produção, use process.env.REACT_APP_ELEVENLABS_API_KEY
const ELEVENLABS_API_KEY = process.env.REACT_APP_ELEVENLABS_API_KEY || 'sk_c2e283294c79402e3aa02c2e0e014798d423984534839843'; 
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export const elevenLabsService = {
    
    // 1. CLONAGEM DE VOZ (Instant Voice Cloning)
    cloneVoice: async (file: File, name: string, description: string): Promise<string> => {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('files', file);

        try {
            // Nota: Não definimos 'Content-Type' aqui. O navegador define automaticamente como multipart/form-data com o boundary correto.
            const response = await fetch(`${ELEVENLABS_API_URL}/voices/add`, {
                method: 'POST',
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Erro ElevenLabs:", errorData);
                throw new Error(errorData.detail?.message || 'Falha ao clonar voz. Verifique sua chave API (Plano Creator necessário para clonagem).');
            }

            const data = await response.json();
            return data.voice_id; // Retorna o ID da nova voz criada
        } catch (error: any) {
            console.error("ElevenLabs Clone Error:", error);
            throw new Error(error.message || "Erro de conexão com ElevenLabs");
        }
    },

    // 2. TEXT-TO-SPEECH (TTS)
    generateAudio: async (text: string, voiceId?: string): Promise<string> => {
        try {
            // ID padrão (Rachel) se o médico não tiver voz clonada
            const targetVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM'; 

            const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${targetVoiceId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': ELEVENLABS_API_KEY,
                },
                body: JSON.stringify({
                    text: text,
                    model_id: "eleven_multilingual_v2", // Modelo que suporta Português
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Erro ElevenLabs TTS:", errorData);
                throw new Error('Erro ao gerar áudio. Verifique sua cota da API.');
            }

            // A resposta é um stream de áudio (Blob)
            const blob = await response.blob();
            // Cria uma URL temporária para tocar no navegador
            return URL.createObjectURL(blob);

        } catch (error) {
            console.error("ElevenLabs TTS Error:", error);
            throw error;
        }
    },

    // 3. VERIFICAR SE API ESTÁ OK (Opcional)
    checkStatus: async () => {
        try {
            const response = await fetch(`${ELEVENLABS_API_URL}/user`, {
                headers: { 'xi-api-key': ELEVENLABS_API_KEY }
            });
            return response.ok;
        } catch {
            return false;
        }
    }
};
