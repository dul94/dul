'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx'; // Import library Excel
import { Wrench, AlertTriangle, CheckCircle, Clock, LogOut, Download } from 'lucide-react';

export default function MaintenanceApp() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('operator');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State form
  const [assetName, setAssetName] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
    } else {
      setUser(session.user);
      fetchUserRole(session.user.id);
      fetchReports();
    }
  }

  async function fetchUserRole(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (data) {
      setUserRole(data.role);
    }
  }

  async function fetchReports() {
    const { data } = await supabase
      .from('maintenance_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setReports(data);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  // FUNGSI BARU: Ekspor Data ke File Excel (.xlsx)
  function exportToExcel() {
    if (reports.length === 0) {
      alert('Belum ada data laporan untuk diunduh!');
      return;
    }

    // Merapikan nama kolom agar mudah dibaca di Excel
    const formattedData = reports.map((item, index) => ({
      'No': index + 1,
      'Tanggal Lapor': new Date(item.created_at).toLocaleString('id-ID'),
      'Nama Mesin / Aset': item.asset_name,
      'Lokasi / Area': item.location,
      'Prioritas': item.priority,
      'Detail Kerusakan': item.description,
      'Status Perbaikan': item.status,
      'Link Foto Bukti': item.photo_url || 'Tidak ada foto'
    }));

    // Membuat worksheet dan workbook Excel
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Maintenance');

    // Mengatur lebar kolom otomatis agar tidak terpotong
    worksheet['!cols'] = [
      { wch: 5 },  // No
      { wch: 22 }, // Tanggal
      { wch: 25 }, // Nama Mesin
      { wch: 20 }, // Lokasi
      { wch: 12 }, // Prioritas
      { wch: 40 }, // Detail Kerusakan
      { wch: 18 }, // Status
      { wch: 35 }  // Link Foto
    ];

    // Unduh file dengan nama menyertakan tanggal hari ini
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Rekap_Maintenance_${today}.xlsx`);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    let photoUrl = '';

    if (photo) {
      const fileName = `${Date.now()}-${photo.name}`;
      const { error: uploadError } = await supabase.storage
        .from('report-photos')
        .upload(fileName, photo);

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('report-photos')
          .getPublicUrl(fileName);
        photoUrl = publicUrlData.publicUrl;
      }
    }

    const { error } = await supabase.from('maintenance_reports').insert([
      {
        asset_name: assetName,
        location: location,
        priority: priority,
        description: description,
        photo_url: photoUrl,
      },
    ]);

    if (!error) {
      setAssetName('');
      setLocation('');
      setDescription('');
      setPhoto(null);
      e.target.reset();
      fetchReports();
    } else {
      alert('Gagal mengirim laporan: ' + error.message);
    }
    setLoading(false);
  }

  async function updateStatus(id, newStatus) {
    if (userRole !== 'teknisi') {
      alert('Hanya teknisi yang dapat mengubah status perbaikan!');
      return;
    }
    await supabase
      .from('maintenance_reports')
      .update({ status: newStatus })
      .eq('id', id);
    fetchReports();
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 text-slate-800">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-3 rounded-lg text-white">
              <Wrench size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Sistem Laporan Maintenance</h1>
              <p className="text-slate-500 text-xs">Login sebagai: <b>{user.email}</b> ({userRole.toUpperCase()})</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <LogOut size={16} /> Keluar
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* KOLOM KIRI: FORM LAPORAN */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
            <h2 className="text-lg font-semibold mb-4">Buat Laporan Baru</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nama Mesin / Aset</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Genset Utama #02"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Lokasi / Area</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Gedung B - Lantai 1"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tingkat Prioritas</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                >
                  <option value="Low">Low (Normal)</option>
                  <option value="Medium">Medium (Segera)</option>
                  <option value="High">High (Darurat)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Detail Kerusakan</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Jelaskan kendala..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Foto Bukti (Opsional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhoto(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Mengirim...' : 'Kirim Laporan'}
              </button>
            </form>
          </div>

          {/* KOLOM KANAN: DAFTAR LAPORAN */}
          <div className="lg:col-span-2 space-y-4">
            {/* Header Daftar Laporan + Tombol Export Excel */}
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Daftar Laporan Masuk ({reports.length})</h2>
              
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition cursor-pointer"
              >
                <Download size={16} /> Unduh Excel
              </button>
            </div>
            
            {reports.length === 0 ? (
              <div className="bg-white p-8 rounded-xl text-center text-slate-400 border border-slate-200">
                Belum ada laporan maintenance.
              </div>
            ) : (
              reports.map((item) => (
                <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg">{item.asset_name}</span>
                      <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full text-slate-600">{item.location}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        item.priority === 'High' ? 'bg-red-100 text-red-700' :
                        item.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600">{item.description}</p>
                    
                    {item.photo_url && (
                      <a href={item.photo_url} target="_blank" rel="noreferrer" className="inline-block mt-2">
                        <img src={item.photo_url} alt="Foto" className="h-24 w-32 object-cover rounded-lg border" />
                      </a>
                    )}
                    
                    <div className="text-xs text-slate-400 pt-1">
                      Dilaporkan: {new Date(item.created_at).toLocaleString('id-ID')}
                    </div>
                  </div>

                  {/* Kontrol Status */}
                  <div className="flex flex-col justify-between items-end min-w-35">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      item.status === 'Done' ? 'bg-emerald-100 text-emerald-700' :
                      item.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {item.status === 'Done' && <CheckCircle size={14} />}
                      {item.status === 'In Progress' && <Clock size={14} />}
                      {item.status === 'Open' && <AlertTriangle size={14} />}
                      {item.status}
                    </span>

                    {userRole === 'teknisi' ? (
                      <select
                        value={item.status}
                        onChange={(e) => updateStatus(item.id, e.target.value)}
                        className="mt-3 text-xs border border-slate-300 rounded-lg p-1.5 bg-slate-50 cursor-pointer"
                      >
                        <option value="Open">Set: Open</option>
                        <option value="In Progress">Set: In Progress</option>
                        <option value="Done">Set: Done</option>
                      </select>
                    ) : (
                      <span className="text-xs text-slate-400 mt-2 italic">Akses ubah: Teknisi</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const updateStatus = async (id, statusBaru) => {
  const { error } = await supabase
    .from(maintenance_reports) // Sesuaikan dengan nama tabel Anda di Supabase
    .update({ status: statusBaru })
    .eq('id', id);

  if (error) {
    alert('Gagal mengubah status: ' + error.message);
  } else {
    // Refresh data atau muat ulang daftar laporan
    fetchLaporan(); 
  }
};

<div className="flex gap-2 mt-3">
  {laporan.status === 'Open' && (
    <button 
      onClick={() => updateStatus(laporan.id, 'In Progress')}
      className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
    >
      Proses (In Progress)
    </button>
  )}
  {laporan.status !== 'Done' && (
    <button 
      onClick={() => updateStatus(laporan.id, 'Done')}
      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
    >
      Selesai (Done)
    </button>
  )}
</div>