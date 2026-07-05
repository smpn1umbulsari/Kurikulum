import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useKelass, useSaveKelas, useDeleteKelas } from '../hooks/useKelas';
import { useGurus } from '../../guru/hooks/useGuru';
import { useSiswas, useSaveSiswa } from '../../siswa/hooks/useSiswa';
import { useAppStore } from '../../../store/appStore';
import { toast } from '../../../store/toastStore';
import { SkeletonRow } from '../../../components/ui/SkeletonRow';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingState } from '../../../components/ui/LoadingState';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  School,
  CheckCircle,
  HelpCircle,
  Search,
  Users,
  ArrowRight,
  ArrowLeft,
  Save,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import type { Kelas, KelasJenis, Tingkat, Siswa } from '@/types';

// Zod Schema matches the auto-generated naming concept
const kelasSchema = z.object({
  tingkat: z.preprocess((val) => Number(val), z.union([z.literal(7), z.literal(8), z.literal(9)])),
  rombel_letter: z.string().min(1, 'Huruf Rombel wajib dipilih/diisi').trim().toUpperCase(),
  wali_kelas_id: z.string().optional().or(z.literal('')),
  status_aktif: z.boolean().default(true),
});

type KelasFormValues = z.infer<typeof kelasSchema>;

// Helper to extract rombel letter from class name for sorting
const extractRombelLetter = (namaKelas: string): string => {
  // Clean: "VII A DAPO" -> "A", "VII A" -> "A", "VIII AA" -> "AA"
  const cleaned = namaKelas.replace(/\s+/g, '').replace(/DAPO|REAL/gi, '').trim();
  // Extract the letter part (last characters that are letters)
  const match = cleaned.match(/[A-Za-z]+$/);
  return match ? match[0].toUpperCase() : cleaned;
};

// Convert letter to numeric for sorting (A=1, B=2, ..., Z=26, AA=27, AB=28, etc.)
const letterToNumber = (letter: string): number => {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 64); // A=1, B=2, etc.
  }
  return result;
};

// Sort comparator for kelas: tingkat ASC (7→8→9), then rombel letter (A→Z→AA→AZ→BA→BZ)
const sortKelasComparator = (a: Kelas, b: Kelas): number => {
  // First by tingkat (7 before 8 before 9)
  if (a.tingkat !== b.tingkat) {
    return a.tingkat - b.tingkat;
  }
  // Then by rombel letter
  const letterA = extractRombelLetter(a.nama_kelas);
  const letterB = extractRombelLetter(b.nama_kelas);
  const numA = letterToNumber(letterA);
  const numB = letterToNumber(letterB);
  return numA - numB;
};

// Helper to convert grade/tingkat to Roman numerals
const getRomanTingkat = (tingkat: number): string => {
  if (tingkat === 7) return 'VII';
  if (tingkat === 8) return 'VIII';
  if (tingkat === 9) return 'IX';
  return String(tingkat);
};

