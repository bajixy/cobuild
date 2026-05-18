'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewProject() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [stage, setStage] = useState('slab');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setLoading(true); setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not signed in'); setLoading(false); return; }

    const { data: org } = await supabase.from('organisations').select('id').eq('owner_id', user.id).single();
    if (!org) { setError('No organisation'); setLoading(false); return; }

    const { error: insertError } = await supabase.from('projects').insert({
      organisation_id: org.id, name, address, stage, status: 'active',
    });

    if (insertError) { setError(insertError.message); setLoading(false); return; }
    router.push('/b/dashboard');
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/b/dashboard" className="text-gray-600 hover:text-gray-900">←</Link>
          <h1 className="font-medium">Add project</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-6">
        <h2 className="text-xl font-medium mb-2">New project</h2>
        <p className="text-sm text-gray-600 mb-6">Quick details — you can edit later.</p>

        <label className="block text-sm font-medium mb-2">Project name</label>
        <input
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Smith Residence"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600 mb-4"
        />

        <label className="block text-sm font-medium mb-2">Site address</label>
        <input
          type="text" value={address} onChange={(e) => setAddress(e.target.value)}
          placeholder="22 Logan Rd, Brisbane"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600 mb-4"
        />

        <label className="block text-sm font-medium mb-2">Current stage</label>
        <select
          value={stage} onChange={(e) => setStage(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600 mb-6"
        >
          <option value="setup">Setup / site prep</option>
          <option value="slab">Slab</option>
          <option value="frame">Frame</option>
          <option value="lockup">Lockup</option>
          <option value="fit-out">Fit-out</option>
          <option value="handover">Handover</option>
        </select>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          onClick={save}
          disabled={loading || !name}
          className="w-full bg-brand-600 hover:bg-brand-800 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium"
        >
          {loading ? 'Saving...' : 'Create project'}
        </button>
      </main>
    </div>
  );
}
