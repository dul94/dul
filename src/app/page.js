'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  Wrench,
  AlertTriangle,
  CheckCircle,
  LogOut,
  Download,
  Search,
  X,
  Sun,
  Moon,
  Plus,
  Minus,
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
  Trash2,
  FolderKanban,
  Briefcase,
  FilePlus2,
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

const LOCAL_KEYS = {
  PROJECTS: 'cmms_pro_projects_v1',
  DAILY_WORK: 'cmms_pro_daily_work_v1',
  PROJECT_REPORTS: 'cmms_pro_project_reports_v1',
};

const DEFAULT_PROJECTS = [
  {
    id: 'proj-1',
    code: 'PRJ-001',
    name: 'Overhaul Panel Kontrol Utama Line 1',
    location: 'Area Produksi Line 1',
    pic: 'Budi Santoso',
    target_date: '2026-11-28',
    progress: 70,
    status: 'Berjalan',
    description: 'Penggantian komponen usang, perapihan wiring, dan pengujian interlock.',
  },
  {
    id: 'proj-2',
    code: 'PRJ-002',
    name: 'Fabrikasi Guarding Safety Mesin Press',
    location: 'Workshop / Line 2',
    pic: 'Dedi Kurniawan',
    target_date: '2026-12-05',
    progress: 35,
    status: 'Berjalan',
    description: 'Pembuatan pelindung operator sesuai standar keselamatan kerja.',
  },
];

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatManualDuration(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined || totalMinutes <= 0) return '-';
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}h ${hours}j ${minutes}m`;
  if (hours > 0 && minutes > 0) return `${hours} jam ${minutes} menit`;
  if (hours > 0) return `${hours} jam`;
  return `${minutes} menit`;
}

export default function CMMSProApp() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('operator');
  const [reports, setReports] = useState([]);
  const [assetsList, setAssetsList] = useState([]);
  const [pmSchedules, setPmSchedules] = useState([]);
  const [spareparts, setSpareparts] = useState([]);

  // State Modul Baru: Daftar Proyek, Laporan Pekerjaan Harian, Laporan Harian Proyek
  const [projectsList, setProjectsList] = useState([]);
  const [dailyWorkReports, setDailyWorkReports] = useState([]);
  const [projectDailyReports, setProjectDailyReports] = useState([]);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [inputReportTab, setInputReportTab] = useState('damage'); // 'damage' | 'daily-work' | 'project-report'
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

  // State Modal & Form Daftar Proyek
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projCode, setProjCode] = useState('');
  const [projName, setProjName] = useState('');
  const [projLocation, setProjLocation] = useState('');
  const [projPic, setProjPic] = useState('');
  const [projTargetDate, setProjTargetDate] = useState('');
  const [projProgress, setProjProgress] = useState('0');
  const [projStatus, setProjStatus] = useState('Berjalan');
  const [projDesc, setProjDesc] = useState('');
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [projectDetailModal, setProjectDetailModal] = useState({ open: false, project: null });
  const [editProjectProgress, setEditProjectProgress] = useState('0');
  const [editProjectStatus, setEditProjectStatus] = useState('Berjalan');
  const [savingProjectEdit, setSavingProjectEdit] = useState(false);

  // State Form & Filter Laporan Pekerjaan Harian
  const [dwDate, setDwDate] = useState('');
  const [dwShift, setDwShift] = useState('Shift 1');
  const [dwArea, setDwArea] = useState('');
  const [dwTitle, setDwTitle] = useState('');
  const [dwDescription, setDwDescription] = useState('');
  const [dwDuration, setDwDuration] = useState('');
  const [dwWorker, setDwWorker] = useState('');
  const [dwSearchQuery, setDwSearchQuery] = useState('');
  const [dwStartDate, setDwStartDate] = useState('');
  const [dwEndDate, setDwEndDate] = useState('');
  const [dwDetailModal, setDwDetailModal] = useState({ open: false, item: null });

  // State Form Laporan Harian Proyek
  const [prSelectedProjectId, setPrSelectedProjectId] = useState('');
  const [prDate, setPrDate] = useState('');
  const [prActivity, setPrActivity] = useState('');
  const [prProgress, setPrProgress] = useState('0');
  const [prObstacle, setPrObstacle] = useState('');
  const [prTeam, setPrTeam] = useState('');
  const [prSearchQuery, setPrSearchQuery] = useState('');
  const [prDetailModal, setPrDetailModal] = useState({ open: false, item: null });

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

  // State Filter & Pencarian Laporan Kerusakan
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [pmSearchQuery, setPmSearchQuery] = useState('');
  const [partSearchQuery, setPartSearchQuery] = useState('');

  // State UX
  const [toast, setToast] = useState(null);
  const [detailModal, setDetailModal] = useState({ open: false, report: null });
  const [resolveModal, setResolveModal] = useState({ open: false, id: null, assetName: '' });
  const [techName, setTechName] = useState('');
  const [repairHours, setRepairHours] = useState('');
  const [repairMinutes, setRepairMinutes] = useState('');
  const [techNote, setTechNote] = useState('');
  const [deleteAssetModal, setDeleteAssetModal] = useState({ open: false, id: null, name: '' });
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const isTechnician = userRole === 'teknisi';

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  function requireTechnician(actionLabel) {
    if (!isTechnician) {
      showToast(`Hanya role teknisi yang dapat ${actionLabel}.`, 'error');
      return false;
    }
    return true;
  }

  function openInputReportModule(tab = 'damage') {
    setInputReportTab(tab);
    setActiveMenu('input-report');
    setSidebarOpen(false);
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem('cmms-pro-theme');
    if (savedTheme === 'dark') setDarkMode(true);

    const today = getTodayDateString();
    setDwDate((prev) => prev || today);
    setPrDate((prev) => prev || today);
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
        fetchProjects(),
        fetchDailyWorkReports(),
        fetchProjectDailyReports(),
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

  // ================= FETCH & SAVE PROYEK, LAPORAN PEKERJAAN HARIAN & LAPORAN PROYEK =================
  async function fetchProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        setProjectsList(data);
        localStorage.setItem(LOCAL_KEYS.PROJECTS, JSON.stringify(data));
        return;
      }
    } catch (_) {}

    const saved = localStorage.getItem(LOCAL_KEYS.PROJECTS);
    if (saved) {
      setProjectsList(JSON.parse(saved));
    } else {
      setProjectsList(DEFAULT_PROJECTS);
      localStorage.setItem(LOCAL_KEYS.PROJECTS, JSON.stringify(DEFAULT_PROJECTS));
    }
  }

  async function persistProjects(nextList) {
    setProjectsList(nextList);
    localStorage.setItem(LOCAL_KEYS.PROJECTS, JSON.stringify(nextList));
  }

  async function fetchDailyWorkReports() {
    try {
      const { data, error } = await supabase
        .from('daily_work_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        setDailyWorkReports(data);
        localStorage.setItem(LOCAL_KEYS.DAILY_WORK, JSON.stringify(data));
        return;
      }
    } catch (_) {}

    const saved = localStorage.getItem(LOCAL_KEYS.DAILY_WORK);
    if (saved) setDailyWorkReports(JSON.parse(saved));
  }

  async function persistDailyWorkReports(nextList) {
    setDailyWorkReports(nextList);
    localStorage.setItem(LOCAL_KEYS.DAILY_WORK, JSON.stringify(nextList));
  }

  async function fetchProjectDailyReports() {
    try {
      const { data, error } = await supabase
        .from('project_daily_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        setProjectDailyReports(data);
        localStorage.setItem(LOCAL_KEYS.PROJECT_REPORTS, JSON.stringify(data));
        return;
      }
    } catch (_) {}

    const saved = localStorage.getItem(LOCAL_KEYS.PROJECT_REPORTS);
    if (saved) setProjectDailyReports(JSON.parse(saved));
  }

  async function persistProjectDailyReports(nextList) {
    setProjectDailyReports(nextList);
    localStorage.setItem(LOCAL_KEYS.PROJECT_REPORTS, JSON.stringify(nextList));
  }

  // ================= HANDLER PROYEK =================
  function openProjectDetailModal(proj) {
    setEditProjectProgress(String(proj.progress ?? 0));
    setEditProjectStatus(proj.status || 'Berjalan');
    setProjectDetailModal({ open: true, project: proj });
  }

  async function handleUpdateProjectProgress(e) {
    e.preventDefault();
    if (!projectDetailModal.project) return;
    if (!requireTechnician('mengubah progress atau status proyek')) return;

    setSavingProjectEdit(true);
    const currentProj = projectDetailModal.project;
    const nextProg = Math.min(100, Math.max(0, parseInt(editProjectProgress, 10) || 0));
    const nextStatus = nextProg === 100 ? 'Selesai' : editProjectStatus;

    const updatedList = projectsList.map((p) =>
      p.id === currentProj.id ? { ...p, progress: nextProg, status: nextStatus } : p
    );

    try {
      await supabase
        .from('projects')
        .update({ progress: nextProg, status: nextStatus })
        .eq('id', currentProj.id);
    } catch (_) {}

    await persistProjects(updatedList);
    setSavingProjectEdit(false);
    setProjectDetailModal({ open: false, project: null });
    showToast(`Progress ${currentProj.code} diperbarui menjadi ${nextProg}% (${nextStatus}).`);
  }

  function openCreateProjectModal() {
    if (!requireTechnician('menambah proyek baru')) return;
    const nextNum = String(projectsList.length + 1).padStart(3, '0');
    setProjCode(`PRJ-${nextNum}`);
    setProjName('');
    setProjLocation('');
    setProjPic(user?.email ? user.email.split('@')[0] : '');
    setProjTargetDate('');
    setProjProgress('0');
    setProjStatus('Berjalan');
    setProjDesc('');
    setIsProjectModalOpen(true);
  }

  async function handleCreateProject(e) {
    e.preventDefault();
    if (!requireTechnician('menambah proyek baru')) return;
    if (!projName.trim() || !projLocation.trim()) {
      showToast('Nama proyek dan lokasi wajib diisi.', 'error');
      return;
    }

    const parsedProgress = Math.min(100, Math.max(0, parseInt(projProgress, 10) || 0));
    const finalStatus = parsedProgress === 100 ? 'Selesai' : projStatus;

    const payload = {
      id: 'proj-' + Date.now(),
      code: projCode.trim() || `PRJ-${Date.now().toString().slice(-3)}`,
      name: projName.trim(),
      location: projLocation.trim(),
      pic: projPic.trim() || 'PIC Proyek',
      target_date: projTargetDate || '-',
      progress: parsedProgress,
      status: finalStatus,
      description: projDesc.trim() || '-',
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from('projects').insert([payload]).select();
      if (!error && data?.[0]) {
        await persistProjects([data[0], ...projectsList]);
      } else {
        await persistProjects([payload, ...projectsList]);
      }
    } catch (_) {
      await persistProjects([payload, ...projectsList]);
    }

    setIsProjectModalOpen(false);
    showToast('Proyek baru berhasil ditambahkan.');
  }

  async function handleDeleteProject(projectId) {
    if (!requireTechnician('menghapus proyek')) return;
    const updated = projectsList.filter((p) => p.id !== projectId);
    try {
      await supabase.from('projects').delete().eq('id', projectId);
    } catch (_) {}
    await persistProjects(updated);
    setProjectDetailModal({ open: false, project: null });
    showToast('Proyek berhasil dihapus.');
  }

  // ================= HANDLER LAPORAN PEKERJAAN HARIAN =================
  async function handleCreateDailyWork(e) {
    e.preventDefault();
    if (!dwTitle.trim() || !dwDescription.trim()) {
      showToast('Judul dan uraian pekerjaan harian wajib diisi.', 'error');
      return;
    }

    const payload = {
      id: 'dw-' + Date.now(),
      work_date: dwDate || getTodayDateString(),
      shift: dwShift,
      area: dwArea.trim() || 'Area Umum',
      title: dwTitle.trim(),
      description: dwDescription.trim(),
      duration_minutes: parseInt(dwDuration, 10) || 0,
      worker_name: dwWorker.trim() || (user?.email ? user.email.split('@')[0] : 'Teknisi'),
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from('daily_work_reports').insert([payload]).select();
      if (!error && data?.[0]) {
        await persistDailyWorkReports([data[0], ...dailyWorkReports]);
      } else {
        await persistDailyWorkReports([payload, ...dailyWorkReports]);
      }
    } catch (_) {
      await persistDailyWorkReports([payload, ...dailyWorkReports]);
    }

    setDwTitle('');
    setDwDescription('');
    setDwDuration('');
    showToast('Laporan pekerjaan harian berhasil disimpan.');
  }

  async function handleDeleteDailyWork(id) {
    if (!requireTechnician('menghapus laporan pekerjaan harian')) return;
    const updated = dailyWorkReports.filter((item) => item.id !== id);
    try {
      await supabase.from('daily_work_reports').delete().eq('id', id);
    } catch (_) {}
    await persistDailyWorkReports(updated);
    setDwDetailModal({ open: false, item: null });
    showToast('Laporan pekerjaan harian dihapus.');
  }

  // ================= HANDLER LAPORAN HARIAN PROYEK =================
  function handleSelectProjectInReport(e) {
    const id = e.target.value;
    setPrSelectedProjectId(id);
    const found = projectsList.find((p) => p.id === id);
    if (found) {
      setPrProgress(String(found.progress ?? 0));
    }
  }

  async function handleCreateProjectReport(e) {
    e.preventDefault();
    const foundProj = projectsList.find((p) => p.id === prSelectedProjectId);
    if (!foundProj) {
      showToast('Pilih proyek terlebih dahulu.', 'error');
      return;
    }
    if (!prActivity.trim()) {
      showToast('Uraian pekerjaan proyek wajib diisi.', 'error');
      return;
    }

    const nextProg = Math.min(100, Math.max(0, parseInt(prProgress, 10) || 0));

    const payload = {
      id: 'pr-' + Date.now(),
      project_id: foundProj.id,
      project_code: foundProj.code,
      project_name: foundProj.name,
      report_date: prDate || getTodayDateString(),
      activity: prActivity.trim(),
      progress: nextProg,
      obstacle: prObstacle.trim() || 'Tidak ada kendala',
      team_name: prTeam.trim() || foundProj.pic || 'Tim Proyek',
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from('project_daily_reports').insert([payload]).select();
      if (!error && data?.[0]) {
        await persistProjectDailyReports([data[0], ...projectDailyReports]);
      } else {
        await persistProjectDailyReports([payload, ...projectDailyReports]);
      }
    } catch (_) {
      await persistProjectDailyReports([payload, ...projectDailyReports]);
    }

    const updatedProjects = projectsList.map((p) => {
      if (p.id === foundProj.id) {
        return {
          ...p,
          progress: nextProg,
          status: nextProg === 100 ? 'Selesai' : p.status === 'Selesai' ? 'Berjalan' : p.status,
        };
      }
      return p;
    });
    try {
      await supabase
        .from('projects')
        .update({
          progress: nextProg,
          status: nextProg === 100 ? 'Selesai' : 'Berjalan',
        })
        .eq('id', foundProj.id);
    } catch (_) {}
    await persistProjects(updatedProjects);

    setPrActivity('');
    setPrObstacle('');
    showToast(`Laporan harian proyek disimpan & progress ${foundProj.code} menjadi ${nextProg}%`);
  }

  async function handleDeleteProjectReport(id) {
    if (!requireTechnician('menghapus laporan harian proyek')) return;
    const updated = projectDailyReports.filter((item) => item.id !== id);
    try {
      await supabase.from('project_daily_reports').delete().eq('id', id);
    } catch (_) {}
    await persistProjectDailyReports(updated);
    setPrDetailModal({ open: false, item: null });
    showToast('Laporan harian proyek dihapus.');
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

  async function confirmDeleteAsset() {
    if (!deleteAssetModal.id) return;

    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', deleteAssetModal.id);

    if (!error) {
      showToast(`Mesin "${deleteAssetModal.name}" berhasil dihapus.`);
      setDeleteAssetModal({ open: false, id: null, name: '' });
      fetchAssets();
    } else {
      showToast('Gagal menghapus mesin: ' + error.message, 'error');
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

  async function updatePartStock(partId, currentStock, delta) {
    if (!isTechnician) {
      showToast('Hanya teknisi yang dapat memperbarui stok sparepart!', 'error');
      return;
    }

    const newStock = Math.max(0, currentStock + delta);

    const { error } = await supabase
      .from('spareparts')
      .update({ stock: newStock })
      .eq('id', partId);

    if (!error) {
      showToast(`Stok diperbarui menjadi ${newStock} Pcs`);
      fetchSpareparts();
    } else {
      showToast('Gagal memperbarui stok: ' + error.message, 'error');
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
        stock: parseInt(partStock, 10) || 0,
        min_stock: parseInt(partMinStock, 10) || 5,
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

  const stats = useMemo(() => {
    const total = reports.length;
    const open = reports.filter((item) => item.status === 'Open').length;
    const progress = reports.filter((item) => item.status === 'In Progress').length;
    const doneReports = reports.filter((item) => item.status === 'Done');
    const done = doneReports.length;
    const highPriority = reports.filter((item) => item.priority === 'High' && item.status !== 'Done');
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;

    let avgRepairText = '-';
    const validCompleted = doneReports.filter((r) => r.durasi_menit && r.durasi_menit > 0);
    if (validCompleted.length > 0) {
      const totalMins = validCompleted.reduce((acc, r) => acc + r.durasi_menit, 0);
      const avgMinutes = Math.round(totalMins / validCompleted.length);
      const h = Math.floor(avgMinutes / 60);
      const m = avgMinutes % 60;
      avgRepairText = h > 0 ? `${h}j ${m}m` : `${m}m`;
    }

    const pmTotal = pmSchedules.length;
    const pmDone = pmSchedules.filter((i) => i.status === 'Completed').length;
    const lowStockParts = spareparts.filter((p) => p.stock <= p.min_stock).length;
    const activeProjectsCount = projectsList.filter((p) => p.status !== 'Selesai').length;

    return {
      total,
      open,
      progress,
      done,
      rate,
      avgRepairText,
      highPriority,
      pmTotal,
      pmDone,
      lowStockParts,
      activeProjectsCount,
      dailyWorkCount: dailyWorkReports.length,
      projectReportsCount: projectDailyReports.length,
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
  }, [reports, pmSchedules, spareparts, projectsList, dailyWorkReports, projectDailyReports]);

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

  const projectsTersaring = useMemo(() => {
    const q = projectSearchQuery.toLowerCase();
    return projectsList.filter(
      (p) =>
        !q ||
        p.code?.toLowerCase().includes(q) ||
        p.name?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        p.pic?.toLowerCase().includes(q)
    );
  }, [projectsList, projectSearchQuery]);

  const dailyWorkTersaring = useMemo(() => {
    const q = dwSearchQuery.toLowerCase();
    return dailyWorkReports.filter((d) => {
      const cocokCari =
        !q ||
        d.title?.toLowerCase().includes(q) ||
        d.area?.toLowerCase().includes(q) ||
        d.worker_name?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q);

      const tgl = d.work_date || '';
      const cocokMulai = !dwStartDate || tgl >= dwStartDate;
      const cocokSelesai = !dwEndDate || tgl <= dwEndDate;

      return cocokCari && cocokMulai && cocokSelesai;
    });
  }, [dailyWorkReports, dwSearchQuery, dwStartDate, dwEndDate]);

  const projectReportsTersaring = useMemo(() => {
    const q = prSearchQuery.toLowerCase();
    return projectDailyReports.filter(
      (r) =>
        !q ||
        r.project_name?.toLowerCase().includes(q) ||
        r.project_code?.toLowerCase().includes(q) ||
        r.activity?.toLowerCase().includes(q) ||
        r.team_name?.toLowerCase().includes(q)
    );
  }, [projectDailyReports, prSearchQuery]);

  const riwayatLaporanProyekTerpilih = useMemo(() => {
    const targetProject = projectDetailModal.project;
    if (!targetProject) return [];

    return projectDailyReports
      .filter(
        (r) =>
          r.project_id === targetProject.id ||
          (!r.project_id && r.project_code === targetProject.code)
      )
      .sort(
        (a, b) =>
          new Date(b.report_date || b.created_at) - new Date(a.report_date || a.created_at)
      );
  }, [projectDetailModal.project, projectDailyReports]);

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
      'Teknisi Penanganan': item.nama_teknisi || '-',
      'Lama Pengerjaan': formatManualDuration(item.durasi_menit),
      'Catatan Teknisi': item.catatan_teknisi || 'Belum ada catatan',
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan CMMS Pro');
    XLSX.writeFile(workbook, `Rekap_CMMS_Pro_${getTodayDateString()}.xlsx`);
    showToast(`Berhasil mengekspor ${laporanTersaring.length} data.`);
  }

  function exportDailyWorkToExcel() {
    if (dailyWorkTersaring.length === 0) {
      showToast('Tidak ada data pekerjaan harian untuk diunduh!', 'error');
      return;
    }
    const formattedData = dailyWorkTersaring.map((dw, index) => ({
      No: index + 1,
      Tanggal: dw.work_date || '-',
      Shift: dw.shift || '-',
      'Area / Lokasi': dw.area || '-',
      'Judul Pekerjaan': dw.title || '-',
      'Uraian Pekerjaan': dw.description || '-',
      'Durasi (Menit)': dw.duration_minutes ?? 0,
      'Lama Pengerjaan': formatManualDuration(dw.duration_minutes),
      Pelaksana: dw.worker_name || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pekerjaan Harian');
    XLSX.writeFile(workbook, `Laporan_Pekerjaan_Harian_${getTodayDateString()}.xlsx`);
    showToast(`Berhasil mengekspor ${dailyWorkTersaring.length} laporan pekerjaan harian.`);
  }

  function exportProjectReportsToExcel() {
    if (projectReportsTersaring.length === 0) {
      showToast('Tidak ada data laporan harian proyek untuk diunduh!', 'error');
      return;
    }
    const formattedData = projectReportsTersaring.map((pr, index) => ({
      No: index + 1,
      Tanggal: pr.report_date || '-',
      'Kode Proyek': pr.project_code || '-',
      'Nama Proyek': pr.project_name || '-',
      'Uraian Pekerjaan': pr.activity || '-',
      'Progress (%)': pr.progress ?? 0,
      Kendala: pr.obstacle || 'Tidak ada kendala',
      'Tim Pelaksana': pr.team_name || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Harian Proyek');
    XLSX.writeFile(workbook, `Laporan_Harian_Proyek_${getTodayDateString()}.xlsx`);
    showToast(`Berhasil mengekspor ${projectReportsTersaring.length} laporan harian proyek.`);
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

    const finalAssetName = customAssetName;
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
    if (!isTechnician) {
      showToast('Hanya teknisi yang dapat memperbarui status perbaikan!', 'error');
      return;
    }
    if (statusBaru === 'Done') {
      setTechNote(item.catatan_teknisi || '');
      setTechName(item.nama_teknisi || (user?.email ? user.email.split('@')[0] : ''));
      const existingMins = item.durasi_menit || 0;
      setRepairHours(existingMins > 0 ? String(Math.floor(existingMins / 60)) : '');
      setRepairMinutes(existingMins > 0 ? String(existingMins % 60) : '');
      setResolveModal({ open: true, id: item.id, assetName: item.asset_name });
      return;
    }
    commitStatusUpdate(item.id, statusBaru, null, null, null);
  }

  async function commitStatusUpdate(id, statusBaru, catatan, totalMenitInput, namaTeknisiInput) {
    const dataUpdate = { status: statusBaru };

    if (statusBaru === 'Done') {
      dataUpdate.resolved_at = new Date().toISOString();
      dataUpdate.durasi_menit = totalMenitInput || 0;
      dataUpdate.nama_teknisi = namaTeknisiInput?.trim() || 'Tim Teknisi';
    } else {
      dataUpdate.resolved_at = null;
      dataUpdate.durasi_menit = null;
      dataUpdate.nama_teknisi = null;
    }

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

  function handleSaveResolution() {
    if (!techName.trim()) {
      showToast('Nama teknisi yang menangani wajib diisi.', 'error');
      return;
    }

    const hrs = parseInt(repairHours, 10) || 0;
    const mins = parseInt(repairMinutes, 10) || 0;
    const totalMenit = hrs * 60 + mins;

    if (totalMenit <= 0) {
      showToast('Masukkan lama pengerjaan (jam atau menit) minimal 1 menit.', 'error');
      return;
    }

    commitStatusUpdate(resolveModal.id, 'Done', techNote, totalMenit, techName);
  }

  async function updatePmStatus(pmId, newStatus) {
    if (!isTechnician) {
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

  const pageHeaderText = useMemo(() => {
    switch (activeMenu) {
      case 'dashboard':
        return { title: 'Dashboard Eksekutif CMMS Pro', sub: 'Sistem pemeliharaan terintegrasi enterprise tingkat lanjut' };
      case 'input-report':
        return { title: 'Input Laporan Terpadu', sub: 'Catat laporan kerusakan, pekerjaan harian, atau harian proyek dalam satu modul' };
      case 'reports':
        return { title: 'Manajemen Laporan Kerusakan', sub: 'Daftar laporan kerusakan ringkas dengan modal detail' };
      case 'projects':
        return { title: 'Daftar Proyek Maintenance', sub: 'Kelola proyek, target selesai, PIC, dan progress' };
      case 'daily-work':
        return { title: 'Laporan Pekerjaan Harian', sub: 'Rekap aktivitas & pekerjaan harian tim maintenance' };
      case 'project-reports':
        return { title: 'Laporan Harian Proyek', sub: 'Rekap progres harian proyek secara terintegrasi' };
      case 'pm':
        return { title: 'Preventive Maintenance Terjadwal', sub: 'Pemeliharaan berkala mesin & aset' };
      case 'spareparts':
        return { title: 'Inventaris Gudang Suku Cadang', sub: 'Stok & batas minimum suku cadang' };
      default:
        return { title: 'Master Data Mesin & Aset', sub: 'Daftar aset dan lokasi mesin terdaftar' };
    }
  }, [activeMenu]);

  const theme = {
    page: darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900',
    nav: darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200/80',
    sidebar: darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80',
    card: darkMode ? 'bg-slate-900 border-slate-800 shadow-none' : 'bg-white border-slate-200/80 shadow-sm',
    subCard: darkMode ? 'bg-slate-800/70 border-slate-700/80 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600',
    input: darkMode
      ? 'bg-slate-800/80 focus:bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-indigo-500'
      : 'bg-slate-50 focus:bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500',
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
            toast.type === 'error'
              ? 'bg-rose-600 text-white'
              : darkMode
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-900 text-white'
          }`}
        >
          {toast.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle size={15} className="text-emerald-300" />}
          <span>{toast.message}</span>
        </div>
      )}

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
              <div className="bg-linear-to-br from-indigo-600 to-blue-600 p-2.5 rounded-xl text-white shadow-md">
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

          <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-12rem)]">
            <div className="space-y-1">
              <p className={`text-[11px] font-bold uppercase tracking-wider px-3 mb-2 ${theme.muted}`}>
                Modul Utama
              </p>
              {[
                { id: 'dashboard', label: 'Dashboard Analitik', icon: LayoutDashboard },
                { id: 'input-report', label: 'Input Laporan', icon: FilePlus2 },
                { id: 'reports', label: `Daftar Laporan (${stats.total})`, icon: ClipboardList },
                { id: 'daily-work', label: `Pekerjaan Harian (${stats.dailyWorkCount})`, icon: Briefcase },
                { id: 'projects', label: `Daftar Proyek (${projectsList.length})`, icon: FolderKanban },
                { id: 'project-reports', label: `Laporan Proyek (${stats.projectReportsCount})`, icon: FileText },
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
                    <IconComp size={16} /> <span className="truncate">{m.label}</span>
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
                  {pageHeaderText.title}
                </h1>
                <p className={`text-[11px] hidden sm:block ${theme.muted}`}>
                  {pageHeaderText.sub}
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
          {activeMenu === 'dashboard' && (
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
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                  <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Rata-rata Pengerjaan</p>
                  <div className="flex items-baseline justify-between mt-2">
                    <p className={`text-3xl font-extrabold ${theme.title}`}>{stats.avgRepairText}</p>
                    <span className={`text-[11px] ${theme.muted}`}>MTTR Teknisi</span>
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border relative overflow-hidden ${theme.card}`}>
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
                  <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Proyek Aktif</p>
                  <div className="flex items-baseline justify-between mt-2">
                    <p className={`text-3xl font-extrabold ${theme.title}`}>{stats.activeProjectsCount}</p>
                    <span className={`text-[11px] ${theme.muted}`}>dari {projectsList.length} Proyek</span>
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border relative overflow-hidden ${theme.card}`}>
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
                  <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Stok Menipis</p>
                  <div className="flex items-baseline justify-between mt-2">
                    <p className={`text-3xl font-extrabold ${theme.title}`}>{stats.lowStockParts}</p>
                    <span className={`text-[11px] ${theme.muted}`}>Perlu Restock</span>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`p-5 rounded-2xl border ${theme.card}`}>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className={`text-sm font-bold ${theme.title}`}>Distribusi Status Tiket</h2>
                      <p className={`text-xs ${theme.muted}`}>Open, In Progress, dan Done</p>
                    </div>
                  </div>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.grafikStatus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridStroke} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: darkMode ? '#1e293b' : '#f8fafc', radius: 8 }}
                          contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: darkMode ? '#1e293b' : '#0f172a',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="jumlah" radius={[8, 8, 0, 0]} barSize={36}>
                          {stats.grafikStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border ${theme.card}`}>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className={`text-sm font-bold ${theme.title}`}>Prioritas Gangguan</h2>
                      <p className={`text-xs ${theme.muted}`}>Low, Medium, dan High</p>
                    </div>
                  </div>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.grafikPrioritas} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridStroke} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: darkMode ? '#94a3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: darkMode ? '#1e293b' : '#f8fafc', radius: 8 }}
                          contentStyle={{
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: darkMode ? '#1e293b' : '#0f172a',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="jumlah" radius={[8, 8, 0, 0]} barSize={36}>
                          {stats.grafikPrioritas.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* MODUL TERPADU: INPUT LAPORAN (KERUSAKAN, PEKERJAAN HARIAN, HARIAN PROYEK) */}
          {activeMenu === 'input-report' && (
            <div className="max-w-3xl mx-auto">
              <div className={`p-6 rounded-2xl border space-y-5 ${theme.card}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className={`text-base font-extrabold ${theme.title}`}>Form Input Laporan</h2>
                    <p className={`text-xs ${theme.muted}`}>
                      Pilih jenis laporan yang ingin dicatat hari ini
                    </p>
                  </div>
                </div>

                {/* Tab Pemilih Jenis Laporan */}
                <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-xl border ${theme.subCard}`}>
                  {[
                    { id: 'damage', label: 'Laporan Kerusakan', icon: Wrench },
                    { id: 'daily-work', label: 'Pekerjaan Harian', icon: Briefcase },
                    { id: 'project-report', label: 'Laporan Proyek', icon: FolderKanban },
                  ].map((tab) => {
                    const TabIcon = tab.icon;
                    const active = inputReportTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setInputReportTab(tab.id)}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                          active
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : darkMode
                            ? 'text-slate-300 hover:bg-slate-800/80'
                            : 'text-slate-600 hover:bg-white'
                        }`}
                      >
                        <TabIcon size={14} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 1. FORM LAPORAN KERUSAKAN */}
                {inputReportTab === 'damage' && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${theme.muted}`}>Pilih Mesin / Aset</label>
                      <select
                        value={selectedAssetId}
                        onChange={handleAssetSelectChange}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                      >
                        <option value="">-- Pilih Aset Terdaftar --</option>
                        {assetsList.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.asset_name} ({a.location})
                          </option>
                        ))}
                        <option value="custom">+ Input Manual Nama Mesin</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${theme.muted}`}>Nama Mesin / Aset *</label>
                      <input
                        type="text"
                        value={customAssetName}
                        onChange={(e) => setCustomAssetName(e.target.value)}
                        placeholder="Contoh: Motor Conveyor Line 1"
                        required
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${theme.muted}`}>Lokasi / Area *</label>
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Contoh: Area Produksi A"
                          required
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${theme.muted}`}>Prioritas</label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${theme.muted}`}>Deskripsi Kerusakan *</label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Jelaskan kondisi atau gejala kerusakan..."
                        required
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${theme.muted}`}>Foto Kerusakan (Opsional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className={`w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer ${theme.muted}`}
                      />
                      {photoPreview && (
                        <div className="mt-2 relative inline-block">
                          <img src={photoPreview} alt="Preview" className="h-24 w-auto rounded-xl object-cover border" />
                          <button
                            type="button"
                            onClick={clearPhoto}
                            className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold transition cursor-pointer"
                    >
                      {loading ? 'Mengirim...' : 'Kirim Laporan Kerusakan'}
                    </button>
                  </form>
                )}

                {/* 2. FORM LAPORAN PEKERJAAN HARIAN */}
                {inputReportTab === 'daily-work' && (
                  <form onSubmit={handleCreateDailyWork} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${theme.muted}`}>Tanggal *</label>
                        <input
                          type="date"
                          value={dwDate}
                          onChange={(e) => setDwDate(e.target.value)}
                          required
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${theme.muted}`}>Shift *</label>
                        <select
                          value={dwShift}
                          onChange={(e) => setDwShift(e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                        >
                          <option value="Shift 1">Shift 1 (Pagi)</option>
                          <option value="Shift 2">Shift 2 (Sore)</option>
                          <option value="Shift 3">Shift 3 (Malam)</option>
                          <option value="Non-Shift">Non-Shift</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${theme.muted}`}>Area / Lokasi</label>
                        <input
                          type="text"
                          value={dwArea}
                          onChange={(e) => setDwArea(e.target.value)}
                          placeholder="Contoh: Line 2 / Utility"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${theme.muted}`}>Durasi (Menit)</label>
                        <input
                          type="number"
                          min="0"
                          value={dwDuration}
                          onChange={(e) => setDwDuration(e.target.value)}
                          placeholder="Contoh: 120"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${theme.muted}`}>Judul Pekerjaan *</label>
                      <input
                        type="text"
                        value={dwTitle}
                        onChange={(e) => setDwTitle(e.target.value)}
                        placeholder="Contoh: Pembersihan panel & pengecekan sensor"
                        required
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${theme.muted}`}>Uraian Pekerjaan *</label>
                      <textarea
                        rows={3}
                        value={dwDescription}
                        onChange={(e) => setDwDescription(e.target.value)}
                        placeholder="Detail pekerjaan harian yang dilaksanakan..."
                        required
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${theme.muted}`}>Pelaksana / Teknisi</label>
                      <input
                        type="text"
                        value={dwWorker}
                        onChange={(e) => setDwWorker(e.target.value)}
                        placeholder="Nama teknisi / tim"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition cursor-pointer"
                    >
                      Simpan Pekerjaan Harian
                    </button>
                  </form>
                )}

                {/* 3. FORM LAPORAN HARIAN PROYEK */}
                {inputReportTab === 'project-report' && (
                  <form onSubmit={handleCreateProjectReport} className="space-y-4">
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${theme.muted}`}>Pilih Proyek *</label>
                      <select
                        value={prSelectedProjectId}
                        onChange={handleSelectProjectInReport}
                        required
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                      >
                        <option value="">-- Pilih Proyek --</option>
                        {projectsList.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{p.code}] {p.name} ({p.progress ?? 0}%)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${theme.muted}`}>Tanggal *</label>
                        <input
                          type="date"
                          value={prDate}
                          onChange={(e) => setPrDate(e.target.value)}
                          required
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-semibold mb-1.5 ${theme.muted}`}>Progress Baru (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={prProgress}
                          onChange={(e) => setPrProgress(e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${theme.muted}`}>Uraian Pekerjaan Proyek *</label>
                      <textarea
                        rows={3}
                        value={prActivity}
                        onChange={(e) => setPrActivity(e.target.value)}
                        placeholder="Progres pekerjaan proyek yang dikerjakan hari ini..."
                        required
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${theme.muted}`}>Kendala (Jika Ada)</label>
                      <input
                        type="text"
                        value={prObstacle}
                        onChange={(e) => setPrObstacle(e.target.value)}
                        placeholder="Contoh: Tidak ada / Menunggu material"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${theme.muted}`}>Tim Pelaksana</label>
                      <input
                        type="text"
                        value={prTeam}
                        onChange={(e) => setPrTeam(e.target.value)}
                        placeholder="Nama anggota tim proyek"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${theme.input}`}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition cursor-pointer"
                    >
                      Simpan & Update Progress Proyek
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {activeMenu === 'reports' && (
            <div className={`rounded-2xl border overflow-hidden ${theme.card}`}>
              <div className={`p-5 border-b space-y-3 ${theme.divider}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className={`text-base font-extrabold ${theme.title}`}>
                      Daftar Laporan ({laporanTersaring.length})
                    </h2>
                    <p className={`text-xs ${theme.muted}`}>Klik Detail untuk melihat informasi lengkap</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openInputReportModule('damage')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer"
                    >
                      <Plus size={14} /> Input Laporan
                    </button>
                    <button
                      type="button"
                      onClick={exportToExcel}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                    >
                      <Download size={14} /> Export Excel
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="relative sm:col-span-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari mesin / lokasi..."
                      className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs outline-none ${theme.input}`}
                    />
                  </div>
                  <input
                    type="date"
                    value={tanggalMulai}
                    onChange={(e) => setTanggalMulai(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${theme.input}`}
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={tanggalSelesai}
                      onChange={(e) => setTanggalSelesai(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${theme.input}`}
                    />
                    {isFiltered && (
                      <button
                        type="button"
                        onClick={resetFilter}
                        className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:opacity-80 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {laporanTersaring.map((item) => (
                  <div
                    key={item.id}
                    className="py-3.5 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-bold truncate ${theme.title}`}>{item.asset_name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.priority === 'High'
                              ? 'bg-rose-500/15 text-rose-500'
                              : item.priority === 'Medium'
                              ? 'bg-amber-500/15 text-amber-500'
                              : 'bg-slate-500/15 text-slate-400'
                          }`}
                        >
                          {item.priority}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'Done'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : item.status === 'In Progress'
                              ? 'bg-amber-500/15 text-amber-500'
                              : 'bg-rose-500/15 text-rose-500'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className={`text-xs ${theme.muted}`}>
                        {item.location} • {new Date(item.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDetailModal({ open: true, report: item })}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition shrink-0 cursor-pointer"
                    >
                      Detail
                    </button>
                  </div>
                ))}

                {laporanTersaring.length === 0 && (
                  <div className={`py-12 text-center text-xs ${theme.muted}`}>
                    Tidak ada laporan yang sesuai dengan filter.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeMenu === 'daily-work' && (
            <div className={`rounded-2xl border overflow-hidden ${theme.card}`}>
              <div className={`p-5 border-b space-y-3 ${theme.divider}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className={`text-base font-extrabold ${theme.title}`}>
                      Daftar Pekerjaan Harian ({dailyWorkTersaring.length})
                    </h2>
                    <p className={`text-xs ${theme.muted}`}>Klik Detail untuk melihat uraian lengkap</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openInputReportModule('daily-work')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer"
                    >
                      <Plus size={14} /> Input Pekerjaan
                    </button>
                    <button
                      type="button"
                      onClick={exportDailyWorkToExcel}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                    >
                      <Download size={14} /> Export Excel
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="relative sm:col-span-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={dwSearchQuery}
                      onChange={(e) => setDwSearchQuery(e.target.value)}
                      placeholder="Cari pekerjaan / area..."
                      className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs outline-none ${theme.input}`}
                    />
                  </div>
                  <input
                    type="date"
                    value={dwStartDate}
                    onChange={(e) => setDwStartDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${theme.input}`}
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dwEndDate}
                      onChange={(e) => setDwEndDate(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${theme.input}`}
                    />
                    {(dwSearchQuery || dwStartDate || dwEndDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setDwSearchQuery('');
                          setDwStartDate('');
                          setDwEndDate('');
                        }}
                        className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:opacity-80 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {dailyWorkTersaring.map((dw) => (
                  <div
                    key={dw.id}
                    className="py-3.5 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-bold truncate ${theme.title}`}>{dw.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400">
                          {dw.shift}
                        </span>
                      </div>
                      <p className={`text-xs ${theme.muted}`}>
                        {dw.area} • {dw.worker_name} • {dw.work_date}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDwDetailModal({ open: true, item: dw })}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition shrink-0 cursor-pointer"
                    >
                      Detail
                    </button>
                  </div>
                ))}

                {dailyWorkTersaring.length === 0 && (
                  <div className={`py-12 text-center text-xs ${theme.muted}`}>
                    Belum ada laporan pekerjaan harian.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeMenu === 'projects' && (
            <div className={`p-6 rounded-2xl border space-y-4 ${theme.card}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className={`text-base font-extrabold ${theme.title}`}>Daftar Proyek</h2>
                  <p className={`text-xs ${theme.muted}`}>Pantau status dan progress proyek maintenance</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={projectSearchQuery}
                      onChange={(e) => setProjectSearchQuery(e.target.value)}
                      placeholder="Cari proyek / PIC..."
                      className={`pl-8 pr-3 py-2 rounded-xl border text-xs outline-none ${theme.input}`}
                    />
                  </div>
                  {isTechnician && (
                    <button
                      type="button"
                      onClick={openCreateProjectModal}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                    >
                      <Plus size={14} /> Tambah Proyek
                    </button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {projectsTersaring.map((proj) => (
                  <div
                    key={proj.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400">
                          {proj.code}
                        </span>
                        <p className={`text-sm font-bold truncate ${theme.title}`}>{proj.name}</p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            proj.status === 'Selesai'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : proj.status === 'Tertunda'
                              ? 'bg-amber-500/15 text-amber-500'
                              : 'bg-indigo-500/15 text-indigo-400'
                          }`}
                        >
                          {proj.status} ({proj.progress ?? 0}%)
                        </span>
                      </div>
                      <p className={`text-xs ${theme.muted}`}>
                        {proj.location} • PIC: {proj.pic} • Target: {proj.target_date}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openProjectDetailModal(proj)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition shrink-0 cursor-pointer"
                    >
                      Detail
                    </button>
                  </div>
                ))}

                {projectsTersaring.length === 0 && (
                  <p className={`py-8 text-center text-xs ${theme.muted}`}>Belum ada proyek terdaftar.</p>
                )}
              </div>
            </div>
          )}

          {activeMenu === 'project-reports' && (
            <div className={`rounded-2xl border overflow-hidden ${theme.card}`}>
              <div className={`p-5 border-b space-y-3 ${theme.divider}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className={`text-base font-extrabold ${theme.title}`}>
                      Daftar Laporan Harian Proyek ({projectReportsTersaring.length})
                    </h2>
                    <p className={`text-xs ${theme.muted}`}>Klik Detail untuk melihat catatan lengkap</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openInputReportModule('project-report')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer"
                    >
                      <Plus size={14} /> Input Laporan Proyek
                    </button>
                    <button
                      type="button"
                      onClick={exportProjectReportsToExcel}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                    >
                      <Download size={14} /> Export Excel
                    </button>
                  </div>
                </div>

                <div className="relative w-full">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={prSearchQuery}
                    onChange={(e) => setPrSearchQuery(e.target.value)}
                    placeholder="Cari proyek / aktivitas / tim..."
                    className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs outline-none ${theme.input}`}
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {projectReportsTersaring.map((pr) => (
                  <div
                    key={pr.id}
                    className="py-3.5 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400">
                          {pr.project_code}
                        </span>
                        <span className={`text-sm font-bold truncate ${theme.title}`}>{pr.project_name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                          {pr.progress}%
                        </span>
                      </div>
                      <p className={`text-xs ${theme.muted}`}>
                        {pr.team_name} • {pr.report_date}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPrDetailModal({ open: true, item: pr })}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition shrink-0 cursor-pointer"
                    >
                      Detail
                    </button>
                  </div>
                ))}

                {projectReportsTersaring.length === 0 && (
                  <div className={`py-12 text-center text-xs ${theme.muted}`}>
                    Belum ada laporan harian proyek.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeMenu === 'pm' && (
            <div className={`p-6 rounded-2xl border space-y-4 ${theme.card}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className={`text-base font-extrabold ${theme.title}`}>Jadwal Preventive Maintenance</h2>
                  <p className={`text-xs ${theme.muted}`}>Pemeliharaan berkala mesin & aset</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pmSearchQuery}
                    onChange={(e) => setPmSearchQuery(e.target.value)}
                    placeholder="Cari jadwal PM..."
                    className={`px-3 py-2 rounded-xl border text-xs outline-none ${theme.input}`}
                  />
                  <button
                    type="button"
                    onClick={() => setIsPmModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                  >
                    <Plus size={14} /> Jadwal PM
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {pmTersaring.map((pm) => (
                  <div key={pm.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className={`text-sm font-bold ${theme.title}`}>{pm.asset_name}</p>
                      <p className={`text-xs ${theme.muted}`}>
                        {pm.location} • {pm.interval_type} • Jatuh tempo: {pm.next_due_date} • PIC: {pm.assigned_to}
                      </p>
                      <p className={`text-xs mt-0.5 ${theme.muted}`}>{pm.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500">
                        {pm.status}
                      </span>
                      {isTechnician && pm.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={() => updatePmStatus(pm.id, 'Completed')}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        >
                          Selesai
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {pmTersaring.length === 0 && (
                  <p className={`py-8 text-center text-xs ${theme.muted}`}>Belum ada jadwal PM.</p>
                )}
              </div>
            </div>
          )}

          {activeMenu === 'spareparts' && (
            <div className={`p-6 rounded-2xl border space-y-4 ${theme.card}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className={`text-base font-extrabold ${theme.title}`}>Stok Spareparts</h2>
                  <p className={`text-xs ${theme.muted}`}>Inventaris suku cadang maintenance</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={partSearchQuery}
                    onChange={(e) => setPartSearchQuery(e.target.value)}
                    placeholder="Cari sparepart / kode..."
                    className={`px-3 py-2 rounded-xl border text-xs outline-none ${theme.input}`}
                  />
                  <button
                    type="button"
                    onClick={() => setIsPartModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                  >
                    <Plus size={14} /> Tambah Part
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {partsTersaring.map((part) => {
                  const isLow = part.stock <= part.min_stock;
                  return (
                    <div key={part.id} className="py-3.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-bold ${theme.title}`}>{part.part_name}</p>
                          <span className={`text-[11px] font-mono ${theme.muted}`}>{part.part_code}</span>
                          {isLow && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500">
                              Stok Menipis
                            </span>
                          )}
                        </div>
                        <p className={`text-xs ${theme.muted}`}>Min stok: {part.min_stock} Pcs</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updatePartStock(part.id, part.stock, -1)}
                          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Minus size={14} />
                        </button>
                        <span className={`text-sm font-extrabold min-w-14 text-center ${theme.title}`}>
                          {part.stock} Pcs
                        </span>
                        <button
                          type="button"
                          onClick={() => updatePartStock(part.id, part.stock, 1)}
                          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {partsTersaring.length === 0 && (
                  <p className={`py-8 text-center text-xs ${theme.muted}`}>Belum ada data sparepart.</p>
                )}
              </div>
            </div>
          )}

          {activeMenu === 'assets' && (
            <div className={`p-6 rounded-2xl border space-y-4 ${theme.card}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className={`text-base font-extrabold ${theme.title}`}>Daftar Mesin & Aset</h2>
                  <p className={`text-xs ${theme.muted}`}>Master data aset terdaftar</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={assetSearchQuery}
                    onChange={(e) => setAssetSearchQuery(e.target.value)}
                    placeholder="Cari mesin / lokasi..."
                    className={`px-3 py-2 rounded-xl border text-xs outline-none ${theme.input}`}
                  />
                  <button
                    type="button"
                    onClick={() => setIsAssetModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                  >
                    <Plus size={14} /> Tambah Mesin
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {assetsTersaring.map((asset) => (
                  <div key={asset.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div>
                      <p className={`text-sm font-bold ${theme.title}`}>{asset.asset_name}</p>
                      <p className={`text-xs ${theme.muted}`}>{asset.location}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteAssetModal({ open: true, id: asset.id, name: asset.asset_name })}
                      className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                      title="Hapus Mesin"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                {assetsTersaring.length === 0 && (
                  <p className={`py-8 text-center text-xs ${theme.muted}`}>Belum ada aset terdaftar.</p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL DETAIL LAPORAN KERUSAKAN */}
      {detailModal.open && detailModal.report && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto ${theme.card}`}>
            <div className={`flex items-start justify-between border-b pb-3 ${theme.divider}`}>
              <div>
                <h3 className={`text-base font-extrabold ${theme.title}`}>{detailModal.report.asset_name}</h3>
                <p className={`text-xs ${theme.muted}`}>
                  {detailModal.report.location} • {new Date(detailModal.report.created_at).toLocaleString('id-ID')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModal({ open: false, report: null })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400">
                Prioritas: {detailModal.report.priority}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                Status: {detailModal.report.status}
              </span>
              {detailModal.report.nama_teknisi && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-500/10 text-slate-300">
                  Teknisi: {detailModal.report.nama_teknisi}
                </span>
              )}
              {detailModal.report.durasi_menit > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400">
                  Durasi: {formatManualDuration(detailModal.report.durasi_menit)}
                </span>
              )}
            </div>

            <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${theme.subCard}`}>
              <p className="font-bold uppercase tracking-wider text-[10px] opacity-75">Detail Kerusakan</p>
              <p className="whitespace-pre-line leading-relaxed">{detailModal.report.description || '-'}</p>
            </div>

            {detailModal.report.catatan_teknisi && (
              <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${theme.subCard}`}>
                <p className="font-bold uppercase tracking-wider text-[10px] opacity-75">Catatan Teknisi</p>
                <p className="whitespace-pre-line leading-relaxed">{detailModal.report.catatan_teknisi}</p>
              </div>
            )}

            {detailModal.report.photo_url && (
              <div className="space-y-1.5">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.muted}`}>Foto Kerusakan</p>
                <img
                  src={detailModal.report.photo_url}
                  alt={detailModal.report.asset_name}
                  onClick={() => setLightboxUrl(detailModal.report.photo_url)}
                  className="w-full h-44 object-cover rounded-xl border border-slate-700/50 cursor-zoom-in"
                />
              </div>
            )}

            {isTechnician && (
              <div className="space-y-1.5">
                <label className={`block text-[11px] font-bold uppercase ${theme.muted}`}>Ubah Status Perbaikan</label>
                <select
                  value={detailModal.report.status}
                  onChange={(e) => {
                    const nextStatus = e.target.value;
                    setDetailModal({ open: false, report: null });
                    onSelectStatus(detailModal.report, nextStatus);
                  }}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none ${theme.input}`}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailModal({ open: false, report: null })}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL, EDIT PROGRESS & RIWAYAT LAPORAN HARIAN PROYEK */}
      {projectDetailModal.open && projectDetailModal.project && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateProjectProgress}
            className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto ${theme.card}`}
          >
            <div className={`flex items-start justify-between border-b pb-3 ${theme.divider}`}>
              <div>
                <span className="text-[11px] font-bold text-indigo-400">{projectDetailModal.project.code}</span>
                <h3 className={`text-base font-extrabold ${theme.title}`}>{projectDetailModal.project.name}</h3>
                <p className={`text-xs ${theme.muted}`}>
                  {projectDetailModal.project.location} • PIC: {projectDetailModal.project.pic} • Target:{' '}
                  {projectDetailModal.project.target_date || '-'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProjectDetailModal({ open: false, project: null })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${theme.subCard}`}>
              <p className="font-bold uppercase tracking-wider text-[10px] opacity-75">Deskripsi Proyek</p>
              <p className="whitespace-pre-line leading-relaxed">{projectDetailModal.project.description || '-'}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className={`block font-semibold mb-1 ${theme.muted}`}>Update Progress (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    disabled={!isTechnician}
                    value={editProjectProgress}
                    onChange={(e) => setEditProjectProgress(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border outline-none disabled:opacity-60 ${theme.input}`}
                  />
                  <span className={`font-bold ${theme.muted}`}>%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  disabled={!isTechnician}
                  value={Math.min(100, Math.max(0, parseInt(editProjectProgress, 10) || 0))}
                  onChange={(e) => setEditProjectProgress(e.target.value)}
                  className="w-full mt-2 accent-indigo-600 cursor-pointer disabled:opacity-60"
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${theme.muted}`}>Status Proyek</label>
                <select
                  disabled={!isTechnician}
                  value={editProjectStatus}
                  onChange={(e) => setEditProjectStatus(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border outline-none disabled:opacity-60 ${theme.input}`}
                >
                  <option value="Berjalan">Berjalan</option>
                  <option value="Tertunda">Tertunda</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>
            </div>

            {/* Riwayat Laporan Harian Proyek Terkait */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-bold uppercase tracking-wider text-[10px] opacity-75">
                  Riwayat Laporan Harian ({riwayatLaporanProyekTerpilih.length})
                </p>
                {riwayatLaporanProyekTerpilih.length > 0 && (
                  <span className={`text-[11px] ${theme.muted}`}>Terbaru di atas</span>
                )}
              </div>

              {riwayatLaporanProyekTerpilih.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {riwayatLaporanProyekTerpilih.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-xl border space-y-1.5 ${theme.subCard}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-[11px]">
                          {log.report_date || '-'} • {log.team_name || 'Tim Proyek'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                          Progress: {log.progress ?? 0}%
                        </span>
                      </div>
                      <p className="whitespace-pre-line leading-relaxed">{log.activity || '-'}</p>
                      {log.obstacle && log.obstacle !== 'Tidak ada kendala' && (
                        <p className="text-[11px] text-amber-500 font-medium">
                          Kendala: {log.obstacle}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`p-3.5 rounded-xl border text-center ${theme.subCard}`}>
                  <p className={theme.muted}>Belum ada riwayat laporan harian untuk proyek ini.</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
              {isTechnician ? (
                <button
                  type="button"
                  onClick={() => handleDeleteProject(projectDetailModal.project.id)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600/15 text-rose-500 hover:bg-rose-600/25 cursor-pointer"
                >
                  Hapus Proyek
                </button>
              ) : (
                <span className={`text-[11px] ${theme.muted}`}>Mode lihat saja (Operator)</span>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setProjectDetailModal({ open: false, project: null })}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 cursor-pointer"
                >
                  Tutup
                </button>
                {isTechnician && (
                  <button
                    type="submit"
                    disabled={savingProjectEdit}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white cursor-pointer"
                  >
                    {savingProjectEdit ? 'Menyimpan...' : 'Simpan Progress'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DETAIL PEKERJAAN HARIAN */}
      {dwDetailModal.open && dwDetailModal.item && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl ${theme.card}`}>
            <div className={`flex items-start justify-between border-b pb-3 ${theme.divider}`}>
              <div>
                <h3 className={`text-base font-extrabold ${theme.title}`}>{dwDetailModal.item.title}</h3>
                <p className={`text-xs ${theme.muted}`}>
                  {dwDetailModal.item.area} • {dwDetailModal.item.shift} • {dwDetailModal.item.work_date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDwDetailModal({ open: false, item: null })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400">
                Pelaksana: {dwDetailModal.item.worker_name}
              </span>
              {dwDetailModal.item.duration_minutes > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400">
                  Durasi: {formatManualDuration(dwDetailModal.item.duration_minutes)}
                </span>
              )}
            </div>

            <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${theme.subCard}`}>
              <p className="font-bold uppercase tracking-wider text-[10px] opacity-75">Uraian Pekerjaan</p>
              <p className="whitespace-pre-line leading-relaxed">{dwDetailModal.item.description || '-'}</p>
            </div>

            <div className="flex justify-between items-center pt-2">
              {isTechnician ? (
                <button
                  type="button"
                  onClick={() => handleDeleteDailyWork(dwDetailModal.item.id)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600/15 text-rose-500 hover:bg-rose-600/25 cursor-pointer"
                >
                  Hapus Laporan
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setDwDetailModal({ open: false, item: null })}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL LAPORAN HARIAN PROYEK */}
      {prDetailModal.open && prDetailModal.item && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl ${theme.card}`}>
            <div className={`flex items-start justify-between border-b pb-3 ${theme.divider}`}>
              <div>
                <span className="text-[11px] font-bold text-indigo-400">{prDetailModal.item.project_code}</span>
                <h3 className={`text-base font-extrabold ${theme.title}`}>{prDetailModal.item.project_name}</h3>
                <p className={`text-xs ${theme.muted}`}>
                  Tanggal: {prDetailModal.item.report_date} • Tim: {prDetailModal.item.team_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPrDetailModal({ open: false, item: null })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                Progress: {prDetailModal.item.progress}%
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400">
                Kendala: {prDetailModal.item.obstacle || 'Tidak ada'}
              </span>
            </div>

            <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${theme.subCard}`}>
              <p className="font-bold uppercase tracking-wider text-[10px] opacity-75">Uraian Pekerjaan Proyek</p>
              <p className="whitespace-pre-line leading-relaxed">{prDetailModal.item.activity || '-'}</p>
            </div>

            <div className="flex justify-between items-center pt-2">
              {isTechnician ? (
                <button
                  type="button"
                  onClick={() => handleDeleteProjectReport(prDetailModal.item.id)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600/15 text-rose-500 hover:bg-rose-600/25 cursor-pointer"
                >
                  Hapus Laporan
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setPrDetailModal({ open: false, item: null })}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PROYEK */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateProject} className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl ${theme.card}`}>
            <h3 className={`text-base font-extrabold ${theme.title}`}>Tambah Proyek Baru</h3>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${theme.muted}`}>Kode</label>
                  <input
                    type="text"
                    value={projCode}
                    onChange={(e) => setProjCode(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                  />
                </div>
                <div className="col-span-2">
                  <label className={`block font-semibold mb-1 ${theme.muted}`}>Nama Proyek *</label>
                  <input
                    type="text"
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    required
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${theme.muted}`}>Lokasi *</label>
                  <input
                    type="text"
                    value={projLocation}
                    onChange={(e) => setProjLocation(e.target.value)}
                    required
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${theme.muted}`}>PIC Proyek</label>
                  <input
                    type="text"
                    value={projPic}
                    onChange={(e) => setProjPic(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${theme.muted}`}>Target</label>
                  <input
                    type="date"
                    value={projTargetDate}
                    onChange={(e) => setProjTargetDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${theme.muted}`}>Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={projProgress}
                    onChange={(e) => setProjProgress(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${theme.muted}`}>Status</label>
                  <select
                    value={projStatus}
                    onChange={(e) => setProjStatus(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                  >
                    <option value="Berjalan">Berjalan</option>
                    <option value="Tertunda">Tertunda</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={`block font-semibold mb-1 ${theme.muted}`}>Deskripsi</label>
                <textarea
                  rows={2}
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsProjectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              >
                Simpan Proyek
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL PENYELESAIAN (DONE) */}
      {resolveModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl ${theme.card}`}>
            <h3 className={`text-base font-extrabold ${theme.title}`}>Selesaikan Perbaikan — {resolveModal.assetName}</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className={`block font-semibold mb-1 ${theme.muted}`}>Nama Teknisi *</label>
                <input
                  type="text"
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${theme.muted}`}>Lama Kerja (Jam)</label>
                  <input
                    type="number"
                    min="0"
                    value={repairHours}
                    onChange={(e) => setRepairHours(e.target.value)}
                    placeholder="0"
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${theme.muted}`}>Lama Kerja (Menit)</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={repairMinutes}
                    onChange={(e) => setRepairMinutes(e.target.value)}
                    placeholder="30"
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                  />
                </div>
              </div>
              <div>
                <label className={`block font-semibold mb-1 ${theme.muted}`}>Catatan Tindakan Teknisi</label>
                <textarea
                  rows={3}
                  value={techNote}
                  onChange={(e) => setTechNote(e.target.value)}
                  placeholder="Ringkasan perbaikan & sparepart yang diganti..."
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResolveModal({ open: false, id: null, assetName: '' })}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveResolution}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                Simpan & Tandai Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH MESIN */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateAsset} className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl ${theme.card}`}>
            <h3 className={`text-base font-extrabold ${theme.title}`}>Tambah Mesin / Aset</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className={`block font-semibold mb-1 ${theme.muted}`}>Nama Mesin *</label>
                <input
                  type="text"
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  required
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                />
              </div>
              <div>
                <label className={`block font-semibold mb-1 ${theme.muted}`}>Lokasi *</label>
                <input
                  type="text"
                  value={newAssetLocation}
                  onChange={(e) => setNewAssetLocation(e.target.value)}
                  required
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsAssetModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 cursor-pointer">
                Batal
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer">
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL HAPUS MESIN */}
      {deleteAssetModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl border p-6 space-y-4 shadow-2xl ${theme.card}`}>
            <h3 className={`text-base font-extrabold ${theme.title}`}>Hapus Mesin?</h3>
            <p className={`text-xs ${theme.muted}`}>
              Yakin ingin menghapus mesin <strong>{deleteAssetModal.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteAssetModal({ open: false, id: null, name: '' })}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteAsset}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PM */}
      {isPmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreatePm} className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl ${theme.card}`}>
            <h3 className={`text-base font-extrabold ${theme.title}`}>Buat Jadwal Preventive Maintenance</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className={`block font-semibold mb-1 ${theme.muted}`}>Pilih Mesin *</label>
                <select
                  value={pmAssetId}
                  onChange={(e) => setPmAssetId(e.target.value)}
                  required
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                >
                  <option value="">-- Pilih Mesin --</option>
                  {assetsList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.asset_name} ({a.location})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${theme.muted}`}>Interval *</label>
                  <select
                    value={pmInterval}
                    onChange={(e) => setPmInterval(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                  >
                    <option value="Harian">Harian</option>
                    <option value="Mingguan">Mingguan</option>
                    <option value="Bulanan">Bulanan</option>
                    <option value="Triwulanan">Triwulanan</option>
                    <option value="Tahunan">Tahunan</option>
                  </select>
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${theme.muted}`}>Tanggal Jadwal *</label>
                  <input
                    type="date"
                    value={pmDueDate}
                    onChange={(e) => setPmDueDate(e.target.value)}
                    required
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                  />
                </div>
              </div>
              <div>
                <label className={`block font-semibold mb-1 ${theme.muted}`}>PIC / Teknisi</label>
                <input
                  type="text"
                  value={pmAssigned}
                  onChange={(e) => setPmAssigned(e.target.value)}
                  placeholder="Tim Teknik"
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                />
              </div>
              <div>
                <label className={`block font-semibold mb-1 ${theme.muted}`}>Catatan / Checklist</label>
                <textarea
                  rows={2}
                  value={pmDesc}
                  onChange={(e) => setPmDesc(e.target.value)}
                  placeholder="Poin inspeksi..."
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsPmModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 cursor-pointer">
                Batal
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer">
                Simpan Jadwal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL TAMBAH SPAREPART */}
      {isPartModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateSparepart} className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl ${theme.card}`}>
            <h3 className={`text-base font-extrabold ${theme.title}`}>Tambah Sparepart</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className={`block font-semibold mb-1 ${theme.muted}`}>Nama Sparepart *</label>
                <input
                  type="text"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  required
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                />
              </div>
              <div>
                <label className={`block font-semibold mb-1 ${theme.muted}`}>Kode Part</label>
                <input
                  type="text"
                  value={partCode}
                  onChange={(e) => setPartCode(e.target.value)}
                  placeholder="Opsional (otomatis jika kosong)"
                  className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${theme.muted}`}>Stok Awal *</label>
                  <input
                    type="number"
                    min="0"
                    value={partStock}
                    onChange={(e) => setPartStock(e.target.value)}
                    required
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${theme.muted}`}>Minimum Stok</label>
                  <input
                    type="number"
                    min="0"
                    value={partMinStock}
                    onChange={(e) => setPartMinStock(e.target.value)}
                    placeholder="5"
                    className={`w-full px-3 py-2 rounded-xl border outline-none ${theme.input}`}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsPartModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 cursor-pointer">
                Batal
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer">
                Simpan Part
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LIGHTBOX FOTO */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img src={lightboxUrl} alt="Zoom" className="max-h-[90vh] max-w-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}