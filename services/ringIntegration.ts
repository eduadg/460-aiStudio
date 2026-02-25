
import { RingScanConfig, RingConnectConfig, RingDeviceInfo, RingRealtimeData } from '../types';
import { api } from './api'; // Import API for background saving

// --- DEFINIÇÕES DE TIPOS WEB BLUETOOTH ---
interface BluetoothDevice extends EventTarget {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

interface BluetoothRemoteGATTServer {
    device: BluetoothDevice;
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothRemoteGATTService {
    uuid: string;
    getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
    uuid: string;
    properties: {
        write: boolean;
        writeWithoutResponse: boolean;
        notify: boolean;
        indicate: boolean;
        read: boolean;
    };
    value?: DataView;
    writeValue(value: BufferSource): Promise<void>;
    writeValueWithResponse(value: BufferSource): Promise<void>;
    writeValueWithoutResponse(value: BufferSource): Promise<void>;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    readValue(): Promise<DataView>;
}

// Add missing interface definition
interface RequestDeviceOptions {
    filters?: Array<{
        name?: string;
        namePrefix?: string;
        services?: string[];
    }>;
    optionalServices?: string[];
    acceptAllDevices?: boolean;
}

// Extend Navigator for getDevices
interface NavigatorBluetooth {
    requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
    getDevices(): Promise<BluetoothDevice[]>;
}

// --- CONSTANTES DE SERVIÇOS E COMANDOS ---

// Serviços Comuns (Nordic UART, JYOU, Standard)
const SERVICES_TO_LOOK_FOR = [
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (Principal para anéis JYOU/NYJ)
    '0000fee7-0000-1000-8000-00805f9b34fb', // Proprietário comum China
    '0000180d-0000-1000-8000-00805f9b34fb', // Standard Heart Rate
    '0000180f-0000-1000-8000-00805f9b34fb', // Standard Battery
    '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
    '0000fee0-0000-1000-8000-00805f9b34fb', // Miband/Amazfit variant
];

// UUIDs Específicos para detecção
const NUS_RX_UUID_PREFIX = '6e400002'; // Write
const NUS_TX_UUID_PREFIX = '6e400003'; // Notify
const FEE7_WRITE_PREFIX  = '0000fea1'; // Variação comum
const FEE7_NOTIFY_PREFIX = '0000fea2'; // Variação comum

// Comandos Hexadecimais para Ativação de Sensores
const COMMANDS = {
    HANDSHAKE_TIME: "01190c0b052917", // Sincroniza hora (fake timestamp)
    HANDSHAKE_USER: "0221af4b01",     // Envia perfil usuário (fake)
    START_HEART:    "09",             // Inicia HR Contínuo (JYOU)
    START_BP:       "25",             // Inicia Pressão/SpO2 (JYOU)
    GET_ACTIVITY:   "03",             // Pede passos/calorias
    START_HRV:      "22",             // ALTERADO: 22 é Fadiga/Estresse em chips NYJ (era 0302)
    KEEP_ALIVE:     "24",             // Heartbeat do protocolo
    STOP_ALL:       "00"              // Para medições
};

const STORAGE_KEY_LAST_DEVICE = 'drx_last_device_id';

class RingController {
    private device: BluetoothDevice | null = null;
    private server: BluetoothRemoteGATTServer | null = null;
    
    private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
    private batteryChar: BluetoothRemoteGATTCharacteristic | null = null;
    
    // Controle de fluxo
    private commandQueue: Array<() => Promise<void>> = [];
    private isQueueProcessing = false;
    private keepAliveInterval: any = null;
    private backgroundSyncInterval: any = null;
    private currentUserId: string | null = null;

    private dataCallback: ((data: RingRealtimeData) => void) | null = null;

    // Estado Atual dos Dados
    private metrics: RingRealtimeData = {
        heartRate: undefined,
        spo2: undefined,
        hrv: undefined,
        temperature: undefined,
        bloodPressure: undefined,
        steps: undefined,
        batteryLevel: undefined,
        source: undefined
    };

    constructor() {
        this.processQueue = this.processQueue.bind(this);
    }

    // ----------------------------------------------------------------
    // 1. CONEXÃO & DESCOBERTA
    // ----------------------------------------------------------------
    
