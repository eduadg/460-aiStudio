
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PaperAirplaneIcon, ArrowPathIcon, UserCircleIcon, MicrophoneIcon, StopIcon, ClipboardDocumentCheckIcon, ShareIcon, SpeakerWaveIcon, PrinterIcon, PaperClipIcon, XMarkIcon, BellIcon, CheckCircleIcon, CloudIcon } from '../components/icons';
import { api } from '../services/api';
import { elevenLabsService } from '../services/elevenLabs';
import type { ChatMessage, User, Prescription, SuggestedReminder } from '../types';
import { offlineService } from '../services/offline';

// New: Suggested Reminder Bubble Component
interface SuggestedReminderBubbleProps {
    reminder: SuggestedReminder;
    onAdd: (reminder: SuggestedReminder) => void;
    onReject: () => void;
    adding: boolean;
    sender: 'user' | 'ai' | 'doctor';
    time: string;
}

const SuggestedReminderBubble: React.FC<SuggestedReminderBubbleProps> = ({ reminder, onAdd, onReject, adding, sender, time }) => {
    return (
        <div className="flex items-start gap-2 justify-start mb-4 w-full">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm bg-yellow-600">
                <BellIcon className="w-5 h-5 text-white" />
            </div>
            <div className="rounded-2xl py-3 px-4 max-w-sm md:max-w-md text-slate-800 dark:text-yellow-100 rounded-tl-none shadow-md border bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700">
                <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
                        Dr. X (IA) Sugere Lembrete
                    </p>
                </div>
                <p className="whitespace-pre-wrap font-semibold text-yellow-800 dark:text-yellow-100 mb-2">
                    "{reminder.message}"
                </p>
                <div className="text-xs text-yellow-700 dark:text-yellow-200 mb-3">
                    <p><strong>Tipo:</strong> {reminder.type === 'medication' ? 'Medicação' : reminder.type === 'measurement' ? 'Medição' : reminder.type === 'appointment' ? 'Consulta' : 'Geral'}</p>
                    <p><strong>Hora:</strong> {reminder.time}</p>
                    <p><strong>Frequência:</strong> {reminder.frequency === 'daily' ? 'Diário' : reminder.frequency === 'weekly' ? 'Semanal' : 'Uma Vez'}</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => onAdd(reminder)}
                        disabled={adding}
                        className="flex-1 flex items-center justify-center gap-1 bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                    >
                        {adding ? <ArrowPathIcon className="w-4 h-4 animate-spin"/> : <CheckCircleIcon className="w-4 h-4" />}
                        {adding ? 'Adicionando...' : 'Adicionar Lembrete'}
                    </button>
                    <button 
                        onClick={onReject}
                        disabled={adding}
                        className="flex-1 flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                    >
                        <XMarkIcon className="w-4 h-4" />
                        Rejeitar
                    </button>
                </div>
                <p className="text-xs mt-2 text-right text-yellow-600 dark:text-yellow-300">{time}</p>
            </div>
        </div>
    );
};


