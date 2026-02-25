
import { api } from './api';

const DB_NAME = 'DrX_DB';
const DB_VERSION = 1;
const STORES = {
    CHAT: 'chat_history',
    MEASURES: 'measures',
    MEALS: 'meals',
    PROFILE: 'profile'
};

const QUEUE_KEY = 'drx_sync_queue';

interface SyncItem {
    id: string;
    type: 'SEND_CHAT' | 'SAVE_MEAL' | 'SAVE_MEASURE';
    payload: any;
    timestamp: number;
}

class OfflineService {
    private db: IDBDatabase | null = null;
    private isSyncing = false;

    constructor() {
        this.initDB();
        window.addEventListener('online', () => this.processQueue());
        // Tenta processar ao iniciar, caso tenha pendências
        setTimeout(() => this.processQueue(), 5000);
    }

    // --- INDEXED DB (CACHE DE LEITURA) ---

    private async initDB() {
        return new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error("OfflineDB error");
                reject();
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                // Create stores if they don't exist
                if (!db.objectStoreNames.contains(STORES.CHAT)) db.createObjectStore(STORES.CHAT, { keyPath: 'id', autoIncrement: true }); // Chat messages usually have unique IDs from server, but local might need auto
                if (!db.objectStoreNames.contains(STORES.MEASURES)) db.createObjectStore(STORES.MEASURES, { keyPath: 'id' });
                if (!db.objectStoreNames.contains(STORES.MEALS)) db.createObjectStore(STORES.MEALS, { keyPath: 'id' });
                if (!db.objectStoreNames.contains(STORES.PROFILE)) db.createObjectStore(STORES.PROFILE, { keyPath: 'id' });
            };
        });
    }

    public async cacheData(storeName: string, data: any[]) {
        if (!this.db) await this.initDB();
        return new Promise<void>((resolve, reject) => {
            const transaction = this.db!.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Simples: Limpa e reescreve (para listas completas) ou merge inteligente
            // Para simplicidade deste protótipo, vamos limpar e adicionar os novos (cache first strategy)
            store.clear().onsuccess = () => {
                data.forEach(item => {
                    // Ensure item has ID if store requires it
                    if(!item.id && storeName === STORES.CHAT) item.id = `local_${Date.now()}_${Math.random()}`;
                    store.put(item);
                });
            };

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject();
        });
    }

    public async getCachedData<T>(storeName: string): Promise<T[]> {
        if (!this.db) await this.initDB();
        return new Promise<T[]>((resolve) => {
            const transaction = this.db!.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result as T[]);
            request.onerror = () => resolve([]);
        });
    }

    // --- SYNC QUEUE (ESCRITA OFFLINE) ---

    public addToQueue(type: SyncItem['type'], payload: any) {
        const queue: SyncItem[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        const item: SyncItem = {
            id: `${Date.now()}-${Math.random()}`,
            type,
            payload,
            timestamp: Date.now()
        };
        queue.push(item);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        
        // Notifica UI que estamos "Pending"
        window.dispatchEvent(new CustomEvent('sync-status-change', { detail: { pending: queue.length } }));
        
        // Tenta enviar imediatamente se estiver online (Optimistic try)
        if (navigator.onLine) this.processQueue();
    }

    public async processQueue() {
        if (this.isSyncing || !navigator.onLine) return;
        
        const queueStr = localStorage.getItem(QUEUE_KEY);
        if (!queueStr) return;

        const queue: SyncItem[] = JSON.parse(queueStr);
        if (queue.length === 0) return;

        this.isSyncing = true;
        console.log(`[Sync] Processando ${queue.length} itens...`);

        const failedItems: SyncItem[] = [];

        for (const item of queue) {
            try {
                switch (item.type) {
                    case 'SEND_CHAT':
                        // Chama a API original (que agora deve ter bypass de verificação de erro para não loopar)
                        await api.saveChatMessage(item.payload, undefined, true); 
                        break;
                    case 'SAVE_MEAL':
                        await api.saveMeal(item.payload, true);
                        break;
                    case 'SAVE_MEASURE':
                        await api.saveSingleMeasure(item.payload.type, item.payload.value, true);
                        break;
                }
            } catch (e) {
                console.warn(`[Sync] Falha no item ${item.id}`, e);
                // Se o erro for de rede, mantém na fila. Se for lógica (400), descarta?
                // Por segurança, mantemos na fila para retry posterior se for rede
                failedItems.push(item);
            }
        }

        localStorage.setItem(QUEUE_KEY, JSON.stringify(failedItems));
        this.isSyncing = false;
        
        window.dispatchEvent(new CustomEvent('sync-status-change', { detail: { pending: failedItems.length } }));
        
        if (failedItems.length === 0) {
            console.log("[Sync] Sincronização completa!");
        }
    }
    
    public getQueueSize(): number {
        const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        return queue.length;
    }
}

export const offlineService = new OfflineService();
export const STORES_CONST = STORES;
