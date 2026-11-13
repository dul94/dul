'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Wrench } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      alert('Login Gagal: ' + error.message);
    } else {
      router.push('/'); // Masuk ke halaman utama setelah berhasil
    }
    setLoading(false);
  }

  async function handleSignUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert('Pendaftaran Gagal: ' + error.message);
    } else {
      alert('Pendaftaran berhasil! Silakan login.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-600 p-3 rounded-lg text-white">
            <Wrench size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Login Maintenance</h1>
            <p className="text-slate-500 text-sm">Masuk untuk mengakses sistem</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
              placeholder="nama@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>

          <button
            type="button"
            onClick={handleSignUp}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg transition text-sm"
          >
            Daftar Akun Baru (Operator)
          </button>
        </form>
      </div>
    </div>
  );
}