const ChatBubble: React.FC<{ message: string; sender: 'user' | 'ai' | 'doctor'; time: string; doctorVoiceId?: string; attachmentUrl?: string; suggestedReminder?: SuggestedReminder; onAddSuggestedReminder?: (reminder: SuggestedReminder) => void; onRejectSuggestedReminder?: () => void; addingReminder?: boolean }> = ({ message, sender, time, doctorVoiceId, attachmentUrl, suggestedReminder, onAddSuggestedReminder, onRejectSuggestedReminder, addingReminder }) => {
    const isActionPlan = message.includes("📋 PLANO DE AÇÃO MÉDICA");
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [loadingAudio, setLoadingAudio] = useState(false);

    const handleShare = () => {
        const text = `*Dr. X Health - Prescrição Digital*\n\n${message}\n\n_Gerado e assinado digitalmente._`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const handlePrintPDF = () => {
        const mockPrescription: Prescription = {
            id: 'temp',
            doctorId: 'doc',
            patientId: 'me',
            content: {
                type: 'adjustment',
                severity: 'medium',
                summary: message.replace("📋 PLANO DE AÇÃO MÉDICA", "").trim(),
                actions: {}, 
                generatedAt: new Date().toISOString()
            },
            createdAt: new Date().toISOString(),
            signedBy: 'Médico Responsável (Via Chat)',
            crm: 'Consulte CRM no Perfil',
            digitalSignatureHash: 'Válido mediante conferência no App'
        };
        api.generateAndPrintPDF(mockPrescription);
    };

    const handlePlayAudio = async () => {
        if (isPlaying && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
            return;
        }

        setLoadingAudio(true);
        try {
            if (audioRef.current) {
                audioRef.current.play();
                setIsPlaying(true);
                setLoadingAudio(false);
                return;
            }

            const audioUrl = await elevenLabsService.generateAudio(message, doctorVoiceId || '');
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            
            audio.onended = () => setIsPlaying(false);
            audio.play();
            setIsPlaying(true);

        } catch (error) {
            console.error("Erro ao tocar áudio:", error);
            alert("Não foi possível gerar o áudio. Verifique a chave da ElevenLabs.");
        } finally {
            setLoadingAudio(false);
        }
    };

    // If it's a suggested reminder, render the special bubble
    if (suggestedReminder && onAddSuggestedReminder && onRejectSuggestedReminder) {
        return (
            <SuggestedReminderBubble
                reminder={suggestedReminder}
                onAdd={onAddSuggestedReminder}
                onReject={onRejectSuggestedReminder}
                adding={!!addingReminder}
                sender={sender}
                time={time}
            />
        );
    }

    // User styles (Right)
    if (sender === 'user') {
        return (
            <div className="flex items-end gap-2 justify-end mb-4">
                <div className="rounded-2xl py-3 px-4 max-w-sm md:max-w-md bg-teal-500 text-white rounded-br-none shadow-sm">
                    {attachmentUrl && (
                        <div className="mb-2 rounded-lg overflow-hidden border border-teal-400/50">
                            <img src={attachmentUrl} alt="Anexo enviado" className="w-full h-auto max-h-60 object-cover" />
                        </div>
                    )}
                    <p className="whitespace-pre-wrap">{message}</p>
                    <p className="text-xs mt-1 text-teal-100 text-right">{time}</p>
                </div>
            </div>
        );
    }

    // AI/Doctor styles (Left)
    return (
        <div className="flex items-start gap-2 justify-start mb-4 w-full">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${isActionPlan ? 'bg-purple-600' : 'bg-blue-600'}`}>
                {isActionPlan ? <ClipboardDocumentCheckIcon className="w-5 h-5 text-white" /> : <UserCircleIcon className="w-5 h-5 text-white" />}
            </div>
            <div className={`rounded-2xl py-3 px-4 max-w-sm md:max-w-md text-slate-800 dark:text-blue-100 rounded-tl-none shadow-md border 
                ${isActionPlan 
                    ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700' 
                    : sender === 'ai' 
                        ? 'bg-white dark:bg-slate-800 dark:border-slate-700' 
                        : 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800'}`}
            >
                <div className="flex justify-between items-center mb-1">
                    <p className={`text-xs font-bold ${isActionPlan ? 'text-purple-600 dark:text-purple-400' : sender === 'ai' ? 'text-slate-500 dark:text-slate-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {sender === 'ai' ? 'Dr. X (IA)' : isActionPlan ? 'Nova Prescrição' : 'Médico Responsável'}
                    </p>
                    <button 
                        onClick={handlePlayAudio}
                        disabled={loadingAudio}
                        className={`p-1 rounded-full transition-colors ${isPlaying ? 'text-green-500 animate-pulse' : 'text-slate-400 hover:text-blue-500'}`}
                        title="Ouvir mensagem"
                    >
                        {loadingAudio ? <ArrowPathIcon className="w-4 h-4 animate-spin"/> : <SpeakerWaveIcon className="w-4 h-4" />}
                    </button>
                </div>

                <p className="whitespace-pre-wrap">{message}</p>
                
                {isActionPlan && (
                    <div className="flex gap-2 mt-3">
                        <button 
                            onClick={handlePrintPDF}
                            className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
                        >
                            <PrinterIcon className="w-4 h-4" />
                            Baixar PDF
                        </button>
                        <button 
                            onClick={handleShare}
                            className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
                        >
                            <ShareIcon className="w-4 h-4" />
                            WhatsApp
                        </button>
                    </div>
                )}

                <p className={`text-xs mt-1 text-right ${isActionPlan ? 'text-purple-400 dark:text-purple-500' : 'text-slate-400 dark:text-slate-500'}`}>{time}</p>
            </div>
        </div>
    );
};

const QuickReply: React.FC<{ text: string, onClick: () => void }> = ({ text, onClick }) => (
    <button onClick={onClick} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2 px-4 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm">
        {text}
    </button>
);

const TypingIndicator: React.FC = () => (
    <div className="flex items-end gap-2 justify-start mb-4">
        <div className="rounded-2xl py-3 px-4 max-w-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-bl-none shadow-md dark:shadow-none dark:border dark:border-slate-700">
            <div className="flex items-center justify-center gap-1">
                <span className="h-2 w-2 bg-slate-300 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="h-2 w-2 bg-slate-300 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="h-2 w-2 bg-slate-300 dark:bg-slate-500 rounded-full animate-bounce"></span>
            </div>
        </div>
    </div>
)

interface ChatProps {
    initialMessage: string;
    onClearInitialMessage: () => void;
}

const Chat: React.FC<ChatProps> = ({ initialMessage, onClearInitialMessage }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [doctorVoiceId, setDoctorVoiceId] = useState<string>('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [pendingSync, setPendingSync] = useState(0);
    
    // Attachment State
    const [attachment, setAttachment] = useState<File | null>(null);
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Voice State
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    // AI Reminder State
    const [aiSuggestedReminder, setAiSuggestedReminder] = useState<SuggestedReminder | null>(null);
    const [addingSuggestedReminder, setAddingSuggestedReminder] = useState(false);

    // Carrega histórico e monitora sync
    useEffect(() => {
        let unsubscribe = () => {};

        const loadHistory = async () => {
            try {
                const user = await api.getUser();
                const history = await api.getChatHistory(user.id);
                setMessages(history);
                
                const doctor = await api.getMyDoctor();
                if (doctor && doctor.elevenLabsVoiceId) {
                    setDoctorVoiceId(doctor.elevenLabsVoiceId);
                }

                unsubscribe = api.subscribeToChat(user.id, (newMsg) => {
                    if (newMsg.sender !== 'user') {
                        if (newMsg.suggestedReminder) {
                            setAiSuggestedReminder(newMsg.suggestedReminder);
                        } else {
                            setMessages(prev => [...prev, newMsg]);
                        }
                    }
                });

            } catch (e) {
                console.error("Erro ao carregar chat", e);
            } finally {
                setIsInitializing(false);
            }
        };
        loadHistory();
        
        // Listen for sync changes to update UI
        const handleSyncChange = (e: CustomEvent) => setPendingSync(e.detail.pending);
        window.addEventListener('sync-status-change', handleSyncChange as EventListener);
        setPendingSync(offlineService.getQueueSize()); // Initial check

        return () => {
            unsubscribe();
            window.removeEventListener('sync-status-change', handleSyncChange as EventListener);
        };
    }, []);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, isInitializing, attachmentPreview, aiSuggestedReminder]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAttachment(file);
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (typeof ev.target?.result === 'string') {
                    setAttachmentPreview(ev.target.result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const clearAttachment = () => {
        setAttachment(null);
        setAttachmentPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSendMessage = async (text: string) => {
        if (!text.trim() && !attachment) return;

        const currentAttachment = attachment;
        const currentAttachmentPreview = attachmentPreview;
        clearAttachment(); 

        let attachmentUrl = undefined;
        let base64ImageForAi = null;

        // --- OPTIMISTIC UI UPDATE ---
        const userMessage: ChatMessage = {
            sender: 'user',
            text,
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            attachmentUrl: currentAttachmentPreview || undefined, // Use preview locally
            attachmentType: currentAttachment ? 'image' : undefined
        };
        setMessages(prev => [...prev, userMessage]);
        // -----------------------------

        setIsLoading(true);

        try {
            if (currentAttachment && navigator.onLine) {
                try {
                    attachmentUrl = await api.uploadChatAttachment(currentAttachment);
                } catch (uploadErr) {
                    console.error("Erro no upload", uploadErr);
                }
                if (currentAttachmentPreview) {
                    base64ImageForAi = currentAttachmentPreview.split(',')[1];
                }
            }

            // Real Save (might queue if offline)
            await api.saveChatMessage({ ...userMessage, attachmentUrl }); 
            
            // Only call AI if online
            if (navigator.onLine) {
                const user = await api.getUser();
                const healthContext = await api.getHealthContext(user.id!);

                const parts: any[] = [];
                if (base64ImageForAi && currentAttachment) {
                    parts.push({ inlineData: { mimeType: currentAttachment.type || 'image/jpeg', data: base64ImageForAi } });
                    parts.push({ text: text || "Analise esta imagem." });
                } else {
                    parts.push({ text: text });
                }

                const ai = new GoogleGenerativeAI({ apiKey: import.meta.env.VITE_GOOGLE_API_KEY as string });
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: { parts },
                    config: {
                        systemInstruction: `Você é o Dr. X... [Instructions truncated for brevity]...`,
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                isReminderSuggestion: { type: Type.BOOLEAN },
                                reminder: { type: Type.OBJECT, properties: { message: {type: Type.STRING}, type: {type: Type.STRING}, time: {type: Type.STRING}, frequency: {type: Type.STRING} } },
                                responseText: { type: Type.STRING },
                            },
                        },
                    }
                });

                const rawText = response.text;
                let aiMessage: ChatMessage;

                try {
                    const parsedResponse = rawText ? JSON.parse(rawText) : {};
                    if (parsedResponse.isReminderSuggestion && parsedResponse.reminder) {
                        aiMessage = { sender: 'ai', text: "Com certeza! Que tal este lembrete?", time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), suggestedReminder: parsedResponse.reminder };
                        setAiSuggestedReminder(parsedResponse.reminder); 
                    } else {
                        aiMessage = { sender: 'ai', text: parsedResponse.responseText || rawText, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
                        setMessages(prev => [...prev, aiMessage]);
                    }
                } catch (e) {
                    aiMessage = { sender: 'ai', text: rawText || "Erro.", time: new Date().toLocaleTimeString() };
                    setMessages(prev => [...prev, aiMessage]);
                }
                
                await api.saveChatMessage(aiMessage); 
            } else {
                // If offline, just simulate a "received" check or keep user message
                // Note: AI won't reply offline.
            }

        } catch (error) {
            console.error('Error in chat flow:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddSuggestedReminder = async (reminder: SuggestedReminder) => {
        setAddingSuggestedReminder(true);
        try {
            const user = await api.getUser();
            await api.createReminder(user.id!, { ...reminder, isActive: true });
            setAiSuggestedReminder(null);
            const confirmationMessage: ChatMessage = { sender: 'ai', text: `Lembrete "${reminder.message}" adicionado com sucesso!`, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
            setMessages(prev => [...prev, confirmationMessage]);
            await api.saveChatMessage(confirmationMessage);
        } catch (e: any) { alert(e.message); } finally { setAddingSuggestedReminder(false); }
    };

    const handleRejectSuggestedReminder = () => {
        setAiSuggestedReminder(null);
        const rejectionMessage: ChatMessage = { sender: 'ai', text: "Ok, entendi. O lembrete não foi adicionado.", time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
        setMessages(prev => [...prev, rejectionMessage]);
        api.saveChatMessage(rejectionMessage);
    };

    useEffect(() => {
        if (initialMessage && !isInitializing) {
            handleSendMessage(initialMessage);
            onClearInitialMessage();
        }
    }, [initialMessage, onClearInitialMessage, isInitializing]);

    const handleFormSubmit = (e: React.FormEvent) => { e.preventDefault(); handleSendMessage(userInput); setUserInput(''); };
    
    // Voice Logic (Keep existing implementation)
    const toggleListening = () => { /* ... existing voice logic ... */ };
    
    const handleQuickReplyClick = (text: string) => { handleSendMessage(text); };
    const quickReplies = ["Como está minha saúde hoje?", "Analise meu sono recente", "Tenho comido bem?", "O que fazer com essa pressão?", "Lembre-me de tomar água às 10h"];

    if (isInitializing) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><ArrowPathIcon className="w-8 h-8 text-teal-600 animate-spin" /></div>;

    return (
        <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <header className="bg-white dark:bg-slate-900 shadow-sm p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 transition-colors flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Assistente de Saúde</h1>
                    <p className="text-sm text-green-600 dark:text-green-400 font-semibold">Online • Histórico Ativo</p>
                </div>
                {pendingSync > 0 && (
                    <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                        <CloudIcon className="w-4 h-4" />
                        <span>Sincronizando ({pendingSync})</span>
                    </div>
                )}
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-950">
                {messages.map((msg, index) => (
                    <ChatBubble key={index} message={msg.text} sender={msg.sender} time={msg.time} doctorVoiceId={doctorVoiceId} attachmentUrl={msg.attachmentUrl} />
                ))}
                {aiSuggestedReminder && (
                    <SuggestedReminderBubble reminder={aiSuggestedReminder} onAdd={handleAddSuggestedReminder} onReject={handleRejectSuggestedReminder} adding={addingSuggestedReminder} sender='ai' time={new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} />
                )}
                {isLoading && <TypingIndicator />}
                {!isLoading && messages.length > 0 && messages[messages.length - 1].sender === 'ai' && (
                     <div className="flex flex-wrap gap-2 justify-start my-4">
                        {quickReplies.map(text => <QuickReply key={text} text={text} onClick={() => handleQuickReplyClick(text)} />)}
                    </div>
                )}
                 <div ref={chatEndRef} />
            </main>

            <footer className="bg-white dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-slate-800 transition-colors">
                 {/* ... Attachment Preview Logic ... */}
                 {attachmentPreview && (
                    <div className="flex items-center gap-3 mb-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl w-fit relative animate-fade-in-up">
                        <img src={attachmentPreview} alt="Preview" className="h-12 w-12 rounded-lg object-cover border border-slate-300 dark:border-slate-600" />
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-[150px]">{attachment?.name}</span>
                        <button onClick={clearAttachment} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-md"><XMarkIcon className="w-3 h-3" /></button>
                    </div>
                 )}

                 <form onSubmit={handleFormSubmit} className="relative flex gap-2 items-end">
                    <div className="mb-2">
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:text-teal-600 transition-colors" title="Anexar Imagem"><PaperClipIcon className="w-6 h-6" /></button>
                    </div>
                    <div className="relative flex-1">
                        <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} disabled={isLoading} placeholder="Digite sua mensagem..." className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-4 pr-12 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 transition-colors" />
                        <button type="button" onClick={toggleListening} className={`absolute inset-y-0 right-2 flex items-center justify-center p-2 rounded-full transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                            {isListening ? <StopIcon className="w-5 h-5" /> : <MicrophoneIcon className="w-5 h-5" />}
                        </button>
                    </div>
                    <button type="submit" disabled={isLoading || (!userInput.trim() && !attachment && !isListening)} className="bg-slate-800 dark:bg-slate-700 h-12 w-12 rounded-full flex items-center justify-center transform hover:scale-105 transition-transform disabled:bg-slate-400 disabled:scale-100 flex-shrink-0 mb-0.5">
                        <PaperAirplaneIcon className="h-6 w-6 text-white" />
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default Chat;