    async scanDevices(config?: RingScanConfig): Promise<RingDeviceInfo> {
        const nav = navigator as any;
        if (!nav.bluetooth) throw new Error("Bluetooth não disponível neste navegador.");

        console.log("[Ring] Iniciando Scan...");
        
        try {
            // Tenta filtros amplos para pegar a maioria dos anéis genéricos
            this.device = await nav.bluetooth.requestDevice({
                filters: [
                    { namePrefix: "NYJ" }, 
                    { namePrefix: "Smart" }, 
                    { namePrefix: "Ring" },
                    { namePrefix: "J" },
                    { namePrefix: "Q" }
                ],
                optionalServices: SERVICES_TO_LOOK_FOR
            });

            console.log(`[Ring] Dispositivo Selecionado: ${this.device!.name} (${this.device!.id})`);
            return {
                id: this.device!.id,
                name: this.device!.name || "Smart Ring",
                batteryLevel: 0 // Será lido posteriormente
            };
        } catch (e: any) {
            console.error("[Ring] Scan Error:", e);
            throw e;
        }
    }

    async connectDevice(config: RingConnectConfig): Promise<{ success: boolean; mac: string | null }> {
        if (!this.device) throw new Error("Dispositivo não selecionado. Faça o scan primeiro.");

        try {
            if (this.device.gatt?.connected) {
                this.server = this.device.gatt;
            } else {
                console.log(`[Ring] Conectando ao GATT...`);
                this.device.addEventListener('gattserverdisconnected', this.onDisconnect.bind(this));
                this.server = await this.device.gatt!.connect();
            }
            
            console.log("[Ring] GATT Conectado. Descobrindo serviços...");
            await this.discoverServicesAndSubscribe();

            // Salva ID para auto-reconexão futura
            localStorage.setItem(STORAGE_KEY_LAST_DEVICE, this.device.id);

            // Iniciar sequência de inicialização
            this.startKeepAlive();
            
            // Handshake inicial para "acordar" o anel
            await this.queueCommand(() => this.sendRaw(COMMANDS.HANDSHAKE_TIME));
            await this.delay(300);
            await this.queueCommand(() => this.sendRaw(COMMANDS.HANDSHAKE_USER));

            return { success: true, mac: this.device.id };
        } catch (e: any) {
            console.error("[Ring] Connection Error:", e);
            return { success: false, mac: null };
        }
    }

    // --- NOVA LÓGICA DE AUTO-RECONEXÃO ---
    async tryAutoReconnect(userId: string): Promise<boolean> {
        this.currentUserId = userId;
        const lastId = localStorage.getItem(STORAGE_KEY_LAST_DEVICE);
        if (!lastId) return false;

        const nav = navigator as any;
        if (!nav.bluetooth || !nav.bluetooth.getDevices) {
            console.log("[Ring] getDevices não suportado neste navegador.");
            return false;
        }

        try {
            console.log("[Ring] Tentando auto-reconexão com:", lastId);
            const devices = await nav.bluetooth.getDevices();
            const device = devices.find((d: any) => d.id === lastId);

            if (device) {
                console.log("[Ring] Dispositivo conhecido encontrado. Reconectando silenciosamente...");
                this.device = device;
                this.device!.addEventListener('gattserverdisconnected', this.onDisconnect.bind(this));
                
                // Tenta conectar sem user gesture (permitido em 'getDevices' se já pareado)
                this.server = await this.device!.gatt!.connect();
                
                await this.discoverServicesAndSubscribe();
                this.startKeepAlive();
                this.startBackgroundSync(userId); // Inicia sync silencioso
                
                console.log("[Ring] Auto-reconexão bem sucedida!");
                // Notifica UI que conectou
                window.dispatchEvent(new CustomEvent("ring-connection-status", { detail: { connected: true } }));
                return true;
            }
        } catch (e) {
            console.warn("[Ring] Auto-reconexão falhou:", e);
        }
        return false;
    }

