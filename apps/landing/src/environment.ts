export const environment = {
  apiUrl: import.meta.env.VITE_API_URL || 'https://api.arbi.creai.dev',
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://rsaayhbscztgvojhoxia.supabase.co',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzYWF5aGJzY3p0Z3ZvamhveGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMTEyMzIsImV4cCI6MjA4NDc4NzIzMn0.1zcLB-Ny-0_mlA-66lx9XYxfxfTxq-0NB9D-hXcTe0Y'
  }
};
