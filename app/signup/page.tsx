'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

type UserRole = 'builder' | 'subcontractor' | 'crew_leader';

const roleOptions: { value: UserRole; icon: string; title: string; text: string }[] = [
  { value: 'builder', icon: '🔨', title: 'builder', text: 'post jobs and book trade teams' },
  { value: 'subcontractor', icon: '🦺', title: 'subcontractor', text: 'accept jobs and coordinate projects' },
  { value: 'crew_leader', icon: '📋', title: 'crew leader', text: 'manage workers and fill shifts' },
];

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRole = searchParams.get('role') as UserRole | null;
  const initialRole = requestedRole && roleOptions.some(option => option.value === requestedRole) ? requestedRole : 'builder';

  const supabase = createClient();
  const [role, setRole] = useState<UserRole>(initialRole);
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

    if ((role === 'builder' || role === 'subcontractor') && orgName) {
      await supabase.from('organisations').insert({
        owner_id: user.id,
        name: orgName.trim(),
        city: city.trim() || 'Brisbane',
        state: 'QLD',
      });
    }

    setLoading(false);
    router.push(role === 'builder' ? '/b/dashboard' : role === 'subcontractor' ? '/s/dashboard' : '/cl/dashboard');
  }

  const inputClass = 'w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-neutral-400 focus:border-black';
  const needsCompany = role === 'builder' || role === 'subcontractor';

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
            choose your side of the job.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-neutral-600">
            Builders post jobs. Subcontractors accept and coordinate contracts. Crew leaders manage workers and fill shifts.
          </p>
          <div className="mt-10 rounded-[2rem] bg-black p-5 text-white">
            <p className="text-sm font-semibold text-neutral-400">three-sided network</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-white/10 p-4">builder → needs work completed</div>
              <div className="rounded-2xl bg-white/10 p-4">subcontractor → owns trade contracts</div>
              <div className="rounded-2xl bg-white/10 p-4">crew leader → supplies workers</div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-2xl">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">new account</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">join cobuild</h2>
            <p className="mt-3 text-neutral-600">Choose the account type that matches how you work.</p>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-3">
            {roleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRole(option.value)}
                className={`rounded-[1.5rem] border p-5 text-left transition ${role === option.value ? 'border-black bg-black text-white' : 'border-neutral-200 bg-white hover:border-black'}`}
              >
                <div className="text-2xl">{option.icon}</div>
                <div className="mt-4 font-semibold">{option.title}</div>
                <p className={`mt-1 text-sm ${role === option.value ? 'text-neutral-300' : 'text-neutral-500'}`}>{option.text}</p>
              </button>
            ))}
          </div>

          <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="grid gap-3">
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="your name" autoComplete="name" className={inputClass} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email address" autoComplete="email" className={inputClass} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password, min 8 characters" autoComplete="new-password" className={inputClass} />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="phone, e.g. +61412345678" autoComplete="tel" className={inputClass} />

              {needsCompany && (
                <>
                  <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder={role === 'builder' ? 'building company name' : 'subcontractor business name'} className={inputClass} />
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="city" className={inputClass} />
                </>
              )}
            </div>

            {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

            <button
              onClick={startSignup}
              disabled={loading || !fullName || !email || !password || !phone || (needsCompany && !orgName)}
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
