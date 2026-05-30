'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get('role') as 'builder' | 'crew_leader') || 'builder';

  const supabase = createClient();
  const [role, setRole] = useState<'builder' | 'crew_leader'>(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [orgName, setOrgName] = useState('');
  const [city, setCity] = useState('Brisbane');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function startSignup() {
    setLoading(true);
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role,
          phone: cleanPhone,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    if (!user) {
      setError('Signup started. Check your email to confirm your account, then log in.');
      setLoading(false);
      return;
    }

    await supabase
      .from('profiles')
      .update({ phone: cleanPhone, email: cleanEmail, full_name: fullName.trim(), role })
      .eq('id', user.id);

    if (role === 'builder' && orgName) {
      await supabase.from('organisations').insert({
        owner_id: user.id,
        name: orgName.trim(),
        city: city.trim() || 'Brisbane',
        state: 'QLD',
      });
    }

    setLoading(false);
    router.push(role === 'crew_leader' ? '/cl/dashboard' : '/b/dashboard');
  }

  const inputClass = 'w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-neutral-400 focus:border-black';

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-semibold tracking-tight">cobuild</Link>
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Link href="/" className="hidden rounded-full px-4 py-2 hover:bg-neutral-100 sm:block">home</Link>
            <Link href="/login" className="rounded-full bg-black px-5 py-2.5 text-white hover:bg-neutral-800">log in</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-16">
        <section className="hidden lg:block">
          <p className="mb-5 inline-flex rounded-full bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-800">sign up free</p>
          <h1 className="max-w-xl text-6xl font-semibold leading-[0.95] tracking-[-0.055em]">
            start moving crews faster.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-neutral-600">
            Create your account, save your phone number for future job notifications, and get into the right workspace.
          </p>
          <div className="mt-10 rounded-[2rem] bg-black p-5 text-white">
            <p className="text-sm font-semibold text-neutral-400">recommended flow</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-white/10 p-4">1. choose your role</div>
              <div className="rounded-2xl bg-white/10 p-4">2. create login details</div>
              <div className="rounded-2xl bg-white/10 p-4">3. enter dashboard</div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-xl">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">new account</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">join cobuild</h2>
            <p className="mt-3 text-neutral-600">Email and password for login. Phone saved for SMS and WhatsApp later.</p>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setRole('builder')}
              className={`rounded-[1.5rem] border p-5 text-left transition ${role === 'builder' ? 'border-black bg-black text-white' : 'border-neutral-200 bg-white hover:border-black'}`}
            >
              <div className="text-2xl">🔨</div>
              <div className="mt-4 font-semibold">builder</div>
              <p className={`mt-1 text-sm ${role === 'builder' ? 'text-neutral-300' : 'text-neutral-500'}`}>post jobs and book crews</p>
            </button>
            <button
              type="button"
              onClick={() => setRole('crew_leader')}
              className={`rounded-[1.5rem] border p-5 text-left transition ${role === 'crew_leader' ? 'border-black bg-black text-white' : 'border-neutral-200 bg-white hover:border-black'}`}
            >
              <div className="text-2xl">🦺</div>
              <div className="mt-4 font-semibold">crew leader</div>
              <p className={`mt-1 text-sm ${role === 'crew_leader' ? 'text-neutral-300' : 'text-neutral-500'}`}>manage crew and accept work</p>
            </button>
          </div>

          <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="grid gap-3">
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="your name" autoComplete="name" className={inputClass} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email address" autoComplete="email" className={inputClass} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password, min 8 characters" autoComplete="new-password" className={inputClass} />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="phone, e.g. +61412345678" autoComplete="tel" className={inputClass} />

              {role === 'builder' && (
                <>
                  <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="company name" className={inputClass} />
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="city" className={inputClass} />
                </>
              )}
            </div>

            {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

            <button
              onClick={startSignup}
              disabled={loading || !fullName || !email || !password || !phone || (role === 'builder' && !orgName)}
              className="mt-5 w-full rounded-full bg-black px-6 py-4 font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {loading ? 'creating account...' : 'create account'}
            </button>

            <p className="mt-6 text-center text-sm text-neutral-600">
              already have an account? <Link href="/login" className="font-semibold text-black underline underline-offset-4">log in</Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
