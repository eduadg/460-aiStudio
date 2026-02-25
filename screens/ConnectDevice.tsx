
import React, { useState, useEffect, useRef } from 'react';
import { RingIcon, CheckCircleIcon, Battery100Icon, ArrowPathIcon, CpuChipIcon } from '../components/icons';
import { ringService } from '../services/ringIntegration';
import { RingDeviceInfo } from '../types';

interface ConnectDeviceProps { onBack: () => void; onConnect: () => void; }
type Status = 'instructions' | 'searching' | 'found' | 'connecting' | 'handshake' | 'connected' | 'error';

const ConnectDevice: React.FC<ConnectDeviceProps> = ({ onBack, onConnect }) => {
    const [status, setStatus] = useState<Status>('instructions');
    const [foundDevice, setFoundDevice] = useState<RingDeviceInfo | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    
    // Debug Terminal
    const [showDebug, setShowDebug] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleDebug = (e: CustomEvent) => {
            const { text, hex, isAscii } = e.detail;
            const msg = isAscii ? `RX: ${text}` : `RX: ${hex}`;
            setLogs(prev => [...prev.slice(-20), msg]);
        };
        window.addEventListener('ring-debug', handleDebug as EventListener);
        return () => window.removeEventListener('ring-debug', handleDebug as EventListener);
    }, []);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const handleSearch = async () => {
        setStatus('searching');
        setErrorMsg('');
        setLogs([]);
        try {
            const dev = await ringService.scanDevices();
            setFoundDevice(dev);
            setStatus('found');
        } catch (e: any) {
            if (e.name === 'NotFoundError' || e.message?.includes('cancelled') || e.message?.includes('User cancelled')) {
                setStatus('instructions');
                return;
            }
            console.error(e);
            setErrorMsg("Não foi possível encontrar dispositivos compatíveis. Verifique o Bluetooth."); 
            setStatus('error'); 
        }
    };

    const handleConnect = async () => {
        if (!foundDevice) return;
        setStatus('connecting');
        setLogs(prev => [...prev, "Iniciando conexão GATT..."]);
        try {
            const result = await ringService.connectDevice({ device_mac: foundDevice.id });
            if (result.success) {
                setStatus('handshake');
                setLogs(prev => [...prev, "Conectado. Enviando Handshake..."]);
                // Pequeno delay para simular/aguardar o handshake visualmente
                setTimeout(() => {
                    setStatus('connected');
                    setTimeout(onConnect, 1500);
                }, 1000);
            } else {
                throw new Error("Falha no handshake com o anel.");
            }
        } catch (e: any) { 
            console.error(e);
            setErrorMsg(e.message || "Erro ao conectar."); 
            setStatus('error'); 
        }
    };

    return (
        <div className="h-screen flex flex-col bg-slate-950 text-white">
            <header className="p-4 flex items-center border-b border-slate-800 justify-between">
                <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg> Voltar</button>
                <h1 className="text-lg font-bold text-center">Smart Ring</h1>
                <button onClick={() => setShowDebug(!showDebug)} className={`p-2 rounded-full ${showDebug ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-800 text-slate-500'}`}><CpuChipIcon className="w-5 h-5" /></button>
            </header>
            
            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                
                {/* Visual Content */}
                <div className={`transition-all duration-500 w-full flex flex-col items-center ${showDebug ? 'opacity-20 blur-sm scale-90' : 'opacity-100 scale-100'}`}>
                    {status === 'instructions' && (
                        <div className="animate-fade-in">
                            <div className="w-40 h-40 bg-slate-900 rounded-full flex items-center justify-center mb-8 mx-auto border-4 border-slate-800 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                                <RingIcon className="w-20 h-20 text-teal-500" />
                            </div>
                            <h2 className="text-2xl font-bold mb-4">Pareamento</h2>
                            <p className="text-slate-400 mb-8 max-w-xs mx-auto">Certifique-se que o anel tem bateria e o Bluetooth está ativo.</p>
                            <button onClick={handleSearch} className="bg-teal-600 text-white font-bold py-4 px-10 rounded-2xl shadow-lg hover:bg-teal-500 transition-transform active:scale-95">Buscar Dispositivo</button>
                        </div>
                    )}
                    {(status === 'searching' || status === 'connecting' || status === 'handshake') && (
                        <div>
                            <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
                                <div className="absolute inset-0 border-4 border-teal-500/30 rounded-full animate-ping"></div>
                                <RingIcon className="w-16 h-16 text-teal-500 animate-pulse" />
                            </div>
                            <p className="text-xl font-bold text-teal-400">
                                {status === 'searching' && 'Procurando...'}
                                {status === 'connecting' && 'Conectando...'}
                                {status === 'handshake' && 'Sincronizando Protocolos...'}
                            </p>
                            {status === 'handshake' && <p className="text-xs text-slate-500 mt-2">Identificando sensores...</p>}
                        </div>
                    )}
                    {status === 'found' && (
                        <div className="animate-fade-in-up bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-sm">
                            <div className="bg-slate-950 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-4 border border-slate-800"><RingIcon className="w-10 h-10 text-white" /></div>
                            <h3 className="text-xl font-bold text-white mb-1">{foundDevice?.name}</h3>
                            <p className="text-xs text-slate-500 mb-6 font-mono">{foundDevice?.id}</p>
                            <button onClick={handleConnect} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl mb-3 shadow-lg">Conectar</button>
                            <button onClick={() => setStatus('instructions')} className="text-slate-500 text-sm hover:text-white">Cancelar</button>
                        </div>
                    )}
                    {status === 'connected' && (
                        <div className="animate-fade-in text-green-400">
                            <CheckCircleIcon className="w-24 h-24 mx-auto mb-6" />
                            <h2 className="text-3xl font-bold text-white mb-2">Conectado!</h2>
                            <p className="text-slate-400">Anel pronto para uso.</p>
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="animate-fade-in">
                            <div className="w-32 h-32 bg-red-900/20 rounded-full flex items-center justify-center mb-6 mx-auto border-2 border-red-900/50"><span className="text-4xl">⚠️</span></div>
                            <h2 className="text-xl font-bold text-white mb-2">Erro</h2>
                            <p className="text-red-400 mb-8 px-4">{errorMsg || "Falha na conexão."}</p>
                            <button onClick={() => setStatus('instructions')} className="bg-slate-800 text-white font-bold py-3 px-8 rounded-xl hover:bg-slate-700">Tentar Novamente</button>
                        </div>
                    )}
                </div>

                {/* DEBUG TERMINAL OVERLAY */}
                {showDebug && (
                    <div className="absolute inset-4 bg-black/90 backdrop-blur-md rounded-2xl border border-slate-700 p-4 flex flex-col items-start text-left overflow-hidden z-20 shadow-2xl animate-fade-in-up">
                        <div className="w-full border-b border-slate-700 pb-2 mb-2 flex justify-between items-center">
                            <span className="text-xs font-mono text-green-500 font-bold">TERMINAL BLE</span>
                            <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div><div className="w-2 h-2 rounded-full bg-yellow-500"></div><div className="w-2 h-2 rounded-full bg-green-500"></div></div>
                        </div>
                        <div className="flex-1 overflow-y-auto w-full font-mono text-[10px] space-y-1 scrollbar-hide text-slate-300">
                            {logs.length === 0 && <span className="text-slate-600 italic">Aguardando dados...</span>}
                            {logs.map((log, i) => (
                                <div key={i} className="break-all border-l-2 border-slate-800 pl-2">
                                    <span className="text-slate-500 mr-2">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                                    <span className={log.includes('RX') ? 'text-green-400' : 'text-blue-400'}>{log}</span>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default ConnectDevice;
