'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  LogOut,
  Download,
  Search,
  X,
  Sun,
  Moon,
  Plus,
  LayoutDashboard,
  FileText,
  Menu,
  ShieldCheck,
  Server,
  ClipboardList,
  CalendarCheck,
  Package,
  BellRing,
  Activity,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';

export default function CMMSProApp() {
  const router = useRouter();

  // State Auth & Data Utama
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('operator');
  const [reports, setReports] = useState([]);
  const [assetsList, setAssetsList] = useState([]);
  const [pmSchedules, setPmSchedules] = useState([]);
  const [spareparts, setSpareparts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // State Navigasi ('dashboard', 'reports', 'pm', 'assets', 'spareparts')
  const [activeMenu, setActiveMenu] = useState('dashboard');

  // State Tema & Sidebar Mobile
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // State Form Laporan Kerusakan
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [customAssetName, setCustomAssetName] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // State Modal Aset Baru
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetLocation, setNewAssetLocation] = useState('');

  // State Modal PM Baru
  const [isPmModalOpen, setIsPmModalOpen] = useState(false);
  const [pmAssetId, setPmAssetId] = useState('');
  const [pmInterval, setPmInterval] = useState('Bulanan');
  const [pmDueDate, setPmDueDate] = useState('');
  const [pmAssigned, setPmAssigned] = useState('');
  const [pmDesc, setPmDesc] = useState('');

  // State Modal Sparepart Baru
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [partName, setPartName] = useState('');
  const [partCode, setPartCode] = useState('');
  const [partStock, setPartStock] = useState('');
  const [partMinStock, setPartMinStock] = useState('');

  // State Filter & Pencarian
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [pmSearchQuery, setPmSearchQuery] = useState('');
  const [partSearchQuery, setPartSearchQuery] = useState('');

  // State UX (Toast, Modal Penyelesaian, Lightbox)
  const [toast, setToast] = useState(null);
  const [resolveModal, setResolveModal] = useState({ open: false, id: null, assetName: '' });
  const [techNote, setTechNote] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('cmms-pro-theme');
    if (savedTheme === 'dark') setDarkMode(true);
  }, []);

  function toggleTheme() {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('cmms-pro-theme', next ? 'dark' : 'light');
  }

  useEffect(() => {
    let intervalId;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);
      await Promise.all([
        fetchUserRole(session.user.id),
        fetchReports(),
        fetchAssets(),
        fetchPmSchedules(),
        fetchSpareparts(),
      ]);
      setInitialLoading(false);

      intervalId = setInterval(() => {
        fetchReports();
        fetchPmSchedules();
        fetchSpareparts();
      }, 20000);
    }

    init();
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [router]);

  async function fetchUserRole(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (data?.role) setUserRole(data.role);
  }

  async function fetchReports() {
    const { data } = await supabase
      .from('maintenance_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setReports(data);
  }

  async function fetchAssets() {
    const { data } = await supabase
      .from('assets')
      .select('*')
      .order('asset_name', { ascending: true });
    if (data) setAssetsList(data);
  }

  async function fetchPmSchedules() {
    const { data } = await supabase
      .from('preventive_maintenance')
      .select('*')
      .order('next_due_date', { ascending: true });
    if (data) setPmSchedules(data);
  }

  async function fetchSpareparts() {
    const { data } = await supabase
      .from('spareparts')
      .select('*')
      .order('part_name', { ascending: true });
    if (data) setSpareparts(data);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  function handleAssetSelectChange(e) {
    const val = e.target.value;
    setSelectedAssetId(val);

    if (val === 'custom') {
      setCustomAssetName('');
      setLocation('');
    } else {
      const found = assetsList.find((a) => a.id === val);
      if (found) {
        setCustomAssetName(found.asset_name);
        setLocation(found.location);
      }
    }
  }

  async function handleCreateAsset(e) {
    e.preventDefault();
    if (!newAssetName || !newAssetLocation) {
      showToast('Nama mesin dan lokasi wajib diisi.', 'error');
      return;
    }

    const { error } = await supabase.from('assets').insert([
      { asset_name: newAssetName.trim(), location: newAssetLocation.trim() },
    ]);

    if (!error) {
      showToast('Aset baru berhasil didaftarkan!');
      setNewAssetName('');
      setNewAssetLocation('');
      setIsAssetModalOpen(false);
      fetchAssets();
    } else {
      showToast('Gagal: ' + error.message, 'error');
    }
  }

  async function handleCreatePm(e) {
    e.preventDefault();
    if (!pmAssetId || !pmDueDate || !pmInterval) {
      showToast('Lengkapi data jadwal PM.', 'error');
      return;
    }
    const foundAsset = assetsList.find((a) => a.id === pmAssetId);
    if (!foundAsset) return;

    const { error } = await supabase.from('preventive_maintenance').insert([
      {
        asset_name: foundAsset.asset_name,
        location: foundAsset.location,
        interval_type: pmInterval,
        next_due_date: pmDueDate,
        assigned_to: pmAssigned.trim() || 'Tim Teknik',
        description: pmDesc.trim() || 'Pemeliharaan rutin',
        status: 'Scheduled',
      },
    ]);

    if (!error) {
      showToast('Jadwal Preventive Maintenance dibuat!');
      setPmAssetId('');
      setPmDueDate('');
      setPmAssigned('');
      setPmDesc('');
      setIsPmModalOpen(false);
      fetchPmSchedules();
    } else {
      showToast('Gagal: ' + error.message, 'error');
    }
  }

  async function handleCreateSparepart(e) {
    e.preventDefault();
    if (!partName || !partStock) {
      showToast('Nama sparepart dan stok wajib diisi.', 'error');
      return;
    }

    const { error } = await supabase.from('spareparts').insert([
      {
        part_name: partName.trim(),
        part_code: partCode.trim() || 'PART-' + Math.floor(1000 + Math.random() * 9000),
        stock: parseInt(partStock) || 0,
        min_stock: parseInt(partMinStock) || 5,
      },
    ]);

    if (!error) {
      showToast('Sparepart berhasil ditambahkan ke inventaris!');
      setPartName('');
      setPartCode('');
      setPartStock('');
      setPartMinStock('');
      setIsPartModalOpen(false);
      fetchSpareparts();
    } else {
      showToast('Gagal: ' + error.message, 'error');
    }
  }

  // Statistik & Analitik Profesional
  const stats = useMemo(() => {
    const total = reports.length;
    const open = reports.filter((item) => item.status === 'Open').length;
    const progress = reports.filter((item) => item.status === 'In Progress').length;
    const done = reports.filter((item) => item.status === 'Done').length;
    const highPriority = reports.filter((item) => item.priority === 'High' && item.status !== 'Done');
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;

    const pmTotal = pmSchedules.length;
    const pmDone = pmSchedules.filter((i) => i.status === 'Completed').length;
    const lowStockParts = spareparts.filter((p) => p.stock <= p.min_stock).length;

    return {
      total,
      open,
      progress,
      done,
      rate,
      highPriority,
      pmTotal,
      pmDone,
      lowStockParts,
      grafikStatus: [
        { name: 'Open', jumlah: open, fill: '#f43f5e' },
        { name: 'In Progress', jumlah: progress, fill: '#f59e0b' },
        { name: 'Done', jumlah: done, fill: '#10b981' },
      ],
      grafikPrioritas: [
        { name: 'Low', jumlah: reports.filter((i) => i.priority === 'Low').length, fill: '#64748b' },
        { name: 'Medium', jumlah: reports.filter((i) => i.priority === 'Medium').length, fill: '#6366f1' },
        { name: 'High', jumlah: reports.filter((i) => i.priority === 'High').length, fill: '#e11d48' },
      ],
    };
  }, [reports, pmSchedules, spareparts]);

  const laporanTersaring = useMemo(() => {
    return reports.filter((item) => {
      const cocokStatus = filterStatus === 'Semua' || item.status === filterStatus;
      const q = searchQuery.toLowerCase();
      const cocokCari =
        !q ||
        item.asset_name?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q);

      const tanggalLaporan = item.created_at ? item.created_at.slice(0, 10) : '';
      const cocokMulai = !tanggalMulai || tanggalLaporan >= tanggalMulai;
      const cocokSelesai = !tanggalSelesai || tanggalLaporan <= tanggalSelesai;

      return cocokStatus && cocokCari && cocokMulai && cocokSelesai;
    });
  }, [reports, filterStatus, searchQuery, tanggalMulai, tanggalSelesai]);

  const isFiltered =
    filterStatus !== 'Semua' || searchQuery !== '' || tanggalMulai !== '' || tanggalSelesai !== '';

  function resetFilter() {
    setFilterStatus('Semua');
    setSearchQuery('');
    setTanggalMulai('');
    setTanggalSelesai('');
  }

  const assetsTersaring = useMemo(() => {
    const q = assetSearchQuery.toLowerCase();
    return assetsList.filter(
      (a) => !q || a.asset_name?.toLowerCase().includes(q) || a.location?.toLowerCase().includes(q)
    );
  }, [assetsList, assetSearchQuery]);

  const pmTersaring = useMemo(() => {
    const q = pmSearchQuery.toLowerCase();
    return pmSchedules.filter(
      (p) => !q || p.asset_name?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q)
    );
  }, [pmSchedules, pmSearchQuery]);

  const partsTersaring = useMemo(() => {
    const q = partSearchQuery.toLowerCase();
    return spareparts.filter(
      (s) => !q || s.part_name?.toLowerCase().includes(q) || s.part_code?.toLowerCase().includes(q)
    );
  }, [spareparts, partSearchQuery]);

  function exportToExcel() {
    if (laporanTersaring.length === 0) {
      showToast('Tidak ada data laporan untuk diunduh!', 'error');
      return;
    }
    const formattedData = laporanTersaring.map((item, index) => ({
      No: index + 1,
      'Tanggal Lapor': new Date(item.created_at).toLocaleString('id-ID'),
      'Nama Mesin / Aset': item.asset_name,
      'Lokasi / Area': item.location,
      Prioritas: item.priority,
      'Detail Kerusakan': item.description,
      'Status Perbaikan': item.status,
      'Catatan Teknisi': item.catatan_teknisi || 'Belum ada catatan',
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan CMMS Pro');
    XLSX.writeFile(workbook, `Rekap_CMMS_Pro_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast(`Berhasil mengekspor ${laporanTersaring.length} data.`);
  }

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    let photoUrl = '';

    const finalAssetName = selectedAssetId === 'custom' ? customAssetName : customAssetName;
    if (!finalAssetName || !location) {
      showToast('Nama mesin dan lokasi wajib diisi.', 'error');
      setLoading(false);
      return;
    }

    if (photo) {
      const cleanName = photo.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${Date.now()}-${cleanName}`;
      const { error: uploadError } = await supabase.storage.from('report-photos').upload(fileName, photo);
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('report-photos').getPublicUrl(fileName);
        photoUrl = publicUrlData.publicUrl;
      }
    }

    const { error } = await supabase.from('maintenance_reports').insert([
      {
        asset_name: finalAssetName.trim(),
        location: location.trim(),
        priority,
        description: description.trim(),
        photo_url: photoUrl,
        status: 'Open',
      },
    ]);

    if (!error) {
      setSelectedAssetId('');
      setCustomAssetName('');
      setLocation('');
      setPriority('Medium');
      setDescription('');
      clearPhoto();
      e.target.reset();
      await fetchReports();
      showToast('Laporan kerusakan berhasil dikirim!');
    } else {
      showToast('Gagal: ' + error.message, 'error');
    }
    setLoading(false);
  }

  function onSelectStatus(item, statusBaru) {
    if (userRole !== 'teknisi') {
      showToast('Hanya teknisi yang dapat memperbarui status perbaikan!', 'error');
      return;
    }
    if (statusBaru === 'Done') {
      setTechNote(item.catatan_teknisi || '');
      setResolveModal({ open: true, id: item.id, assetName: item.asset_name });
      return;
    }
    commitStatusUpdate(item.id, statusBaru, null);
  }

  async function commitStatusUpdate(id, statusBaru, catatan) {
    const dataUpdate = { status: statusBaru };
    if (catatan !== null) {
      dataUpdate.catatan_teknisi = catatan.trim() || 'Selesai diperbaiki';
    }
    const { error } = await supabase.from('maintenance_reports').update(dataUpdate).eq('id', id);
    if (!error) {
      await fetchReports();
      showToast(`Status diperbarui ke ${statusBaru}`);
    } else {
      showToast('Gagal: ' + error.message, 'error');
    }
    setResolveModal({ open: false, id: null, assetName: '' });
  }

  async function updatePmStatus(pmId, newStatus) {
    if (userRole !== 'teknisi') {
      showToast('Hanya teknisi yang dapat memperbarui jadwal PM!', 'error');
      return;
    }
    const { error } = await supabase.from('preventive_maintenance').update({ status: newStatus }).eq('id', pmId);
    if (!error) {
      showToast(`Status PM diperbarui ke ${newStatus}`);
      fetchPmSchedules();
    } else {
      showToast('Gagal: ' + error.message, 'error');
    }
  }

  const theme = {
    page: darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900',
    nav: darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200/80',
    sidebar: darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80',
    card: darkMode ? 'bg-slate-900 border-slate-800 shadow-none' : 'bg-white border-slate-200/80 shadow-sm',
    subCard: darkMode ? 'bg-slate-800/70 border-slate-700/80 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600',
    input: darkMode ? 'bg-slate-800/80 focus:bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-indigo-500' : 'bg-slate-50 focus:bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500',
    title: darkMode ? 'text-white' : 'text-slate-900',
    muted: darkMode ? 'text-slate-400' : 'text-slate-500',
    divider: darkMode ? 'border-slate-800' : 'border-slate-100',
    gridStroke: darkMode ? '#1e293b' : '#f1f5f9',
  };

  if (initialLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.page}`}>
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className={`text-xs font-semibold tracking-wider uppercase ${theme.muted}`}>Memuat CMMS Pro Engine...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={`min-h-screen flex transition-colors duration-200 ${theme.page}`}>
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold ${
            toast.type === 'error' ? 'bg-rose-600 text-white' : darkMode ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'
          }`}
        >
          {toast.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle size={15} className="text-emerald-300" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ALERT HIGH PRIORITY GLOBAL */}
      {stats.highPriority.length > 0 && activeMenu === 'dashboard' && (
        <div className="fixed top-0 inset-x-0 z-50 bg-rose-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-lg animate-pulse">
          <BellRing size={16} />
          <span>PERHATIAN: Ada {stats.highPriority.length} mesin mengalami kerusakan darurat (High Priority) yang belum terselesaikan!</span>
        </div>
      )}

      {/* SIDEBAR PRO */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${theme.sidebar}`}
      >
        <div>
          <div className={`p-6 border-b flex items-center justify-between ${theme.divider}`}>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-600 to-blue-600 p-2.5 rounded-xl text-white shadow-md">
                <Activity size={20} />
              </div>
              <div>
                <h1 className={`text-sm font-extrabold tracking-tight ${theme.title}`}>CMMS Pro</h1>
                <p className={`text-[10px] uppercase font-semibold ${theme.muted}`}>Enterprise Asset Ops</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-200 cursor-pointer">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 space-y-6">
            <div className="space-y-1">
              <p className={`text-[11px] font-bold uppercase tracking-wider px-3 mb-2 ${theme.muted}`}>
                Modul Utama
              </p>
              {[
                { id: 'dashboard', label: 'Dashboard Analitik', icon: LayoutDashboard },
                { id: 'reports', label: `Daftar Laporan (${stats.total})`, icon: ClipboardList },
                { id: 'pm', label: `Jadwal PM (${pmSchedules.length})`, icon: CalendarCheck },
                { id: 'spareparts', label: `Stok Spareparts (${spareparts.length})`, icon: Package },
                { id: 'assets', label: `Daftar Mesin (${assetsList.length})`, icon: Server },
              ].map((m) => {
                const IconComp = m.icon;
                const isActive = activeMenu === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setActiveMenu(m.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md'
                        : darkMode
                        ? 'text-slate-300 hover:bg-slate-800'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <IconComp size={16} /> {m.label}
                  </button>
                );
              })}
            </div>

            {activeMenu === 'reports' && (
              <div className="space-y-1.5 pt-2">
                <p className={`text-[11px] font-bold uppercase tracking-wider px-3 mb-2 ${theme.muted}`}>
                  Filter Status
                </p>
                {['Semua', 'Open', 'In Progress', 'Done'].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setFilterStatus(st);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      filterStatus === st
                        ? 'bg-indigo-600/20 text-indigo-500 border border-indigo-500/30'
                        : darkMode
                        ? 'text-slate-400 hover:bg-slate-800'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <FileText size={14} /> {st}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`p-4 border-t space-y-3 ${theme.divider}`}>
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <ShieldCheck size={18} />
            </div>
            <div className="overflow-hidden">
              <p className={`text-xs font-bold truncate ${theme.title}`}>{user.email}</p>
              <p className={`text-[10px] uppercase font-semibold ${theme.muted}`}>{userRole}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center justify-center gap-2 border px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              darkMode
                ? 'bg-slate-800 hover:bg-rose-950/50 text-slate-300 hover:text-rose-400 border-slate-700'
                : 'bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border-slate-200'
            }`}
          >
            <LogOut size={14} /> Keluar Sistem
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-xs lg:hidden" />
      )}

      {/* KONTEN UTAMA */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <header className={`sticky top-0 z-30 backdrop-blur-md border-b transition-colors ${theme.nav}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <Menu size={18} />
              </button>
              <div>
                <h1 className={`text-sm sm:text-base font-bold tracking-tight ${theme.title}`}>
                  {activeMenu === 'dashboard'
                    ? 'Dashboard Eksekutif CMMS Pro'
                    : activeMenu === 'reports'
                    ? 'Manajemen Laporan Kerusakan'
                    : activeMenu === 'pm'
                    ? 'Preventive Maintenance Terjadwal'
                    : activeMenu === 'spareparts'
                    ? 'Inventaris Gudang Suku Cadang'
                    : 'Master Data Mesin & Aset'}
                </h1>
                <p className={`text-[11px] hidden sm:block ${theme.muted}`}>
                  Sistem pemeliharaan terintegrasi enterprise tingkat lanjut
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-14 space-y-6 flex-1">
          {activeMenu === 'dashboard' ? (
            /* ================= VIEW 1: DASHBOARD EKSEKUTIF ================= */
            <div className="space-y-6">
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-5 rounded-2xl border relative overflow-hidden ${theme.card}`}>
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                  <p className={`text-xs font-semibold uppercase tracking-wider ${theme.muted}`}>Total Laporan</p>
                  <div className="flex items-baseline justify-between mt-2">
                    <p className={`text-3xl font-extrabold ${theme.title}`}>{stats.total}</p>
                    <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      {stats.rate}% Tuntas
                    </span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full mt-3 overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${stats.rate}%` }} />
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border relative overflow-hidden ${theme.card}`}>
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
                  <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Menunggu (Open)</p>
                  <div className="flex items-baseline justify-between mt-2">
                    <p className={`text-3xl font-extrabold ${theme.title}`}>{stats.open}</p>
                    <span className={`text-[11px] ${theme.muted}`}>Butuh Teknisi</span>
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border relative overflow-hidden ${theme.card}`}>
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
                  <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Jadwal PM</p>
                  <div className="flex items-baseline justify-between mt-2">
                    <p className={`text-3xl font-extrabold ${theme.title}`}>{stats.pmTotal}</p>
                    <span className={`text-[11px] ${theme.muted}`}>{stats.pmDone} Selesai</span>
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border relative overflow-hidden ${theme.card}`}>
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500" />
                  <p className="text-xs font-semibold text-purple-500 uppercase tracking-wider">Stok Kritis Sparepart</p>
                  <div className="flex items-baseline justify-between mt-2">
                    <p className={`text-3xl font-extrabold ${theme.title}`}>{stats.lowStockParts}</p>
                    <span className={`text-[11px] ${theme.muted}`}>Item Menipis</span>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-6 rounded-2xl border ${theme.card}`}>
                  <h3 className={`text-sm font-bold mb-4 ${theme.title}`}>Distribusi Status Perbaikan</h3>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.grafikStatus}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridStroke} />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', borderRadius: '12px', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, color: darkMode ? '#f8fafc' : '#0f172a', fontSize: '12px' }} />
                        <Bar dataKey="jumlah" radius={[8, 8, 0, 0]} barSize={46}>
                          {stats.grafikStatus.map((entry, index) => (
                            <Cell key={`status-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={`p-6 rounded-2xl border ${theme.card}`}>
                  <h3 className={`text-sm font-bold mb-4 ${theme.title}`}>Tingkat Prioritas Kerusakan</h3>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.grafikPrioritas}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridStroke} />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', borderRadius: '12px', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, color: darkMode ? '#f8fafc' : '#0f172a', fontSize: '12px' }} />
                        <Bar dataKey="jumlah" radius={[8, 8, 0, 0]} barSize={46}>
                          {stats.grafikPrioritas.map((entry, index) => (
                            <Cell key={`prio-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
            </div>
          ) : activeMenu === 'reports' ? (
            /* ================= VIEW 2: LAPORAN & FORM ================= */
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className={`lg:col-span-4 p-6 rounded-2xl border lg:sticky lg:top-20 ${theme.card}`}>
                <div className={`mb-5 pb-3.5 border-b flex justify-between items-center ${theme.divider}`}>
                  <div>
                    <h2 className={`text-base font-bold ${theme.title}`}>Buat Laporan Baru</h2>
                    <p className={`text-xs mt-0.5 ${theme.muted}`}>Pilih dari daftar mesin terpusat</p>
                  </div>
                  {userRole === 'teknisi' && (
                    <button
                      type="button"
                      onClick={() => setIsAssetModalOpen(true)}
                      className="flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-600 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 cursor-pointer"
                    >
                      <Plus size={13} /> Aset
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Pilih Mesin / Aset</label>
                    <select
                      value={selectedAssetId}
                      onChange={handleAssetSelectChange}
                      required
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none transition ${theme.input}`}
                    >
                      <option value="">-- Pilih dari Daftar Mesin --</option>
                      {assetsList.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.asset_name} ({asset.location})
                        </option>
                      ))}
                      <option value="custom">+ Lainnya (Ketik Manual)</option>
                    </select>
                  </div>

                  {selectedAssetId === 'custom' && (
                    <div>
                      <label className="block text-xs font-semibold mb-1.5">Nama Mesin Baru</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Mesin Cutting #04"
                        value={customAssetName}
                        onChange={(e) => setCustomAssetName(e.target.value)}
                        className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none transition ${theme.input}`}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Lokasi / Area</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Gedung B - Lantai 1"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      disabled={selectedAssetId && selectedAssetId !== 'custom'}
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none transition disabled:opacity-70 ${theme.input}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Tingkat Prioritas</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none transition ${theme.input}`}
                    >
                      <option value="Low">Low — Normal</option>
                      <option value="Medium">Medium — Segera</option>
                      <option value="High">High — Darurat / Kritis</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Detail Kerusakan</label>
                    <textarea
                      rows="3"
                      required
                      placeholder="Jelaskan kendala teknis..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none transition ${theme.input}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Foto Bukti (Opsional)</label>
                    {!photoPreview ? (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className={`w-full text-xs file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:font-semibold file:bg-indigo-500/15 file:text-indigo-500 cursor-pointer border border-dashed rounded-xl p-1.5 ${
                          darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'
                        }`}
                      />
                    ) : (
                      <div className="relative inline-block">
                        <img src={photoPreview} alt="Preview" className="h-24 w-36 object-cover rounded-xl border border-slate-700/30" />
                        <button type="button" onClick={clearPhoto} className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-md cursor-pointer">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Mengirim Laporan...' : 'Kirim Laporan'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-8 space-y-4">
                <div className={`p-4 rounded-2xl border space-y-3.5 ${theme.card}`}>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari nama mesin, lokasi, atau kendala..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-9 pr-3 py-2 border rounded-xl text-sm outline-none transition ${theme.input}`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={tanggalMulai}
                        onChange={(e) => setTanggalMulai(e.target.value)}
                        className={`border rounded-xl px-3 py-2 text-xs outline-none ${theme.input}`}
                      />
                      <span className="text-slate-400 text-xs">—</span>
                      <input
                        type="date"
                        value={tanggalSelesai}
                        onChange={(e) => setTanggalSelesai(e.target.value)}
                        className={`border rounded-xl px-3 py-2 text-xs outline-none ${theme.input}`}
                      />
                    </div>
                  </div>

                  <div className={`flex flex-wrap items-center justify-between gap-2 pt-3 border-t ${theme.divider}`}>
                    <span className={`text-xs font-semibold ${theme.muted}`}>
                      Filter: <strong className="text-indigo-500">{filterStatus}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      {isFiltered && (
                        <button onClick={resetFilter} className="text-xs font-medium px-2.5 py-1.5 rounded-xl transition cursor-pointer text-slate-400 hover:text-white">
                          Reset
                        </button>
                      )}
                      <button
                        onClick={exportToExcel}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
                      >
                        <Download size={14} /> Excel ({laporanTersaring.length})
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center px-1">
                  <h2 className={`text-sm font-bold ${theme.title}`}>Daftar Laporan ({laporanTersaring.length})</h2>
                </div>

                {laporanTersaring.length === 0 ? (
                  <div className={`p-12 rounded-2xl text-center border space-y-1.5 ${theme.card}`}>
                    <p className={`text-sm font-semibold ${theme.title}`}>Tidak ada laporan ditemukan</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {laporanTersaring.map((item) => {
                      const priorityBorder =
                        item.priority === 'High'
                          ? 'border-l-4 border-l-rose-500'
                          : item.priority === 'Medium'
                          ? 'border-l-4 border-l-amber-500'
                          : 'border-l-4 border-l-slate-400';

                      return (
                        <article
                          key={item.id}
                          className={`p-5 rounded-2xl border transition flex flex-col sm:flex-row justify-between gap-4 ${theme.card} ${priorityBorder}`}
                        >
                          <div className="space-y-2.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className={`font-bold text-base ${theme.title}`}>{item.asset_name}</h3>
                              <span className={`text-xs px-2.5 py-0.5 rounded-lg font-medium ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                {item.location}
                              </span>
                              <span className={`text-[11px] px-2.5 py-0.5 rounded-lg font-bold ${item.priority === 'High' ? 'bg-rose-500/15 text-rose-500' : item.priority === 'Medium' ? 'bg-amber-500/15 text-amber-500' : 'bg-slate-500/15 text-slate-400'}`}>
                                {item.priority}
                              </span>
                            </div>

                            <p className={`text-sm p-3 rounded-xl border leading-relaxed ${theme.subCard}`}>
                              {item.description}
                            </p>

                            {item.catatan_teknisi && (
                              <div className="text-xs text-indigo-400 bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20">
                                <span className="font-bold">Catatan Teknisi: </span>
                                {item.catatan_teknisi}
                              </div>
                            )}

                            <div className="flex items-center gap-4 pt-1">
                              {item.photo_url && (
                                <button
                                  type="button"
                                  onClick={() => setLightboxUrl(item.photo_url)}
                                  className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-500 hover:text-indigo-400 cursor-pointer"
                                >
                                  <img src={item.photo_url} alt="Foto" className="h-12 w-16 object-cover rounded-lg border border-slate-700/30" />
                                  <span className="underline">Lihat Foto</span>
                                </button>
                              )}
                              <span className={`text-xs ${theme.muted}`}>
                                Dilaporkan: {new Date(item.created_at).toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>

                          <div className={`flex sm:flex-col justify-between items-center sm:items-end border-t sm:border-t-0 pt-3 sm:pt-0 min-w-[140px] ${theme.divider}`}>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${item.status === 'Done' ? 'bg-emerald-500/15 text-emerald-500' : item.status === 'In Progress' ? 'bg-amber-500/15 text-amber-500' : 'bg-rose-500/15 text-rose-500'}`}>
                              {item.status}
                            </span>

                            {userRole === 'teknisi' ? (
                              <select
                                value={item.status}
                                onChange={(e) => onSelectStatus(item, e.target.value)}
                                className={`mt-2 text-xs font-semibold border rounded-xl px-2.5 py-1.5 cursor-pointer outline-none ${theme.input}`}
                              >
                                <option value="Open">Set: Open</option>
                                <option value="In Progress">Set: In Progress</option>
                                <option value="Done">Set: Done</option>
                              </select>
                            ) : (
                              <span className={`text-[11px] mt-2 italic ${theme.muted}`}>Akses: Teknisi</span>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          ) : activeMenu === 'pm' ? (
            /* ================= VIEW 3: PREVENTIVE MAINTENANCE ================= */
            <div className="space-y-6">
              <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row justify-between items-center gap-4 ${theme.card}`}>
                <div className="relative flex-1 w-full sm:w-auto">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari jadwal PM berdasarkan mesin atau lokasi..."
                    value={pmSearchQuery}
                    onChange={(e) => setPmSearchQuery(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 border rounded-xl text-sm outline-none transition ${theme.input}`}
                  />
                </div>
                {userRole === 'teknisi' && (
                  <button
                    onClick={() => setIsPmModalOpen(true)}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer shrink-0"
                  >
                    <Plus size={15} /> Buat Jadwal PM
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pmTersaring.map((pm) => (
                  <div key={pm.id} className={`p-5 rounded-2xl border space-y-3.5 flex flex-col justify-between ${theme.card}`}>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                          PM: {pm.interval_type}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${pm.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-500' : pm.status === 'In Progress' ? 'bg-amber-500/15 text-amber-500' : 'bg-rose-500/15 text-rose-500'}`}>
                          {pm.status}
                        </span>
                      </div>
                      <div>
                        <h3 className={`font-bold text-base ${theme.title}`}>{pm.asset_name}</h3>
                        <p className={`text-xs ${theme.muted}`}>Lokasi: {pm.location}</p>
                      </div>
                      <p className={`text-xs p-3 rounded-xl border leading-relaxed ${theme.subCard}`}>
                        {pm.description}
                      </p>
                    </div>

                    <div className={`pt-3 border-t space-y-2.5 ${theme.divider}`}>
                      <div className="flex justify-between items-center text-xs">
                        <span className={theme.muted}>Jatuh Tempo:</span>
                        <span className="font-semibold text-rose-500">{pm.next_due_date}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className={theme.muted}>PIC:</span>
                        <span className="font-medium">{pm.assigned_to}</span>
                      </div>

                      {userRole === 'teknisi' && (
                        <div className="pt-1">
                          <select
                            value={pm.status}
                            onChange={(e) => updatePmStatus(pm.id, e.target.value)}
                            className={`w-full text-xs font-semibold border rounded-xl px-2.5 py-1.5 cursor-pointer outline-none ${theme.input}`}
                          >
                            <option value="Scheduled">Status: Scheduled</option>
                            <option value="In Progress">Status: In Progress</option>
                            <option value="Completed">Status: Completed</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeMenu === 'spareparts' ? (
            /* ================= VIEW 4: INVENTARIS SPAREPARTS ================= */
            <div className="space-y-6">
              <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row justify-between items-center gap-4 ${theme.card}`}>
                <div className="relative flex-1 w-full sm:w-auto">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama komponen atau kode sparepart..."
                    value={partSearchQuery}
                    onChange={(e) => setPartSearchQuery(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 border rounded-xl text-sm outline-none transition ${theme.input}`}
                  />
                </div>
                {userRole === 'teknisi' && (
                  <button
                    onClick={() => setIsPartModalOpen(true)}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer shrink-0"
                  >
                    <Plus size={15} /> Tambah Sparepart
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {partsTersaring.map((part) => {
                  const isLow = part.stock <= part.min_stock;
                  return (
                    <div key={part.id} className={`p-5 rounded-2xl border space-y-3 ${theme.card} ${isLow ? 'border-l-4 border-l-rose-500' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                          <Package size={20} />
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isLow ? 'bg-rose-500/15 text-rose-500' : 'bg-emerald-500/15 text-emerald-500'}`}>
                          {isLow ? 'Stok Kritis' : 'Stok Aman'}
                        </span>
                      </div>
                      <div>
                        <h3 className={`font-bold text-base ${theme.title}`}>{part.part_name}</h3>
                        <p className={`text-xs mt-0.5 font-mono ${theme.muted}`}>Kode: {part.part_code}</p>
                      </div>
                      <div className={`pt-2 border-t flex justify-between items-center text-xs ${theme.divider}`}>
                        <span className={theme.muted}>Jumlah Stok:</span>
                        <span className={`font-bold text-sm ${isLow ? 'text-rose-500' : ''}`}>{part.stock} Pcs</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ================= VIEW 5: DAFTAR MESIN ================= */
            <div className="space-y-6">
              <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row justify-between items-center gap-4 ${theme.card}`}>
                <div className="relative flex-1 w-full sm:w-auto">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama mesin atau lokasi area..."
                    value={assetSearchQuery}
                    onChange={(e) => setAssetSearchQuery(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 border rounded-xl text-sm outline-none transition ${theme.input}`}
                  />
                </div>
                {userRole === 'teknisi' && (
                  <button
                    onClick={() => setIsAssetModalOpen(true)}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer shrink-0"
                  >
                    <Plus size={15} /> Tambah Mesin Baru
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assetsTersaring.map((asset) => (
                  <div key={asset.id} className={`p-5 rounded-2xl border space-y-3 ${theme.card}`}>
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                        <Server size={20} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-400">
                        Aset Aktif
                      </span>
                    </div>
                    <div>
                      <h3 className={`font-bold text-base ${theme.title}`}>{asset.asset_name}</h3>
                      <p className={`text-xs mt-1 ${theme.muted}`}>Lokasi: <span className="font-medium">{asset.location}</span></p>
                    </div>
                    <div className={`pt-2 border-t text-[11px] flex justify-between ${theme.divider} ${theme.muted}`}>
                      <span>Terdaftar:</span>
                      <span>{new Date(asset.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL TAMBAH ASET */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4 ${theme.card}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className={`text-base font-bold ${theme.title}`}>Daftarkan Mesin / Aset Baru</h3>
                <p className={`text-xs mt-0.5 ${theme.muted}`}>Aset terpusat untuk dropdown laporan & PM</p>
              </div>
              <button onClick={() => setIsAssetModalOpen(false)} className="text-slate-400 cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateAsset} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1">Nama Mesin / Aset</label>
                <input type="text" required placeholder="Contoh: Kompresor Utama #3" value={newAssetName} onChange={(e) => setNewAssetName(e.target.value)} className={`w-full border rounded-xl p-2.5 text-sm outline-none ${theme.input}`} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Lokasi / Area</label>
                <input type="text" required placeholder="Contoh: Gedung C - Ruang Utility" value={newAssetLocation} onChange={(e) => setNewAssetLocation(e.target.value)} className={`w-full border rounded-xl p-2.5 text-sm outline-none ${theme.input}`} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAssetModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl cursor-pointer">Batal</button>
                <button type="submit" className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer">Simpan Aset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PM */}
      {isPmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4 ${theme.card}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className={`text-base font-bold ${theme.title}`}>Buat Jadwal PM Baru</h3>
                <p className={`text-xs mt-0.5 ${theme.muted}`}>Atur jadwal pemeliharaan berkala</p>
              </div>
              <button onClick={() => setIsPmModalOpen(false)} className="text-slate-400 cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreatePm} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1">Pilih Mesin</label>
                <select value={pmAssetId} onChange={(e) => setPmAssetId(e.target.value)} required className={`w-full border rounded-xl p-2.5 text-sm outline-none ${theme.input}`}>
                  <option value="">-- Pilih Mesin --</option>
                  {assetsList.map((asset) => (
                    <option key={asset.id} value={asset.id}>{asset.asset_name} ({asset.location})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Interval</label>
                <select value={pmInterval} onChange={(e) => setPmInterval(e.target.value)} className={`w-full border rounded-xl p-2.5 text-sm outline-none ${theme.input}`}>
                  <option value="Harian">Harian</option>
                  <option value="Mingguan">Mingguan</option>
                  <option value="Bulanan">Bulanan</option>
                  <option value="Tahunan">Tahunan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Tanggal Jatuh Tempo</label>
                <input type="date" required value={pmDueDate} onChange={(e) => setPmDueDate(e.target.value)} className={`w-full border rounded-xl p-2.5 text-sm outline-none ${theme.input}`} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">PIC / Penanggung Jawab</label>
                <input type="text" placeholder="Contoh: Tim Mekanik" value={pmAssigned} onChange={(e) => setPmAssigned(e.target.value)} className={`w-full border rounded-xl p-2.5 text-sm outline-none ${theme.input}`} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Deskripsi Tugas</label>
                <textarea rows="2" placeholder="Ganti oli, cek filter..." value={pmDesc} onChange={(e) => setPmDesc(e.target.value)} className={`w-full border rounded-xl p-2.5 text-sm outline-none ${theme.input}`} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsPmModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl cursor-pointer">Batal</button>
                <button type="submit" className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer">Simpan PM</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH SPAREPART */}
      {isPartModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4 ${theme.card}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className={`text-base font-bold ${theme.title}`}>Tambah Komponen Sparepart</h3>
                <p className={`text-xs mt-0.5 ${theme.muted}`}>Daftarkan inventaris suku cadang baru</p>
              </div>
              <button onClick={() => setIsPartModalOpen(false)} className="text-slate-400 cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateSparepart} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1">Nama Sparepart</label>
                <input type="text" required placeholder="Contoh: Filter Oli Kompresor" value={partName} onChange={(e) => setPartName(e.target.value)} className={`w-full border rounded-xl p-2.5 text-sm outline-none ${theme.input}`} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Kode Suku Cadang (Opsional)</label>
                <input type="text" placeholder="Contoh: FLT-01" value={partCode} onChange={(e) => setPartCode(e.target.value)} className={`w-full border rounded-xl p-2.5 text-sm outline-none ${theme.input}`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Jumlah Stok</label>
                  <input type="number" required placeholder="12" value={partStock} onChange={(e) => setPartStock(e.target.value)} className={`w-full border rounded-xl p-2.5 text-sm outline-none ${theme.input}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Minimum Stok Kritis</label>
                  <input type="number" required placeholder="3" value={partMinStock} onChange={(e) => setPartMinStock(e.target.value)} className={`w-full border rounded-xl p-2.5 text-sm outline-none ${theme.input}`} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsPartModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl cursor-pointer">Batal</button>
                <button type="submit" className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer">Simpan Sparepart</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PENYELESAIAN LAPORAN */}
      {resolveModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4 ${theme.card}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className={`text-base font-bold ${theme.title}`}>Selesaikan Perbaikan</h3>
                <p className={`text-xs mt-0.5 ${theme.muted}`}>Aset: <span className="font-semibold text-indigo-500">{resolveModal.assetName}</span></p>
              </div>
              <button onClick={() => setResolveModal({ open: false, id: null, assetName: '' })} className="text-slate-400 cursor-pointer"><X size={18} /></button>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5">Catatan Tindakan Perbaikan</label>
              <textarea rows="3" autoFocus placeholder="Penggantian komponen dan uji coba normal..." value={techNote} onChange={(e) => setTechNote(e.target.value)} className={`w-full border rounded-xl p-3 text-sm outline-none ${theme.input}`} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setResolveModal({ open: false, id: null, assetName: '' })} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl cursor-pointer">Batal</button>
              <button type="button" onClick={() => commitStatusUpdate(resolveModal.id, 'Done', techNote)} className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer">Simpan & Tandai Done</button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX FOTO */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4 cursor-zoom-out">
          <div className="relative max-w-3xl max-h-[85vh]">
            <img src={lightboxUrl} alt="Bukti" className="max-h-[85vh] w-auto rounded-2xl shadow-2xl" />
            <button onClick={() => setLightboxUrl(null)} className="absolute -top-3 -right-3 bg-white text-slate-900 rounded-full p-1.5 shadow-lg cursor-pointer"><X size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}