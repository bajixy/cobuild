'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AuthDebugPage() {
  const supabase = createClient();
  const [output, setOutput] = useState('checking...');

  useEffect(() => {
    async function run() {
      const lines = [] as string[];
      const sessionResult = await supabase.auth.getSession();
      const userResult = await supabase.auth.getUser();
      lines.push(`session: ${sessionResult.data.session ? 'yes' : 'no'}`);
      lines.push(`user: ${userResult.data.user ? 'yes' : 'no'}`);
      lines.push(`email: ${userResult.data.user?.email || 'none'}`);
      lines.push(`metadata role: ${userResult.data.user?.user_metadata?.role || 'none'}`);

      if (userResult.data.user) {
        const profileResult = await supabase
          .from('profiles')
          .select('id, email, full_name, role')
          .eq('id', userResult.data.user.id)
          .maybeSingle();
        lines.push(`profile error: ${profileResult.error?.message || 'none'}`);
        lines.push(`profile role: ${profileResult.data?.role || 'none'}`);
      }

      setOutput(lines.join('\n'));
    }
    run();
  }, []);

  return (
    <main className="min-h-screen bg-white p-8 text-black">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold">auth debug</h1>
        <pre className="mt-6 whitespace-pre-wrap rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-sm leading-6">{output}</pre>
      </div>
    </main>
  );
}
