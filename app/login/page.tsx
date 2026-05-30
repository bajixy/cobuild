'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function login() {
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      router.push(profile?.role === 'crew_leader' ? '/cl/dashboard' : '/b/dashboard');
    }

    setLoading(false);
  }

  const inputClass = 'w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-neutral-400 focus:border-black';

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-semibold tracking-tight">cobuild</Link>
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Link href="/" className="hidden rounded-full px-4 py-2 hover:bg-neutral-100 sm:block">home</Link>
            <Link href="/signup" className="rounded-full bg-black px-5 py-2.5 text-white hover:bg-neutral-800">sign up free</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-16">
        <section className="hidden lg:block">
          <p className="mb-5 inline-flex rounded-full bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-800">welcome back</p>
          <h1 className="max-w-xl text-6xl font-semibold leading-[0.95] tracking-[-0.055em]">
            get crews moving again.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-neutral-600">
            Log in to post job requests, manage your crew, and keep site labour coordinated from one workspace.
          </p>
          <div className="mt-10 rounded-[2rem] bg-black p-5 text-white">
            <p className="text-sm font-semibold text-neutral-400">today in cobuild</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-white/10 p-4">3 open requests near Brisbane</div>
              <div className="rounded-2xl bg-white/10 p-4">same-day crew matching</div>
              <div className="rounded-2xl bg-white/10 p-4">phone notifications ready for workers</div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-xl">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">log in</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">enter cobuild</h2>
            <p className="mt-3 text-neutral-600">Use your email and password to access your workspace.</p>
          </div>

          <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="grid gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email address"
                autoComplete="email"
                className={inputClass}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                autoComplete="current-password"
                className={inputClass}
              />
            </div>

            <div className="mt-4 text-right">
              <Link href="/forgot-password" className="text-sm font-semibold text-black underline underline-offset-4">
                forgot password?
              </Link>
            </div>

            {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

            <button
              onClick={login}
              disabled={loading || !email || !password}
              className="mt-5 w-full rounded-full bg-black px-6 py-4 font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {loading ? 'logging in...' : 'log in'}
            </button>

            <p className="mt-6 text-center text-sm text-neutral-600">
              new to cobuild? <Link href="/signup" className="font-semibold text-black underline underline-offset-4">create an account</Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
