import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://jbvkygeksohlysyvaoab.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impidmt5Z2Vrc29obHlzeXZhb2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTk5NjgsImV4cCI6MjA5MTk3NTk2OH0.6RSgChy0Yq0H2TJpZPSoMKQ2V-OYfR0XzE1aJBBZkXI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export { SUPABASE_URL, SUPABASE_ANON };
