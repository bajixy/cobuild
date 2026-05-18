'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function sendOTP() {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) setError(error.message);
    else setStep('otp');
  }

  async function verifyOTP() {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
    setLoading(false);
    if (error) { setError(error.message); return; }

    // Redirect based on role
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      router.push(profile?.role === 'crew_leader' ? '/cl/dashboard' : '/b/dashboard');
    }
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

        <h1 className="text-2xl font-medium mb-2">Log in</h1>
        <p className="text-sm text-gray-600 mb-8">
          {step === 'phone' ? "We'll text you a code." : "Enter the 6-digit code we sent."}
        </p>

        {step === 'phone' ? (
          <>
            <label className="block text-sm font-medium mb-2">Phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+61 4 1234 5678"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600 mb-4"
            />
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <button
              onClick={sendOTP}
              disabled={loading || !phone}
              className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-800"
            >
              {loading ? 'Sending...' : 'Send code'}
            </button>
          </>
        ) : (
          <>
            <label className="block text-sm font-medium mb-2">6-digit code</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600 mb-4 text-center text-xl tracking-widest"
            />
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <button
              onClick={verifyOTP}
              disabled={loading || otp.length !== 6}
              className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-800"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button onClick={() => setStep('phone')} className="w-full mt-3 text-sm text-gray-600">
              Use a different number
            </button>
          </>
        )}

        <div className="mt-8 text-center text-sm text-gray-600">
          New to CoBuild? <Link href="/signup" className="text-brand-600 font-medium">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
