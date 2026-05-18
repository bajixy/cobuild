'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { TradeType } from '@/lib/types';

const TRADES: TradeType[] = ['formwork', 'carpentry', 'concrete', 'plumbing', 'electrical', 'tiling', 'painting', 'roofing', 'plastering', 'general_labour'];

export default function WorkersPage() {
  const supabase = createClient();
  const [workers, setWorkers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [trades, setTrades] = useState<TradeType[]>([]);
  const [years, setYears] = useState('');
  const [rate, setRate] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('workers').select('*').eq('crew_leader_id', user.id).order('full_name');
    setWorkers(data || []);
    setLoading(false);
  }

  async function addWorker() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !name || !phone) return;

    await supabase.from('workers').insert({
      crew_leader_id: user.id,
      full_name: name,
      phone,
      trade_specialty: trades,
      experience_years: years ? parseInt(years) : 0,
      typical_rate: rate ? parseFloat(rate) : null,
      status: 'active',
    });

    setName(''); setPhone(''); setTrades([]); setYears(''); setRate('');
    setShowAdd(false);
    load();
  }

  function toggleTrade(t: TradeType) {
    setTrades(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/cl/dashboard" className="text-gray-600 hover:text-gray-900">←</Link>
          <h1 className="font-medium">My worker network</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-2xl font-medium">{workers.length} workers</div>
            <div className="text-sm text-gray-600">Your trusted network</div>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="bg-brand-600 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {showAdd ? 'Cancel' : '+ Add worker'}
          </button>
        </div>

        {showAdd && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <h3 className="font-medium mb-4">Add to network</h3>

            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Worker's name"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600 mb-3" />

            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+61 4 1234 5678"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600 mb-3" />

            <div className="mb-3">
              <label className="block text-sm font-medium mb-2">Trades</label>
              <div className="flex flex-wrap gap-2">
                {TRADES.map(t => (
                  <button key={t} onClick={() => toggleTrade(t)}
                    className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                      trades.includes(t) ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}>
                    {t.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Years experience</label>
                <input type="number" value={years} onChange={e => setYears(e.target.value)} placeholder="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Typical rate $/hr</label>
                <input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="55"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>

            <button
              onClick={addWorker}
              disabled={!name || !phone}
              className="w-full bg-brand-600 hover:bg-brand-800 disabled:bg-gray-300 text-white py-2.5 rounded-lg font-medium"
            >
              Add worker
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading...</div>
        ) : workers.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">👥</div>
            <div className="font-medium mb-1">No workers yet</div>
            <div className="text-sm text-gray-600 mb-4">Add your trusted workers so you can place them on jobs.</div>
            <button onClick={() => setShowAdd(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Add your first worker
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {workers.map(w => (
              <div key={w.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{w.full_name}</div>
                    <div className="text-sm text-gray-600">{w.phone}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {(w.trade_specialty || []).join(', ') || 'General'}
                      {w.experience_years > 0 && ` · ${w.experience_years}yr`}
                      {w.typical_rate && ` · $${w.typical_rate}/hr`}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${w.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {w.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
