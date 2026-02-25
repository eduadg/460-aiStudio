
import React, { useState, useEffect, useRef } from 'react';
import { RingIcon, CheckCircleIcon, HeartIcon, FireIcon, BluetoothIcon, Battery100Icon, ArrowPathIcon, BoltIcon } from '../components/icons';
import { api } from '../services/api';
import { ringService } from '../services/ringIntegration';
import { PatientSummary, RingDeviceInfo, User } from '../types';

interface FirstMeasurementProps {
    onComplete: (bpmValue: number) => void;
    user: User;
}

type Step = 'intro' | 'connecting' | 'connected' | 'instructions' | 'calibrating' | 'results';
type SensorStatus = 'waiting' | 'reading' | 'ok';

const FirstMeasurement: React.FC<FirstMeasurementProps> = ({ onComplete, user }) => {
    const [step, setStep] = useState<Step>('intro');
    const [progress, setProgress] = useState(0);
    const [device, setDevice] = useState<RingDeviceInfo | null>(null);
    const [results, setResults] = useState<PatientSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [stdServiceFound, setStdServiceFound] = useState(false);
    
    // Dados Reais
    const [realBpm, setRealBpm] = useState<number | null>(null);
    const [realSteps, setRealSteps] = useState<number>(0);
    const [realSpo2, setRealSpo2] = useState<number | null>(null);
    const [realBP, setRealBP] = useState<{sys: number, dia: number} | null>(null);

    // Checklist
    const [sensorStatus, setSensorStatus] = useState<{
        heart: SensorStatus;
        spo2: SensorStatus;
        bp: SensorStatus;
        steps: SensorStatus;
    }>({ heart: 'waiting', spo2: 'waiting', bp: 'waiting', steps: 'waiting' });

    const bpmReadingsRef = useRef<number[]>([]);
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Debug Listener
        const handleDebug = (e: CustomEvent) => {
            const { text, hex, isAscii, uuid } = e.detail;
            // Check if standard service
            if (uuid && (uuid.includes('2a37') || uuid.includes('2a19'))) {
                setStdServiceFound(true);
            }
            const msg = isAscii ? `📄 ${text}` : `📦 ${hex}`;
            setLogs(prev => [...prev.slice(-15), msg]);
        };
        
        window.addEventListener('ring-debug', handleDebug as EventListener);
        return () => window.removeEventListener('ring-debug', handleDebug as EventListener);
    }, []);

    useEffect(() => {
        if(logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const handleConnect = async () => {
        setStep('connecting');
        setError(null);
        setLogs(prev => [...prev, "Iniciando conexão..."]);
        try {
            const scannedDevice = await ringService.scanDevices();
            const result = await ringService.connectDevice({ device_mac: scannedDevice.id });
            
            if (result.success) {
                setDevice(scannedDevice);
                await api.updateDeviceStatus(true, 80);
                setStep('connected');
                setLogs(prev => [...prev, "Conectado com sucesso!"]);
            } else {
                setError("Falha ao conectar. Tente novamente.");
                setStep('intro');
            }
        } catch (e: any) {
            if (e.name !== 'NotFoundError') setError("Erro de conexão Bluetooth.");
            setStep('intro');
        }
    };

    const handleStartCalibration = async () => {
        setStep('calibrating');
        setProgress(0);
        bpmReadingsRef.current = [];
        setRealBpm(null);
        setRealSteps(0);
        setRealSpo2(null);
        setRealBP(null);
        setLogs(prev => [...prev, "Iniciando calibração..."]);
        
        setSensorStatus({ heart: 'reading', spo2: 'reading', bp: 'reading', steps: 'reading' });

        await ringService.startRealtimeStream([], (data) => {
            if (data.heartRate) {
                setRealBpm(data.heartRate);
                bpmReadingsRef.current.push(data.heartRate);
                setSensorStatus(prev => ({ ...prev, heart: 'ok' }));
            }
            if (data.steps !== undefined) {
                setRealSteps(data.steps);
                setSensorStatus(prev => ({ ...prev, steps: 'ok' }));
            }
            if (data.spo2) {
                setRealSpo2(data.spo2);
                setSensorStatus(prev => ({ ...prev, spo2: 'ok' }));
            }
            if (data.bloodPressure) {
                setRealBP(data.bloodPressure);
                setSensorStatus(prev => ({ ...prev, bp: 'ok' }));
            }
        });
    };

    useEffect(() => {
        if (step === 'calibrating') {
            const interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        finishCalibration();
                        return 100;
                    }
                    return prev + 1;
                });
            }, 80); 
            return () => clearInterval(interval);
        }
    }, [step]);

    const finishCalibration = async () => {
        await ringService.stopRealtimeStream();

        const readings = bpmReadingsRef.current;
        let finalBpmStr = '--';
        let bpmVal = 0;
        
        if (readings.length > 0) {
            const sum = readings.reduce((a, b) => a + b, 0);
            bpmVal = Math.round(sum / readings.length);
            finalBpmStr = `${bpmVal} bpm`;
        }

        const finalSummary: PatientSummary = {
            heartRate: finalBpmStr,
            steps: realSteps.toString(),
            sleep: '--', 
            calories: '0 kcal',
            spo2: realSpo2 ? `${realSpo2}%` : '--',
            bloodPressure: realBP ? `${realBP.sys}/${realBP.dia}` : '--'
        };

        await api.completeFirstMeasurement(finalSummary, 80);
        setResults(finalSummary);
        setStep('results');
    };

    const SensorItem = ({ label, status, icon, value }: { label: string, status: SensorStatus, icon: React.ReactNode, value?: string }) => (
        <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700 w-full mb-2 transition-all">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${status === 'ok' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                    {icon}
                </div>
                <div className="text-left">
                    <p className="text-sm font-bold text-slate-200">{label}</p>
                    {status === 'ok' && value && <p className="text-xs text-slate-400 font-mono">{value}</p>}
                </div>
            </div>
            <div>
                {status === 'reading' && <ArrowPathIcon className="w-5 h-5 text-blue-400 animate-spin" />}
                {status === 'ok' && <CheckCircleIcon className="w-5 h-5 text-green-400" />}
                {status === 'waiting' && <div className="w-2 h-2 bg-slate-600 rounded-full mx-1.5"></div>}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-teal-500/20 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md z-10 flex flex-col h-full">
                <div className="flex-1 flex flex-col items-center justify-center">
                    {step === 'intro' && (
                        <div className="text-center animate-fade-in-up">
                            <div className="bg-slate-800/50 p-6 rounded-full inline-flex mb-8 border border-slate-700">
                                <RingIcon className="w-16 h-16 text-slate-400" />
                            </div>
                            <h1 className="text-3xl font-bold mb-4">Bem-vindo, {user.name.split(' ')[0]}!</h1>
                            <p className="text-slate-300 text-lg mb-8">Vamos conectar seu <strong>Smart Ring</strong>.</p>
                            {error && <div className="mb-6 p-3 bg-red-500/20 rounded-lg text-sm text-red-300">{error}</div>}
                            <button onClick={handleConnect} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3">
                                <BluetoothIcon className="w-6 h-6" /> Conectar Anel
                            </button>
                        </div>
                    )}

                    {step === 'connecting' && (
                         <div className="text-center">
                            <div className="relative w-32 h-32 mx-auto flex items-center justify-center mb-8">
                                <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                                <BluetoothIcon className="w-12 h-12 text-blue-500" />
                            </div>
                            <h2 className="text-xl font-bold">Buscando Dispositivo...</h2>
                        </div>
                    )}

                    {step === 'connected' && (
                        <div className="text-center animate-fade-in">
                             <div className="bg-green-500/20 p-4 rounded-full inline-flex mb-6"><CheckCircleIcon className="w-12 h-12 text-green-400" /></div>
                            <h2 className="text-2xl font-bold mb-2">{device?.name || 'Anel Conectado'}</h2>
                            <button onClick={() => setStep('instructions')} className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-4 rounded-xl mt-8">Continuar</button>
                        </div>
                    )}

                    {step === 'instructions' && (
                         <div className="text-center animate-fade-in-up">
                            <h2 className="text-2xl font-bold mb-6">Calibração</h2>
                            <p className="text-slate-300 mb-8">Fique quieto por alguns segundos para uma leitura precisa de todos os sensores.</p>
                            <button onClick={handleStartCalibration} className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl shadow-lg">Iniciar</button>
                        </div>
                    )}

                    {step === 'calibrating' && (
                        <div className="text-center flex flex-col items-center w-full">
                            <div className="relative w-40 h-40 mb-6 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="80" cy="80" r="70" stroke="#334155" strokeWidth="6" fill="transparent" />
                                    <circle cx="80" cy="80" r="70" stroke="#14b8a6" strokeWidth="6" fill="transparent" strokeDasharray={2 * Math.PI * 70} strokeDashoffset={2 * Math.PI * 70 * (1 - progress / 100)} className="transition-all duration-100 ease-linear" />
                                </svg>
                                <div className="absolute text-3xl font-bold font-mono">{progress}%</div>
                            </div>
                            
                            {stdServiceFound && (
                                <div className="mb-4 px-3 py-1 bg-blue-900/30 text-blue-300 text-xs font-bold rounded-full flex items-center gap-2 border border-blue-500/30 animate-pulse">
                                    <BoltIcon className="w-3 h-3" /> Protocolo Padrão Detectado
                                </div>
                            )}

                            <div className="w-full max-w-sm space-y-1">
                                <SensorItem label="Frequência Cardíaca" status={sensorStatus.heart} icon={<HeartIcon className="w-5 h-5"/>} value={realBpm ? `${realBpm} bpm` : ''} />
                                <SensorItem label="Oxigenação (SpO2)" status={sensorStatus.spo2} icon={<RingIcon className="w-5 h-5"/>} value={realSpo2 ? `${realSpo2}%` : ''} />
                                <SensorItem label="Pressão Arterial" status={sensorStatus.bp} icon={<HeartIcon className="w-5 h-5"/>} value={realBP ? `${realBP.sys}/${realBP.dia}` : ''} />
                                <SensorItem label="Atividade" status={sensorStatus.steps} icon={<FireIcon className="w-5 h-5"/>} value={realSteps > 0 ? `${realSteps}` : ''} />
                            </div>
                        </div>
                    )}

                    {step === 'results' && results && (
                        <div className="text-center animate-fade-in-up w-full">
                            <h2 className="text-2xl font-bold mb-6">Resultados</h2>
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-slate-800 p-4 rounded-xl"><p className="text-slate-400 text-xs">BPM</p><p className="text-xl font-bold">{results.heartRate}</p></div>
                                <div className="bg-slate-800 p-4 rounded-xl"><p className="text-slate-400 text-xs">SpO2</p><p className="text-xl font-bold">{results.spo2}</p></div>
                                <div className="bg-slate-800 p-4 rounded-xl"><p className="text-slate-400 text-xs">Pressão</p><p className="text-xl font-bold">{results.bloodPressure}</p></div>
                                <div className="bg-slate-800 p-4 rounded-xl"><p className="text-slate-400 text-xs">Passos</p><p className="text-xl font-bold">{results.steps}</p></div>
                            </div>
                            <button onClick={() => { const bpm = parseInt(results.heartRate.replace(/\D/g, '')) || 0; onComplete(bpm); }} className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl">Finalizar</button>
                        </div>
                    )}
                </div>

                {/* DEBUG CONSOLE */}
                {(step === 'connecting' || step === 'calibrating') && (
                    <div className="mt-6 w-full max-w-sm bg-black/50 p-3 rounded-lg border border-slate-700/50 font-mono text-[10px] text-green-400/80 h-32 overflow-y-auto" ref={logContainerRef}>
                        <p className="text-xs text-slate-500 mb-1 border-b border-slate-700 pb-1">PROTOCOL DEBUG LOG</p>
                        {logs.map((log, i) => (
                            <div key={i} className="whitespace-nowrap">{log}</div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FirstMeasurement;
