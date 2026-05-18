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
  const [phone, setPhone] = useState('');
  const [orgName, setOrgName] = useState('');
  const [city, setCity] = useState('Brisbane');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function startSignup() {
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { data: { full_name: fullName, role } }
    });
    setLoading(false);
    if (error) setError(error.message);
    else setStep('otp');
  }

  async function verify() {
    setLoading(true); setError('');
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
    if (error) { setError(error.message); setLoading(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (user && role === 'builder' && orgName) {
      await supabase.from('organisations').insert({ owner_id: user.id, name: orgName, city, state: 'QLD' });
    }

    setLoading(false);
    router.push(role === 'crew_leader' ? '/cl/dashboard' : '/b/dashboard');
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

        <h1 className="text-2xl font-medium mb-2">Create account</h1>
        <p className="text-sm text-gray-600 mb-6">Takes under 2 minutes.</p>

        {step === 'details' ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">I am a...</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('builder')}
                  className={`py-2.5 rounded-lg border ${role === 'builder' ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-gray-300'}`}
                >
                  Builder
                </button>
                <button
                  type="button"
                  onClick={() => setRole('crew_leader')}
                  className={`py-2.5 rounded-lg border ${role === 'crew_leader' ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-gray-300'}`}
                >
                  Crew leader
                </button>
              </div>
            </div>

            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600 mb-3"
            />

            {role === 'builder' && (
              <>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Company name"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600 mb-3"
                />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600 mb-3"
                />
              </>
            )}

            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+61 4 1234 5678"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600 mb-4"
            />

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            <button
              onClick={startSignup}
              disabled={loading || !fullName || !phone}
              className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-800"
            >
              {loading ? 'Sending...' : 'Send code'}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">We sent a code to {phone}</p>
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
              onClick={verify}
              disabled={loading || otp.length !== 6}
              className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-800"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </>
        )}

        <div className="mt-8 text-center text-sm text-gray-600">
          Already have an account? <Link href="/login" className="text-brand-600 font-medium">Log in</Link>
        </div>
      </div>
    </div>
  );
}
