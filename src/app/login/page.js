'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Wrench, Mail, Lock, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('operator');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function checkExistingSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.push('/');
      } else {
        setCheckingSession(false);
      }
    }
    checkExistingSession();
  }, [router]);

  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (data?.user) {
          await supabase.from('profiles').upsert([
            {
              id: data.user.id,
              role: role,
            },
          ]);
        }

        if (data?.session) {
          router.push('/');
        } else {
          setSuccessMsg(
            'Pendaftaran berhasil! Silakan periksa email Anda untuk verifikasi atau langsung masuk.'
          );
          setIsRegister(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        router.push('/');
      }
    } catch (err) {
      if (err.message?.includes('Invalid login credentials')) {
        setErrorMsg('Email atau kata sandi salah. Silakan periksa kembali.');
      } else if (err.message?.includes('User already registered')) {
        setErrorMsg('Email ini sudah terdaftar. Silakan masuk menggunakan akun Anda.');
      } else {
        setErrorMsg(err.message || 'Terjadi kesalahan saat memproses autentikasi.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 grid grid-cols-1 lg:grid-cols-2 text-slate-800">
      {/* PANEL KIRI: INDUSTRIAL BRANDING (Tampil di Desktop) */}
      <div className="hidden lg:flex flex-col justify-between bg-slate-950 text-white p-12 relative overflow-hidden">
        {/* Aksen Cahaya Latar */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl shadow-lg">
            <Wrench size={22} />
          </div>
          <span className="text-lg font-extrabold tracking-tight">MTC Control Center</span>
        </div>

        <div className="space-y-6 max-w-md relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Sistem Operasional Terintegrasi
          </div>

          <h2 className="text-3xl font-extrabold leading-tight tracking-tight">
            Pantau & Tangani Pemeliharaan Aset Secara Terukur.
          </h2>

          <p className="text-sm text-slate-400 leading-relaxed">
            Koordinasi cepat antara operator lapangan dan tim teknisi untuk meminimalkan downtime
            mesin serta merekap riwayat perbaikan secara otomatis.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
              <p className="text-xs font-bold text-indigo-400">Pelaporan Cepat</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Lampirkan foto bukti & tingkat prioritas kerusakan langsung dari lapangan.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
              <p className="text-xs font-bold text-emerald-400">Rekap Otomatis</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Grafik analitik status perbaikan dan ekspor laporan ke Excel kapan saja.
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 relative z-10">
          © {new Date().getFullYear()} MTC Control Center • Internal Engineering System
        </p>
      </div>

      {/* PANEL KANAN: FORM AUTENTIKASI */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Header Mobile */}
          <div className="lg:hidden text-center space-y-2">
            <div className="inline-flex items-center justify-center bg-gradient-to-br from-indigo-600 to-blue-600 p-3.5 rounded-2xl text-white shadow-md">
              <Wrench size={24} />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">MTC Control Center</h1>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {isRegister ? 'Buat Akun Baru' : 'Selamat Datang Kembali'}
            </h2>
            <p className="text-xs text-slate-500">
              {isRegister
                ? 'Daftarkan akun operator atau teknisi untuk mulai mengakses sistem'
                : 'Masukkan kredensial akun Anda untuk masuk ke dashboard'}
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl shadow-sm border border-slate-200/80 space-y-5">
            {/* Tab Switcher */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                  !isRegister
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Masuk Akun
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                  isRegister
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Daftar Baru
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                <CheckCircle size={16} className="shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    required
                    placeholder="nama@perusahaan.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 rounded-xl text-sm outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 rounded-xl text-sm outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {isRegister && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Peran / Divisi Pengguna
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 rounded-xl text-sm outline-none transition"
                  >
                    <option value="operator">Operator (Pelapor Kerusakan)</option>
                    <option value="teknisi">Teknisi (Tim Maintenance)</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm transition disabled:opacity-50 cursor-pointer mt-2"
              >
                {loading
                  ? 'Memproses...'
                  : isRegister
                  ? 'Buat Akun Sekarang'
                  : 'Masuk ke Dashboard'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}