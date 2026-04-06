import { createClient } from '@supabase/supabase-js';

// Hardcoding the keys directly to avoid Next.js build-time env var replacement issues
const supabaseUrl = 'https://zkuikrrmbrlzstjrityd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprdWlrcnJtYnJsenN0anJpdHlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDgyOTAsImV4cCI6MjA5MDkyNDI5MH0.wPTUSrJ7tW-UtsItxZMe6Trdt196iebzbz32n111omc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
