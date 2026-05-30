'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function sendReset() {
    setLoading(true);
    setMessage('');
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage('Password reset link sent. Check your email.');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="block mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-800 font-medium text-sm">CB</div>
            <span className="font-medium">CoBuild</span>
          </div>
        </Link>

        <h1 className="text-2xl font-medium mb-2">Reset password</h1>
        <p className="text-sm text-gray-600 mb-8">
          Enter your email and we’ll send a secure reset link. Phone recovery can be added after SMS/WhatsApp is connected.
        </p>

        <label className="block text-sm font-medium mb-2">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600 mb-4"
        />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {message && <p className="text-sm text-green-700 mb-4">{message}</p>}

        <button
          onClick={sendReset}
          disabled={loading || !email}
          className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </button>

        <div className="mt-8 text-center text-sm text-gray-600">
          Remembered it? <Link href="/login" className="text-brand-600 font-medium">Log in</Link>
        </div>
      </div>
    </div>
  );
}
