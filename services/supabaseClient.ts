
import { createClient } from '@supabase/supabase-js';

// Credenciais do Projeto Supabase Dr. X Google
const SUPABASE_URL = 'https://cpzwplsgttfwhyzlhana.supabase.co';
const SUPABASE_KEY = 'sb_publishable_AiTIW9Zvf4VJryUbnJFXKw_MTXCzpPh';

// Inicializa o cliente Supabase com as chaves fornecidas
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Funções auxiliares mantidas apenas para compatibilidade de interface, 
// mas agora retornam sempre true pois a configuração é estática.
export const isSupabaseConfigured = () => true;

export const configureSupabase = (url: string, key: string) => {
  console.log("Configuração via código já aplicada.");
};

export const resetSupabaseConfig = () => {
  console.log("Configuração via código não pode ser resetada.");
};
