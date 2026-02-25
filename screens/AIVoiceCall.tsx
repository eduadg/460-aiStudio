
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { XMarkIcon, MicrophoneIcon, SpeakerWaveIcon, SparklesIcon } from '../components/icons';
import { api } from '../services/api';

interface AIVoiceCallProps {
    onHangup: () => void;
}

// --- AUDIO UTILS ---
function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output.buffer;
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

const AIVoiceCall: React.FC<AIVoiceCallProps> = ({ onHangup }) => {
    const [status, setStatus] = useState<'connecting' | 'listening' | 'speaking' | 'error'>('connecting');
    const [volume, setVolume] = useState(0);
    
    // Audio Contexts
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    
    // Playback State
    const nextStartTimeRef = useRef<number>(0);
    const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
    
    // Session Control
    const sessionRef = useRef<any>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        startLiveSession();

        return () => {
            isMountedRef.current = false;
            cleanup();
        };
    }, []);

    const cleanup = () => {
        if (sessionRef.current) {
            sessionRef.current.close();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
        }
        if (inputSourceRef.current) {
            inputSourceRef.current.disconnect();
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
        scheduledSourcesRef.current.forEach(source => source.stop());
    };

    const startLiveSession = async () => {
        try {
            // 1. Initialize Audio Context
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 24000 // Gemini output sample rate
            });
            
            // 2. Initialize Gemini Client
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            const config = {
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                    systemInstruction: `Você é o Dr. X, um assistente médico avançado, calmo e empático. 
                    Fale português do Brasil fluentemente. Seja conciso nas respostas.
                    Seu objetivo é ouvir os sintomas do paciente e oferecer orientações iniciais ou acalmar.`,
                },
            };

            const session = await ai.live.connect({
                ...config,
                callbacks: {
                    onopen: async () => {
                        console.log("Gemini Live Connected");
                        if (isMountedRef.current) setStatus('listening');
                        await startAudioInput(session);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle Audio Output
                        const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (audioData) {
                            if (isMountedRef.current) setStatus('speaking');
                            await queueAudioForPlayback(audioData);
                        }

                        // Handle Turn Completion (Back to listening)
                        if (message.serverContent?.turnComplete) {
                            if (isMountedRef.current) setStatus('listening');
                        }
                    },
                    onclose: () => {
                        console.log("Gemini Live Closed");
                    },
                    onerror: (err) => {
                        console.error("Gemini Live Error:", err);
                        if (isMountedRef.current) setStatus('error');
                    }
                }
            });

            sessionRef.current = session;

        } catch (error) {
            console.error("Failed to start session:", error);
            setStatus('error');
        }
    };

    const startAudioInput = async (session: any) => {
        if (!audioContextRef.current) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    channelCount: 1, 
                    sampleRate: 16000 // Gemini input preference
                } 
            });
            streamRef.current = stream;

            // Create a separate context for input to match 16k requirement easily or resample
            const inputContext = new AudioContext({ sampleRate: 16000 });
            const source = inputContext.createMediaStreamSource(stream);
            
            // ScriptProcessor for raw PCM access (AudioWorklet is better for prod, but this is simpler for quick implementation)
            const processor = inputContext.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
                if (!session) return;

                const inputData = e.inputBuffer.getChannelData(0);
                
                // Volume meter logic
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                const rms = Math.sqrt(sum / inputData.length);
                if (isMountedRef.current) setVolume(Math.min(rms * 10, 1.5)); // Scale for visual

                // Convert to PCM 16-bit
                const pcm16 = floatTo16BitPCM(inputData);
                const base64 = arrayBufferToBase64(pcm16);

                session.sendRealtimeInput({
                    media: {
                        mimeType: "audio/pcm;rate=16000",
                        data: base64
                    }
                });
            };

            source.connect(processor);
            processor.connect(inputContext.destination);
            
            inputSourceRef.current = source as any; // Type mismatch workaround for different contexts
            processorRef.current = processor;

        } catch (e) {
            console.error("Mic Error:", e);
            setStatus('error');
        }
    };

    const queueAudioForPlayback = async (base64Data: string) => {
        if (!audioContextRef.current) return;

        const ctx = audioContextRef.current;
        const bytes = base64ToUint8Array(base64Data);
        
        // Convert PCM16 to Float32 for Web Audio API
        const float32 = new Float32Array(bytes.length / 2);
        const dataView = new DataView(bytes.buffer);
        
        for (let i = 0; i < float32.length; i++) {
            const int16 = dataView.getInt16(i * 2, true); // Little endian
            float32[i] = int16 / 32768.0;
        }

        const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
        audioBuffer.copyToChannel(float32, 0);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        // Schedule playback
        const currentTime = ctx.currentTime;
        if (nextStartTimeRef.current < currentTime) {
            nextStartTimeRef.current = currentTime;
        }
        
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
        
        scheduledSourcesRef.current.push(source);
        
        // Remove source when done
        source.onended = () => {
            scheduledSourcesRef.current = scheduledSourcesRef.current.filter(s => s !== source);
            if (scheduledSourcesRef.current.length === 0 && isMountedRef.current) {
                // If no more audio is scheduled, user turn might start soon, but keep state management in onmessage
            }
        };
    };

    const getStatusText = () => {
        switch(status) {
            case 'connecting': return "Estabelecendo conexão segura...";
            case 'listening': return "Ouvindo você...";
            case 'speaking': return "Dr. X falando...";
            case 'error': return "Conexão interrompida.";
            default: return "";
        }
    };

    const getStatusColor = () => {
        switch(status) {
            case 'connecting': return "border-blue-500/30";
            case 'listening': return "border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.3)]";
            case 'speaking': return "border-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.4)]";
            case 'error': return "border-red-500/50";
            default: return "border-slate-700";
        }
    };

    return (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center animate-fade-in backdrop-blur-xl bg-slate-950/95 text-white">
            
            {/* Background Ambient Glow */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] blur-[120px] rounded-full pointer-events-none transition-colors duration-1000 ${status === 'speaking' ? 'bg-purple-600/20' : 'bg-blue-600/20'}`}></div>

            {/* Header Area */}
            <div className="absolute top-16 w-full text-center z-20 pointer-events-none">
                <h2 className="text-3xl font-bold tracking-tight drop-shadow-lg flex items-center justify-center gap-3">
                    Dr. X Voice 
                    <span className="text-[10px] bg-red-500 px-2 py-0.5 rounded text-white font-mono uppercase tracking-widest animate-pulse">Live</span>
                </h2>
                <p className="text-slate-400 text-sm font-medium mt-2 uppercase tracking-widest flex items-center justify-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-teal-400" />
                    Powered by Gemini 2.5
                </p>
            </div>

            {/* Close Button */}
            <button 
                onClick={onHangup}
                className="absolute top-8 right-8 z-[1000] p-4 bg-white/10 hover:bg-red-500/80 border border-white/10 rounded-full text-white transition-all shadow-2xl group cursor-pointer backdrop-blur-md"
                title="Encerrar Chamada"
            >
                <XMarkIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>

            {/* Main Visualizer Orb */}
            <div className="relative z-50 w-full max-w-sm flex flex-col items-center justify-center">
                
                <div className="w-[300px] h-[300px] flex items-center justify-center relative mb-12">
                    {/* Dynamic Ring 1 */}
                    <div 
                        className={`absolute inset-0 border-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
                        style={{ transform: `scale(${1 + volume * 0.3})` }}
                    ></div>
                    
                    {/* Dynamic Ring 2 (Delayed) */}
                    <div 
                        className={`absolute inset-4 border border-white/10 rounded-full transition-all duration-500 ease-out`}
                        style={{ transform: `scale(${1 + volume * 0.15})` }}
                    ></div>

                    {/* Central Orb */}
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center bg-gradient-to-br shadow-2xl transition-all duration-500 z-10
                        ${status === 'speaking' ? 'from-purple-500 to-indigo-600 scale-110' : 
                          status === 'listening' ? 'from-emerald-500 to-teal-600' : 
                          status === 'error' ? 'from-red-500 to-orange-600' :
                          'from-slate-700 to-slate-900'}
                    `}>
                        {status === 'speaking' && <SpeakerWaveIcon className="w-12 h-12 text-white animate-pulse" />}
                        {status === 'listening' && <MicrophoneIcon className="w-12 h-12 text-white" />}
                        {status === 'connecting' && <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>}
                        {status === 'error' && <XMarkIcon className="w-12 h-12 text-white" />}
                    </div>
                </div>

                <div className="text-center space-y-3 bg-slate-800/50 p-6 rounded-3xl border border-white/5 backdrop-blur-md min-w-[280px]">
                    <p className={`font-bold text-lg transition-colors ${status === 'error' ? 'text-red-400' : 'text-white'}`}>
                        {getStatusText()}
                    </p>
                    {status === 'listening' && (
                        <p className="text-slate-400 text-xs max-w-[200px] mx-auto leading-relaxed animate-pulse">
                            Fale naturalmente...
                        </p>
                    )}
                </div>
            </div>
            
            {/* Footer */}
            <div className="absolute bottom-12 text-center z-20 pointer-events-none opacity-50">
                <p className="text-slate-500 text-[9px] font-mono uppercase tracking-[0.3em]">
                    Conexão Criptografada // Latência Baixa
                </p>
            </div>
        </div>
    );
};

export default AIVoiceCall;