export default function KelasPage() {
  const { data: kelass = [], isLoading: isKelasLoading } = useKelass();
  const { data: gurus = [] } = useGurus();
  const { data: siswas = [], isLoading: isSiswaLoading } = useSiswas();
  const currentAcademicTerm = useAppStore((state) => state.currentAcademicTerm);

  const saveKelasMutation = useSaveKelas();
  const deleteKelasMutation = useDeleteKelas();
  const saveSiswaMutation = useSaveSiswa();

  const [activeTab, setActiveTab] = useState<'KELAS_LIST' | 'PLOT_MEMBERS'>('KELAS_LIST');
  
  // Selected Class Type (REAL or DAPO) - completely separate views
  const [selectedClassType, setSelectedClassType] = useState<KelasJenis>('REAL');

  // ============================================================
  // TAB 1: KELAS CRUD STATE & LOGIC
  // ============================================================
  const [isOpen, setIsOpen] = useState(false);
  const [editingKelas, setEditingKelas] = useState<Kelas | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tingkatFilter, setTingkatFilter] = useState<'ALL' | Tingkat>('ALL');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<KelasFormValues>({
    resolver: zodResolver(kelasSchema),
    defaultValues: {
      tingkat: 7,
      rombel_letter: 'A',
      wali_kelas_id: '',
      status_aktif: true,
    },
  });

  const watchTingkat = watch('tingkat');
  const watchRombelLetter = watch('rombel_letter');

  // Suggest next unused letter (A-Z) for a given tingkat and class type
  const getNextRombelLetter = useCallback((tingkat: number, type: 'REAL' | 'DAPO') => {
    const existingForTingkat = kelass.filter(
      c => c.tingkat === tingkat && c.jenis === type && c.status_aktif && (currentAcademicTerm ? c.academic_term_id === currentAcademicTerm.id : true)
    );
    const existingLetters = existingForTingkat.map(c => {
      // Clean name: e.g. "VII A Dapo" -> "A", "VII A" -> "A"
      const clean = c.nama_kelas.replace(/\s+/g, '').replace('DAPO', '').replace('REAL', '');
      return clean.charAt(clean.length - 1).toUpperCase();
    });

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    for (const letter of alphabet) {
      if (!existingLetters.includes(letter)) {
        return letter;
      }
    }
    return 'A'; // fallback
  }, [kelass, currentAcademicTerm]);

  // Suggest letter whenever tingkat or view type changes
  useEffect(() => {
    if (!editingKelas && isOpen) {
      const nextLetter = getNextRombelLetter(Number(watchTingkat), selectedClassType);
      setValue('rombel_letter', nextLetter);
    }
  }, [watchTingkat, selectedClassType, editingKelas, isOpen, getNextRombelLetter, setValue]);

  // Preview generated name
  const generatedClassName = useMemo(() => {
    const roman = getRomanTingkat(Number(watchTingkat));
    const letter = (watchRombelLetter || 'A').toUpperCase().trim();
    if (selectedClassType === 'DAPO') {
      return `${roman} ${letter} DAPO`;
    }
    return `${roman} ${letter}`;
  }, [watchTingkat, watchRombelLetter, selectedClassType]);

  const openModal = (kelas: Kelas | null = null) => {
    if (kelas) {
      setEditingKelas(kelas);
      // For editing, parse the rombel letter from the existing name
      const cleanName = kelas.nama_kelas.replace('DAPO', '').replace('REAL', '').trim();
      const lastChar = cleanName.charAt(cleanName.length - 1) || 'A';
      reset({
        tingkat: kelas.tingkat,
        rombel_letter: lastChar.toUpperCase(),
        wali_kelas_id: kelas.wali_kelas_id || '',
        status_aktif: kelas.status_aktif,
      });
    } else {
      setEditingKelas(null);
      const initialNextLetter = getNextRombelLetter(7, selectedClassType);
      reset({
        tingkat: 7,
        rombel_letter: initialNextLetter,
        wali_kelas_id: '',
        status_aktif: true,
      });
    }
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditingKelas(null);
  };

  const onSubmit = (data: KelasFormValues) => {
    if (!currentAcademicTerm) {
      toast.error('Tahun Ajaran aktif belum ditentukan!');
      return;
    }

    // Name is auto-generated based on Roman numeral + selected letter
    const finalName = editingKelas 
      ? editingKelas.nama_kelas 
      : generatedClassName;

    const payload: Kelas = {
      id: editingKelas?.id || crypto.randomUUID(),
      academic_term_id: currentAcademicTerm.id,
      nama_kelas: finalName,
      tingkat: data.tingkat as Tingkat,
      jenis: selectedClassType, // Auto-selected based on active type view
      wali_kelas_id: data.wali_kelas_id || undefined,
      status_aktif: data.status_aktif,
      created_at: editingKelas?.created_at || new Date().toISOString(),
    };

    saveKelasMutation.mutate(payload, {
      onSuccess: () => closeModal(),
    });
  };

  const handleDelete = (id: string) => {
    toast.confirm('Apakah Anda yakin ingin menghapus data kelas ini?', () => {
      deleteKelasMutation.mutate(id);
    });
  };

  // Filtered classes based on ACTIVE class type tab view, sorted ascendingly by tingkat & name
  const filteredKelass = useMemo(() => {
    const list = kelass.filter((k) => {
      if (k.jenis !== selectedClassType) return false;
      const matchesSearch = k.nama_kelas.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTingkat = tingkatFilter === 'ALL' || k.tingkat === tingkatFilter;
      const matchesTerm = currentAcademicTerm ? k.academic_term_id === currentAcademicTerm.id : true;
      return matchesSearch && matchesTingkat && matchesTerm;
    });

    return [...list].sort(sortKelasComparator);
  }, [kelass, searchTerm, tingkatFilter, currentAcademicTerm, selectedClassType]);

  const totalKelas = filteredKelass.length;
  const aktifKelas = filteredKelass.filter((k) => k.status_aktif).length;
  const nonAktifKelas = totalKelas - aktifKelas;

  // Student counts per class
  const getStudentCount = (kelasId: string) => {
    const isReal = selectedClassType === 'REAL';
    return siswas.filter(
      s => s.status_aktif && (isReal ? s.kelas_id === kelasId : s.kelas_dapo_id === kelasId)
    ).length;
  };

  // ============================================================
  // TAB 2: PLOTTING ANGGOTA KELAS (ROMBEL MEMBERS) STATE & LOGIC
  // ============================================================
  const [selectedTargetClassId, setSelectedTargetClassId] = useState<string>('');
  const [localSiswas, setLocalSiswas] = useState<Siswa[]>([]);
  
  // Selection check states
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());

  // Filters for candidate pane
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateTingkatFilter, setCandidateTingkatFilter] = useState<'AUTO' | 'ALL' | 7 | 8 | 9>('AUTO');
  const [showAlreadyAssigned, setShowAlreadyAssigned] = useState(false);

  // Sync db values to draft state
  useEffect(() => {
    if (siswas) {
      setLocalSiswas(siswas);
    }
  }, [siswas]);

  // Target class options (Only matching selectedClassType)
  const targetClassOptions = useMemo(() => {
    const activeTermsOnly = kelass.filter(
      k => k.jenis === selectedClassType && k.status_aktif && (currentAcademicTerm ? k.academic_term_id === currentAcademicTerm.id : true)
    );
    return [...activeTermsOnly].sort(sortKelasComparator);
  }, [kelass, currentAcademicTerm, selectedClassType]);

  // Set default target class
  useEffect(() => {
    if (targetClassOptions.length > 0) {
      setSelectedTargetClassId(targetClassOptions[0].id);
    } else {
      setSelectedTargetClassId('');
    }
  }, [targetClassOptions]);

  const activeTargetClass = useMemo(() => {
    return targetClassOptions.find(k => k.id === selectedTargetClassId);
  }, [targetClassOptions, selectedTargetClassId]);

  // Dirty check (draft matches db status)
  const isDraftDirty = useMemo(() => {
    if (localSiswas.length !== siswas.length) return true;
    return localSiswas.some(ls => {
      const match = siswas.find(s => s.id === ls.id);
      return !match || match.kelas_id !== ls.kelas_id || match.kelas_dapo_id !== ls.kelas_dapo_id;
    });
  }, [localSiswas, siswas]);

  // Split student groups based on draft assignments and selectedClassType
  const activeMembers = useMemo(() => {
    if (!selectedTargetClassId || !activeTargetClass) return [];
    const isReal = activeTargetClass.jenis === 'REAL';
    return localSiswas.filter(
      s => s.status_aktif && (isReal ? s.kelas_id === selectedTargetClassId : s.kelas_dapo_id === selectedTargetClassId)
    );
  }, [localSiswas, selectedTargetClassId, activeTargetClass]);

  const candidatesList = useMemo(() => {
    if (!activeTargetClass) return [];
    const isReal = activeTargetClass.jenis === 'REAL';
    
    return localSiswas.filter(s => {
      if (!s.status_aktif) return false;
      
      const currentVal = isReal ? s.kelas_id : s.kelas_dapo_id;
      
      // Candidate must not be in current target class
      if (currentVal === selectedTargetClassId) return false;

      // Filter by assignment status
      if (!showAlreadyAssigned && currentVal) return false;

      // Filter by Tingkat (Grade)
      if (candidateTingkatFilter === 'AUTO') {
        if (currentVal) {
          const otherClass = kelass.find(k => k.id === currentVal);
          if (otherClass && otherClass.tingkat !== activeTargetClass.tingkat) return false;
        }
      } else if (candidateTingkatFilter !== 'ALL') {
        if (currentVal) {
          const otherClass = kelass.find(k => k.id === currentVal);
          if (otherClass && otherClass.tingkat !== candidateTingkatFilter) return false;
        }
      }

      // Search match
      if (candidateSearch) {
        const query = candidateSearch.toLowerCase();
        const matchesName = s.nama.toLowerCase().includes(query);
        const matchesNis = s.nisn?.toLowerCase().includes(query) || s.nipd?.toLowerCase().includes(query);
        return matchesName || matchesNis;
      }

      return true;
    });
  }, [localSiswas, selectedTargetClassId, activeTargetClass, showAlreadyAssigned, candidateTingkatFilter, candidateSearch, kelass]);

  // Statistics
  const stats = useMemo(() => {
    const lCount = activeMembers.filter(m => m.jk === 'L').length;
    const pCount = activeMembers.filter(m => m.jk === 'P').length;
    return {
      total: activeMembers.length,
      lCount,
      pCount
    };
  }, [activeMembers]);

  // Selection actions
  const toggleSelectCandidate = (id: string) => {
    setSelectedCandidateIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllCandidates = () => {
    if (selectedCandidateIds.size === candidatesList.length) {
      setSelectedCandidateIds(new Set());
    } else {
      setSelectedCandidateIds(new Set(candidatesList.map(c => c.id)));
    }
  };

  const toggleSelectMember = (id: string) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllMembers = () => {
    if (selectedMemberIds.size === activeMembers.length) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(activeMembers.map(m => m.id)));
    }
  };

  // Move Operations
  const handleAssignSelected = () => {
    if (selectedCandidateIds.size === 0 || !selectedTargetClassId || !activeTargetClass) return;
    const isReal = activeTargetClass.jenis === 'REAL';

    setLocalSiswas(prev => {
      return prev.map(s => {
        if (selectedCandidateIds.has(s.id)) {
          return { 
            ...s, 
            [isReal ? 'kelas_id' : 'kelas_dapo_id']: selectedTargetClassId, 
            updated_at: new Date().toISOString() 
          };
        }
        return s;
      });
    });

    setSelectedCandidateIds(new Set());
  };

  const handleUnassignSelected = () => {
    if (selectedMemberIds.size === 0 || !activeTargetClass) return;
    const isReal = activeTargetClass.jenis === 'REAL';

    setLocalSiswas(prev => {
      return prev.map(s => {
        if (selectedMemberIds.has(s.id)) {
          return { 
            ...s, 
            [isReal ? 'kelas_id' : 'kelas_dapo_id']: undefined, 
            updated_at: new Date().toISOString() 
          };
        }
        return s;
      });
    });

    setSelectedMemberIds(new Set());
  };

  const handleDiscardChanges = () => {
    toast.confirm("Apakah Anda yakin ingin membatalkan semua draf plotting anggota kelas?", () => {
      setLocalSiswas(siswas);
      setSelectedCandidateIds(new Set());
      setSelectedMemberIds(new Set());
    });
  };

  const handleSaveChanges = async () => {
    try {
      const toSave = localSiswas.filter(ls => {
        const orig = siswas.find(s => s.id === ls.id);
        return orig && (orig.kelas_id !== ls.kelas_id || orig.kelas_dapo_id !== ls.kelas_dapo_id);
      });

      if (toSave.length === 0) return;

      for (const s of toSave) {
        await saveSiswaMutation.mutateAsync(s);
      }

      toast.success(`Sukses: ${toSave.length} alokasi anggota kelas berhasil disimpan!`);
    } catch (err: any) {
      toast.error(`Gagal menyimpan plotting: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Top Header Panel */}
      <div className="bg-white border border-neutral-200 rounded-card p-5 shadow-card space-y-4 text-left">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-neutral-800 flex items-center gap-2">
              <School className="w-5 h-5 text-primary-650" />
              Manajemen Kelas & Rombongan Belajar
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Kelola nama rombel, pengawas wali kelas, serta plotting anggota siswa ({selectedClassType === 'REAL' ? 'Kelas Riil/Fisik' : 'Kelas Administrasi Dapodik'}).
            </p>
          </div>

          {/* Sub-tab selection */}
          <div className="flex bg-neutral-100 p-1 rounded-medium border border-neutral-200">
            <button
              onClick={() => setActiveTab('KELAS_LIST')}
              className={`px-4 py-1.5 text-xs font-bold rounded-medium transition-all ${
                activeTab === 'KELAS_LIST'
                  ? 'bg-white text-neutral-800 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Daftar Kelas
            </button>
            <button
              onClick={() => setActiveTab('PLOT_MEMBERS')}
              className={`px-4 py-1.5 text-xs font-bold rounded-medium transition-all ${
                activeTab === 'PLOT_MEMBERS'
                  ? 'bg-white text-neutral-800 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Anggota Rombel
            </button>
          </div>
        </div>

        {/* View Type Toggle (REAL vs DAPO) - Aligned to the Left */}
        <div className="flex border-t border-neutral-100 pt-3">
          <div className="flex bg-neutral-100 p-1 rounded-medium border border-neutral-200">
            <button
              onClick={() => { setSelectedClassType('REAL'); setActiveTab('KELAS_LIST'); }}
              className={`px-4 py-1.5 text-xs font-bold rounded-medium transition-all ${
                selectedClassType === 'REAL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-neutral-605 hover:text-neutral-800'
              }`}
            >
              Kelas REAL (Fisik)
            </button>
            <button
              onClick={() => { setSelectedClassType('DAPO'); setActiveTab('KELAS_LIST'); }}
              className={`px-4 py-1.5 text-xs font-bold rounded-medium transition-all ${
                selectedClassType === 'DAPO'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-neutral-650 hover:text-neutral-800'
              }`}
            >
              Kelas DAPO (Dapodik)
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: KELAS CRUD LIST */}
      {activeTab === 'KELAS_LIST' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card flex items-center justify-between h-[120px]">
              <div>
                <p className="text-sm font-medium text-neutral-500">Total Rombel ({selectedClassType})</p>
                <p className="text-3xl font-bold text-neutral-800 mt-1">{totalKelas}</p>
              </div>
              <School className="h-10 w-10 text-primary-500" />
            </div>
            <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card flex items-center justify-between h-[120px]">
              <div>
                <p className="text-sm font-medium text-neutral-500">Kelas Aktif</p>
                <p className="text-3xl font-bold text-success-600 mt-1">{aktifKelas}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-success-500" />
            </div>
            <div className="bg-white p-6 rounded-card border border-neutral-200 shadow-card flex items-center justify-between h-[120px]">
              <div>
                <p className="text-sm font-medium text-neutral-500">Nonaktif</p>
                <p className="text-3xl font-bold text-neutral-400 mt-1">{nonAktifKelas}</p>
              </div>
              <HelpCircle className="h-10 w-10 text-neutral-400" />
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white p-4 rounded-card border border-neutral-200 shadow-card flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-72">
              <input
                type="text"
                placeholder={`Cari kelas ${selectedClassType === 'REAL' ? 'real' : 'dapo'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full px-4 h-10 border border-neutral-300 rounded-medium text-sm focus:outline-none focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {(['ALL', 7, 8, 9] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTingkatFilter(t)}
                    className={`px-4 py-2 text-xs font-semibold rounded-medium transition-colors ${
                      tingkatFilter === t
                        ? 'bg-primary-600 text-white'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {t === 'ALL' ? 'Semua Tingkat' : `Kelas ${t}`}
                  </button>
                ))}
              </div>

              {/* Add class button triggers suggested-name form */}
              <button
                onClick={() => openModal()}
                className="flex items-center justify-center h-10 px-4 rounded-medium text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Tambah Kelas
              </button>
            </div>
          </div>

          {/* Kelas Table */}
          <div className="bg-white rounded-card border border-neutral-200 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Nama Kelas</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Tingkat</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Wali Kelas</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider">Jumlah Siswa</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-neutral-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {isKelasLoading ? (
                    <SkeletonRow colSpan={6} />
                  ) : filteredKelass.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState
                          icon={School}
                          title={`Tidak ada kelas ${selectedClassType === 'REAL' ? 'real' : 'dapo'} di semester aktif ini`}
                          description="Tambahkan kelas baru atau pastikan tahun ajaran aktif sudah diset."
                          action={{
                            label: 'Tambah Kelas',
                            onClick: () => openModal(null),
                          }}
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredKelass.map((kelas) => {
                      const wali = gurus.find((g) => g.id === kelas.wali_kelas_id);
                      const namaWali = wali
                        ? `${wali.gelar_depan ? wali.gelar_depan + ' ' : ''}${wali.nama}${wali.gelar_belakang ? ', ' + wali.gelar_belakang : ''}`
                        : 'Belum Ditugaskan';

                      return (
                        <tr key={kelas.id} className="h-16 hover:bg-neutral-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-neutral-800">
                            {kelas.nama_kelas}
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-800">Kelas {kelas.tingkat}</td>
                          <td className="px-6 py-4 text-sm text-neutral-700">{namaWali}</td>
                          <td className="px-6 py-4 text-center text-sm">
                            <span className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 font-bold font-mono text-xs border border-neutral-200">
                              {getStudentCount(kelas.id)} Siswa
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
                                kelas.status_aktif
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              {kelas.status_aktif ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                            <button
                              onClick={() => openModal(kelas)}
                              className="text-primary-600 hover:text-primary-900 transition-colors p-1"
                              title="Ubah kelas"
                            >
                              <Edit2 className="h-4 w-4 inline" />
                            </button>
                            <button
                              onClick={() => handleDelete(kelas.id)}
                              className="text-red-500 hover:text-red-900 transition-colors p-1"
                              title="Hapus kelas"
                            >
                              <Trash2 className="h-4 w-4 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: PLOTTING ANGGOTA KELAS */}
      {activeTab === 'PLOT_MEMBERS' && (
        <>
          {/* Dirty changes warning bar */}
          {isDraftDirty && (
            <div className="p-4 bg-amber-500 rounded-card text-white shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-left transition-all duration-300">
              <div>
                <p className="text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-white animate-bounce" />
                  DRAF PLOTTING ANGGOTA KELAS BELUM DISIMPAN!
                </p>
                <p className="text-[10px] opacity-90 mt-1">Perubahan keanggotaan rombel masih dalam memori lokal. Klik simpan untuk commit ke database.</p>
              </div>
              
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleDiscardChanges}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-medium border border-transparent transition-colors"
                >
                  Batalkan Draf
                </button>
                <button
                  onClick={handleSaveChanges}
                  className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-950 text-white font-bold text-xs rounded-medium border border-transparent shadow flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan Perubahan
                </button>
              </div>
            </div>
          )}

          {/* Plotting Workspace */}
          <div className="bg-white border border-neutral-200 rounded-card shadow-card p-5 flex flex-col gap-6">
            
            {/* Top Selector Panel */}
            <div className="pb-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wide">Pilih Rombongan Belajar ({selectedClassType === 'REAL' ? 'REAL' : 'DAPO'})</label>
                <select
                  value={selectedTargetClassId}
                  onChange={(e) => setSelectedTargetClassId(e.target.value)}
                  className="h-10 border border-neutral-300 rounded-medium px-3 text-sm focus:outline-none focus:ring-primary-500 bg-white font-semibold text-neutral-800 w-[280px]"
                >
                  {targetClassOptions.length === 0 ? (
                    <option value="">-- Tidak ada kelas {selectedClassType === 'REAL' ? 'real' : 'dapo'} aktif --</option>
                  ) : (
                    targetClassOptions.map(k => (
                      <option key={k.id} value={k.id}>
                        Kelas {k.tingkat} - {k.nama_kelas}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Summary Stats Badge */}
              {activeTargetClass && (
                <div className="flex items-center gap-3">
                  <div className="bg-neutral-50 px-3 py-1.5 rounded-medium border border-neutral-200 text-xs font-medium text-neutral-600">
                    Siswa L: <span className="font-bold text-neutral-800">{stats.lCount}</span>
                  </div>
                  <div className="bg-neutral-50 px-3 py-1.5 rounded-medium border border-neutral-200 text-xs font-medium text-neutral-600">
                    Siswa P: <span className="font-bold text-neutral-800">{stats.pCount}</span>
                  </div>
                  <div className="bg-primary-50 px-3.5 py-1.5 rounded-medium border border-primary-200 text-xs font-bold text-primary-700">
                    Total: {stats.total} Siswa
                  </div>
                </div>
              )}
            </div>

            {/* Split Screen Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-21 gap-4 items-center">
              
              {/* Left Column: Candidates list */}
              <div className="lg:col-span-10 bg-neutral-50/50 rounded-card border border-neutral-200 p-4 flex flex-col h-[520px]">
                <div className="pb-3 border-b border-neutral-200">
                  <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-neutral-500" />
                    Kandidat / Calon Anggota
                  </h4>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Siswa aktif terdaftar yang dapat ditugaskan ke kelas ini.</p>
                </div>

                {/* Left panel toolbar filters */}
                <div className="py-3 flex flex-col gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cari nama, NISN, NIPD..."
                      value={candidateSearch}
                      onChange={(e) => setCandidateSearch(e.target.value)}
                      className="w-full text-xs border border-neutral-300 rounded-medium pl-8 pr-3 py-2 bg-white focus:bg-white outline-none font-medium text-neutral-800"
                    />
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -tranneutral-y-1/2" />
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <select
                      value={candidateTingkatFilter}
                      onChange={(e) => setCandidateTingkatFilter(e.target.value === 'ALL' || e.target.value === 'AUTO' ? e.target.value : Number(e.target.value) as any)}
                      className="text-[11px] border border-neutral-200 rounded px-2 py-1.5 font-medium bg-white text-neutral-700 outline-none"
                    >
                      <option value="AUTO">Cocokkan Tingkat</option>
                      <option value="ALL">Semua Tingkat</option>
                      <option value={7}>Hanya Kelas 7</option>
                      <option value={8}>Hanya Kelas 8</option>
                      <option value={9}>Hanya Kelas 9</option>
                    </select>

                    <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] font-medium text-neutral-600 select-none">
                      <input
                        type="checkbox"
                        checked={showAlreadyAssigned}
                        onChange={(e) => setShowAlreadyAssigned(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-neutral-300 text-primary-600"
                      />
                      Sudah berkelas
                    </label>
                  </div>
                </div>

                {/* Candidates Scroll Container */}
                <div className="flex-1 overflow-y-auto border border-neutral-200 rounded-medium bg-white text-xs divide-y divide-neutral-100">
                  {isSiswaLoading ? (
                    <LoadingState message="Memuat data siswa..." />
                  ) : candidatesList.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="Tidak ada calon siswa cocok"
                      description="Tidak ada siswa yang memenuhi filter."
                    />
                  ) : (
                    candidatesList.map(cand => {
                      const isReal = activeTargetClass?.jenis === 'REAL';
                      const currentVal = isReal ? cand.kelas_id : cand.kelas_dapo_id;
                      const otherClass = currentVal ? kelass.find(k => k.id === currentVal) : null;
                      return (
                        <div
                          key={cand.id}
                          onClick={() => toggleSelectCandidate(cand.id)}
                          className={`p-2.5 flex items-center justify-between gap-3 hover:bg-neutral-50 cursor-pointer transition-colors ${
                            selectedCandidateIds.has(cand.id) ? 'bg-primary-50/60' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedCandidateIds.has(cand.id)}
                              onChange={() => {}} // Click handled by div
                              className="h-3.5 w-3.5 text-primary-600 rounded border-neutral-300 shrink-0"
                            />
                            <div className="text-left">
                              <p className="font-bold text-neutral-800 leading-snug">{cand.nama}</p>
                              <p className="text-[9.5px] text-neutral-400 font-mono">NISN: {cand.nisn || '-'} | JK: {cand.jk}</p>
                            </div>
                          </div>

                          {otherClass && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              {otherClass.nama_kelas}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Left panel select-all check info */}
                <div className="pt-2 border-t border-neutral-200 mt-2 flex justify-between items-center text-[10.5px]">
                  <button
                    onClick={toggleSelectAllCandidates}
                    disabled={candidatesList.length === 0}
                    className="text-primary-600 hover:text-primary-800 font-semibold disabled:text-neutral-300"
                  >
                    {selectedCandidateIds.size === candidatesList.length ? 'Batalkan Semua' : 'Pilih Semua'}
                  </button>
                  <span className="text-neutral-400 font-mono">{selectedCandidateIds.size} terpilih</span>
                </div>
              </div>

              {/* Middle Column: Assignment control buttons */}
              <div className="lg:col-span-1 flex lg:flex-col justify-center items-center gap-3 py-2">
                <button
                  onClick={handleAssignSelected}
                  disabled={selectedCandidateIds.size === 0}
                  className={`p-3 rounded-full border transition-all ${
                    selectedCandidateIds.size > 0
                      ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm border-primary-600'
                      : 'bg-neutral-100 text-neutral-300 border-neutral-200 cursor-not-allowed'
                  }`}
                  title="Masukkan ke Kelas"
                >
                  <ArrowRight className="w-5 h-5 hidden lg:block" />
                  <span className="lg:hidden text-xs font-bold flex items-center gap-1">Plotting →</span>
                </button>

                <button
                  onClick={handleUnassignSelected}
                  disabled={selectedMemberIds.size === 0}
                  className={`p-3 rounded-full border transition-all ${
                    selectedMemberIds.size > 0
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm border-rose-600'
                      : 'bg-neutral-100 text-neutral-300 border-neutral-200 cursor-not-allowed'
                  }`}
                  title="Keluarkan dari Kelas"
                >
                  <ArrowLeft className="w-5 h-5 hidden lg:block" />
                  <span className="lg:hidden text-xs font-bold flex items-center gap-1">← Keluarkan</span>
                </button>
              </div>

              {/* Right Column: Class Members list */}
              <div className="lg:col-span-10 bg-neutral-50/50 rounded-card border border-neutral-200 p-4 flex flex-col h-[520px]">
                <div className="pb-3 border-b border-neutral-200 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-primary-600" />
                      Anggota Kelas Terdaftar
                    </h4>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Siswa yang terplot di kelas terpilih saat ini.</p>
                  </div>
                  
                  {activeTargetClass && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-primary-100 text-primary-850 font-bold font-mono">
                      {activeTargetClass.nama_kelas}
                    </span>
                  )}
                </div>

                {/* Right panel spacing filter placeholder */}
                <div className="py-3 text-[10px] text-neutral-400 font-mono bg-white p-2 border border-neutral-200 rounded-medium text-center mt-2">
                  Semester Aktif: <strong className="text-neutral-700">{currentAcademicTerm?.tahun_ajaran || '-'} - {currentAcademicTerm?.semester || '-'}</strong>
                </div>

                {/* Members list scroll */}
                <div className="flex-1 overflow-y-auto border border-neutral-200 rounded-medium bg-white text-xs divide-y divide-neutral-100 mt-3.5">
                  {activeMembers.length === 0 ? (
                    <div className="p-12 text-center text-neutral-400 italic">Rombongan belajar masih kosong</div>
                  ) : (
                    activeMembers.map(memb => (
                      <div
                        key={memb.id}
                        onClick={() => toggleSelectMember(memb.id)}
                        className={`p-2.5 flex items-center justify-between gap-3 hover:bg-neutral-50 cursor-pointer transition-colors ${
                          selectedMemberIds.has(memb.id) ? 'bg-rose-50/60' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedMemberIds.has(memb.id)}
                            onChange={() => {}} // Click handled by div
                            className="h-3.5 w-3.5 text-rose-600 rounded border-neutral-300 shrink-0"
                          />
                          <div className="text-left">
                            <p className="font-bold text-neutral-800 leading-snug">{memb.nama}</p>
                            <p className="text-[9.5px] text-neutral-400 font-mono">NISN: {memb.nisn || '-'} | JK: {memb.jk}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Right panel select-all check info */}
                <div className="pt-2 border-t border-neutral-200 mt-2 flex justify-between items-center text-[10.5px]">
                  <button
                    onClick={toggleSelectAllMembers}
                    disabled={activeMembers.length === 0}
                    className="text-rose-600 hover:text-rose-800 font-semibold disabled:text-neutral-300"
                  >
                    {selectedMemberIds.size === activeMembers.length ? 'Batalkan Semua' : 'Pilih Semua'}
                  </button>
                  <span className="text-neutral-400 font-mono">{selectedMemberIds.size} terpilih</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Form for Class Creation & Metadata Editing */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-card shadow-floating border border-neutral-200 max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
              <h3 className="text-lg font-bold text-neutral-800">
                {editingKelas ? 'Ubah Kelas' : 'Tambah Kelas Baru'}
              </h3>
              <button onClick={closeModal} className="text-neutral-500 hover:text-neutral-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              
              {/* Naming UI based on Guru Spenturi automatic suggests */}
              {editingKelas ? (
                // Edit mode shows read-only name
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-neutral-700">Nama Kelas</label>
                  <input
                    type="text"
                    value={editingKelas.nama_kelas}
                    disabled
                    className="block w-full px-3 h-10 border border-neutral-200 bg-neutral-50 text-neutral-400 rounded-medium text-sm focus:outline-none"
                  />
                </div>
              ) : (
                // Add mode has auto-suggest preview and rombel letter select
                <div className="p-4 bg-primary-50/50 rounded-xl border border-primary-200 text-left space-y-3">
                  <span className="inline-block text-[10px] font-bold bg-primary-200 text-primary-850 px-2 py-0.5 rounded uppercase tracking-wide">
                    Otomatis Suggest Rombel
                  </span>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-neutral-600 uppercase">Tingkat</label>
                      <select
                        {...register('tingkat')}
                        className="block w-full px-3 h-10 border border-neutral-300 rounded-medium text-sm bg-white"
                      >
                        <option value={7}>Kelas 7</option>
                        <option value={8}>Kelas 8</option>
                        <option value={9}>Kelas 9</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-neutral-600 uppercase">Huruf Rombel</label>
                      <input
                        type="text"
                        {...register('rombel_letter')}
                        placeholder="A"
                        className="block w-full px-3 h-10 border border-neutral-300 rounded-medium text-sm text-center font-bold"
                      />
                      {errors.rombel_letter && <p className="text-[10px] text-red-600">{errors.rombel_letter.message}</p>}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-primary-200/50 flex items-center justify-between text-xs">
                    <span className="text-neutral-500 font-medium">Nama Kelas yang akan dibuat:</span>
                    <span className="font-extrabold text-primary-700 text-sm tracking-wide bg-white px-2 py-1 rounded border border-primary-200">
                      {generatedClassName}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-sm font-medium text-neutral-700">Wali Kelas</label>
                <select
                  {...register('wali_kelas_id')}
                  className="block w-full px-3 h-10 border border-neutral-300 rounded-medium text-sm focus:outline-none focus:ring-primary-500 bg-white"
                >
                  <option value="">-- Pilih Wali Kelas --</option>
                  {gurus
                    .filter((g) => g.status_aktif)
                    .map((g) => {
                      const label = `${g.gelar_depan ? g.gelar_depan + ' ' : ''}${g.nama}${g.gelar_belakang ? ', ' + g.gelar_belakang : ''}`;
                      return (
                        <option key={g.id} value={g.id}>
                          {label}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="space-y-1 pt-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('status_aktif')}
                    id="kelas_status_aktif"
                    className="h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="kelas_status_aktif" className="ml-2 text-sm text-neutral-700 select-none">
                    Kelas Aktif
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-neutral-300 rounded-medium text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saveKelasMutation.isPending}
                  className="px-4 py-2 rounded-medium text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                >
                  {saveKelasMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
