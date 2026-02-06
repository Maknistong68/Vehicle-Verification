import type { NextConfig } from "next";

// Debug: log env var availability during build
console.log('[VVS1 Build] NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET ✓' : 'MISSING ✗');
console.log('[VVS1 Build] NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET ✓' : 'MISSING ✗');
console.log('[VVS1 Build] SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET ✓' : 'MISSING ✗');
console.log('[VVS1 Build] SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET ✓' : 'MISSING ✗');

const nextConfig: NextConfig = {
  // Explicitly pass env vars to ensure they're inlined at build time
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  },
};

export default nextConfig;
