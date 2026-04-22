'use client';

import { useRouter } from 'next/navigation';
import { signInWithGoogle } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';

export default function SignInPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [hydrated, setHydrated] = useState(false); // prevent SSR mismatch
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ✅ Ensure we only render after client hydration
  useEffect(() => {
    setHydrated(true);
  }, []);

  // ✅ Redirect users who are already logged in
  useEffect(() => {
    if (hydrated && user) {
      router.push('/');
    }
  }, [hydrated, user, router]);

  const handleGoogle = async () => {
    const loggedInUser = await signInWithGoogle();
    if (loggedInUser) router.push('/dashboard');
  };

  if (!hydrated) {
    // Prevent hydration mismatch by matching server markup
    return <div className="min-h-screen bg-gray-950" />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="bg-gray-900 p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-white">Sign in</h1>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogle}
          className="w-full bg-white text-gray-900 font-medium py-2 rounded mb-4 hover:bg-gray-200 transition"
        >
          Continue with Google
        </button>

        {/* Email / Password placeholders */}
        <div className="flex flex-col gap-3">
          <label className="text-gray-300">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-2 rounded bg-gray-800 text-white border border-gray-700"
          />
          <label className="text-gray-300">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-2 rounded bg-gray-800 text-white border border-gray-700"
          />
        </div>

        <div className="flex justify-between mt-6">
          <button className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white">
            Sign in
          </button>
          <button className="border border-gray-600 hover:bg-gray-800 px-4 py-2 rounded text-white">
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