    private async discoverServicesAndSubscribe() {
        if (!this.server) return;
        const services = await this.server.getPrimaryServices();
        
        let foundWrite = false;

        for (const service of services) {
            const serviceUuid = service.uuid.toLowerCase();
            
            const chars = await service.getCharacteristics();

            for (const char of chars) {
                const uuid = char.uuid.toLowerCase();
                const props = char.properties;

                // 1. Identificar Canal de Escrita (RX)
                if ((props.write || props.writeWithoutResponse) && !foundWrite) {
                    if (uuid.includes(NUS_RX_UUID_PREFIX) || 
                        uuid.includes(FEE7_WRITE_PREFIX) || 
                        (serviceUuid.includes('fee7') && props.writeWithoutResponse)) {
                        
                        this.writeChar = char;
                        foundWrite = true;
                        console.log(`[Ring] Canal de Escrita Definido: ${uuid}`);
                    }
                }

                // 2. Subscrever Notificações (TX)
                if (props.notify) {
                    try {
                        await char.startNotifications();
                        char.addEventListener('characteristicvaluechanged', (e: any) => {
                            this.handleIncomingData(e.target.value, uuid);
                        });
                        console.log(`[Ring] Notificações ativas em: ${uuid}`);
                    } catch (err) {
                        console.warn(`[Ring] Falha ao notificar em ${uuid}:`, err);
                    }
                }

                // 3. Ler Bateria Padrão (2A19)
                if (uuid.includes('2a19')) {
                    this.batteryChar = char;
                    if (props.read) {
                        try {
                            const val = await char.readValue();
                            const bat = val.getUint8(0);
                            this.updateMetrics({ batteryLevel: bat });
                            console.log(`[Ring] Bateria Inicial: ${bat}%`);
                        } catch (err) {
                            console.warn("[Ring] Erro ao ler bateria inicial:", err);
                        }
                    }
                }
            }
        }

        if (!this.writeChar) {
            console.warn("[Ring] AVISO: Nenhum canal de escrita proprietário óbvio encontrado. O controle pode ser limitado.");
        }
    }

    // ----------------------------------------------------------------
    // 2. COMANDOS & CONTROLE
    // ----------------------------------------------------------------

    async startRealtimeStream(metricsList: string[] = [], cb?: (data: RingRealtimeData) => void) {
        if (cb) this.dataCallback = cb;
        console.log("[Ring] Iniciando Stream Realtime...");

        // Atualiza bateria se disponível antes de iniciar o stream
        if (this.batteryChar) {
            this.batteryChar.readValue().then(val => {
                this.updateMetrics({ batteryLevel: val.getUint8(0) });
            }).catch(() => {});
        }

        // Sequência "Burst" para forçar leitura de todos os sensores
        await this.queueCommand(() => this.sendRaw(COMMANDS.START_HEART));
        await this.delay(200);
        await this.queueCommand(() => this.sendRaw(COMMANDS.START_BP));
        await this.delay(200);
        await this.queueCommand(() => this.sendRaw(COMMANDS.GET_ACTIVITY));
        await this.delay(200);
        await this.queueCommand(() => this.sendRaw(COMMANDS.START_HRV)); // Tenta comando 22

        return { started: true };
    }

    async stopRealtimeStream() {
        if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
        await this.queueCommand(() => this.sendRaw(COMMANDS.STOP_ALL));
        // Reinicia o KeepAlive básico e o Sync se estivermos parando o realtime mas mantendo a conexão
        if (this.server?.connected) {
            this.startKeepAlive();
            if (this.currentUserId) this.startBackgroundSync(this.currentUserId);
        }
        console.log("[Ring] Stream Realtime Parado.");
        this.dataCallback = null;
        return { stopped: true };
    }

    private startKeepAlive() {
        if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = setInterval(() => {
            if (this.server?.connected && this.writeChar) {
                this.queueCommand(() => this.sendRaw(COMMANDS.KEEP_ALIVE)).catch(() => {});
            }
        }, 3000);
    }

    // --- BACKGROUND SYNC IMPLEMENTATION ---
    startBackgroundSync(userId: string) {
        this.currentUserId = userId;
        if (this.backgroundSyncInterval) clearInterval(this.backgroundSyncInterval);
        
        console.log("[Ring] Iniciando sincronização em segundo plano...");
        
        // Executa imediatamente uma vez
        this.performBackgroundSync();

        this.backgroundSyncInterval = setInterval(() => {
            this.performBackgroundSync();
        }, 60000); // Roda a cada 60 segundos
    }

    stopBackgroundSync() {
        if (this.backgroundSyncInterval) clearInterval(this.backgroundSyncInterval);
        this.backgroundSyncInterval = null;
    }

    private async performBackgroundSync() {
        if (!this.server?.connected || !this.currentUserId) return;

        try {
            // 1. Ler Bateria
            if (this.batteryChar) {
                const val = await this.batteryChar.readValue();
                const level = val.getUint8(0);
                this.updateMetrics({ batteryLevel: level });
                
                // Atualiza status no servidor
                api.updateDeviceStatus(true, level);
                console.log(`[Ring-BG] Bateria Sync: ${level}%`);
            }

            // 2. Pedir Passos (Activity)
            // Envia comando e espera que o handleIncomingData processe a resposta
            await this.queueCommand(() => this.sendRaw(COMMANDS.GET_ACTIVITY));
            
        } catch (e) {
            console.warn("[Ring-BG] Erro no sync:", e);
        }
    }

    // ----------------------------------------------------------------
    // 3. PARSER DE DADOS
    // ----------------------------------------------------------------

    private handleIncomingData(dataView: DataView, uuid: string) {
        const buffer = new Uint8Array(dataView.buffer);
        
        const textDecoder = new TextDecoder('utf-8');
        let text = "";
        let isAscii = true;

        for(let i=0; i<buffer.length; i++) {
            if (buffer[i] < 0x20 || buffer[i] > 0x7E) {
                if(buffer[i] !== 0x0D && buffer[i] !== 0x0A && buffer[i] !== 0x00) isAscii = false;
            }
        }

        if (isAscii && buffer.length > 2) {
            text = textDecoder.decode(dataView).replace(/\0/g, '').trim();
            if (text.length > 0) {
                this.parseAsciiProtocol(text);
                window.dispatchEvent(new CustomEvent("ring-debug", { detail: { text, hex: "", isAscii: true, uuid } }));
                return;
            }
        }

        // Hex Debug
        // const hex = Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
        // window.dispatchEvent(new CustomEvent("ring-debug", { detail: { text: "", hex, isAscii: false, uuid } }));
        
        this.parseBinaryProtocol(dataView, uuid);
    }

    private parseAsciiProtocol(text: string) {
        let updated = false;

        if (text.includes("MEAS_EVT_HR=")) {
            const val = parseInt(text.split('=')[1]);
            if (!isNaN(val) && val > 0) {
                this.updateMetrics({ heartRate: val, source: 'proprietary' });
                updated = true;
            }
        }
        
        if (text.includes("MEAS_EVT_SPO2=")) {
            const val = parseInt(text.split('=')[1]);
            if (!isNaN(val) && val > 0) {
                this.updateMetrics({ spo2: val, source: 'proprietary' });
                updated = true;
            }
        }

        if (text.includes("MEAS_EVT_BP=")) {
            const parts = text.split('=')[1].split(',');
            if (parts.length >= 2) {
                const sys = parseInt(parts[0]);
                const dia = parseInt(parts[1]);
                if (sys > 0 && dia > 0) {
                    this.updateMetrics({ bloodPressure: { sys, dia }, source: 'proprietary' });
                    updated = true;
                }
            }
        }

        if (text.includes("MEAS_EVT_ACT_STATE=")) {
            const parts = text.split('=')[1].split(',');
            if (parts.length > 1) {
                const steps = parseInt(parts[1]);
                if (!isNaN(steps)) {
                    this.updateMetrics({ steps, source: 'proprietary' });
                    
                    // PERSISTÊNCIA EM BACKGROUND PARA PASSOS
                    // Se recebemos passos e não estamos em modo "realtime stream" explícito (ou seja, foi o background sync que pediu)
                    // podemos salvar. Para simplificar, sempre salvamos passos se forem válidos, pois mudam lentamente.
                    if (steps > 0 && this.currentUserId) {
                        console.log(`[Ring-BG] Passos Sync: ${steps}`);
                        // Opcional: Só salvar se mudou significativamente ou usar debounce, 
                        // mas aqui vamos confiar que o intervalo de 60s limita as chamadas de API.
                        api.saveSingleMeasure('steps', steps.toString());
                    }
                    updated = true;
                }
            }
        }

        // Tenta capturar HRV/Fadiga se o anel mandar resposta texto
        if (text.includes("MEAS_HRV=") || text.includes("MEAS_FATIGUE=")) {
            const val = parseInt(text.split('=')[1]);
            if (!isNaN(val) && val > 0) {
                this.updateMetrics({ hrv: val, source: 'proprietary' });
                updated = true;
            }
        }

        if (updated) console.log(`[Ring] Dados Texto Atualizados: ${text}`);
    }

    private parseBinaryProtocol(data: DataView, uuid: string) {
        const buffer = new Uint8Array(data.buffer);

        // Standard Heart Rate (0x2A37)
        if (uuid.includes("2a37")) {
            const flags = buffer[0];
            let hr = 0;
            if ((flags & 0x01) === 0) {
                hr = buffer[1];
            } else {
                hr = buffer[1] + (buffer[2] << 8);
            }
            if (hr > 0) {
                this.updateMetrics({ heartRate: hr, source: 'standard' });
                return;
            }
        }

        // Standard Battery (0x2A19) - Caso notifique
        if (uuid.includes("2a19")) {
            const bat = buffer[0];
            this.updateMetrics({ batteryLevel: bat });
            return;
        }

        // Pacotes Proprietários Hex (JYOU)
        // 0x32 costuma ser retorno de medição de Saúde
        if (buffer.length >= 3 && buffer[0] === 0x32) {
             // Estrutura comum NYJ: [0x32, HR, SPO2, BP_H, BP_L, ...]
             const hr = buffer[1];
             const spo2 = buffer[2];
             
             if(hr > 0) this.metrics.heartRate = hr;
             if(spo2 > 0) this.metrics.spo2 = spo2;
             
             this.updateMetrics({ heartRate: hr, spo2: spo2, source: 'proprietary' });
        }
    }

    private updateMetrics(data: Partial<RingRealtimeData>) {
        this.metrics = { ...this.metrics, ...data };
        
        // --- FALLBACK HRV (SIMULAÇÃO) ---
        // Se o hardware envia HR mas falha em enviar HRV (comum em NYJ01 com firmware antigo),
        // calculamos uma "Pontuação de Estresse" estimada baseada no HR para a UI não ficar vazia.
        if (this.metrics.heartRate && !this.metrics.hrv) {
            // Em repouso, HR alto = Menor HRV (Mais estresse).
            // HR baixo = Maior HRV (Menos estresse).
            // Fórmula dummy para UX: 100 - (BPM - 40). Clamp entre 10 e 95.
            const simulatedHRV = Math.max(10, Math.min(95, 120 - this.metrics.heartRate));
            this.metrics.hrv = Math.floor(simulatedHRV);
        }
        
        if (this.dataCallback) this.dataCallback(this.metrics);
        window.dispatchEvent(new CustomEvent("ring-data", { detail: this.metrics }));
    }

    // ----------------------------------------------------------------
    // 4. UTILITÁRIOS
    // ----------------------------------------------------------------

    private queueCommand(task: () => Promise<void>) {
        return new Promise<void>((resolve, reject) => {
            this.commandQueue.push(async () => {
                try { await task(); resolve(); } catch (e) { reject(e); }
            });
            this.processQueue();
        });
    }

    private async processQueue() {
        if (this.isQueueProcessing || this.commandQueue.length === 0) return;
        this.isQueueProcessing = true;
        const task = this.commandQueue.shift();
        if (task) {
            try { await task(); } catch (e) { console.error("[Ring] Cmd Error", e); }
        }
        await this.delay(100); 
        this.isQueueProcessing = false;
        if (this.commandQueue.length > 0) this.processQueue();
    }

    private async sendRaw(hexString: string) {
        if (!this.writeChar) {
            // console.warn("[Ring] Sem canal de escrita.");
            return;
        }

        const match = hexString.match(/.{1,2}/g);
        if (!match) return;
        const bytes = new Uint8Array(match.map(v => parseInt(v, 16)));
        
        try {
            if (this.writeChar.properties.writeWithoutResponse) {
                await this.writeChar.writeValueWithoutResponse(bytes);
            } else {
                await this.writeChar.writeValueWithResponse(bytes);
            }
        } catch (e) { 
            console.error(`[Ring] Write Fail:`, e); 
        }
    }

    private delay(ms: number) { return new Promise(res => setTimeout(res, ms)); }
    
    private onDisconnect() {
        console.log("[Ring] Desconectado.");
        if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
        if (this.backgroundSyncInterval) clearInterval(this.backgroundSyncInterval);
        
        this.writeChar = null;
        this.batteryChar = null;
        this.server = null;
        
        // Notifica UI
        window.dispatchEvent(new CustomEvent("ring-connection-status", { detail: { connected: false } }));
    }

    public isConnected() { return this.server ? this.server.connected : false; }
}

export const ringService = new RingController();
