import { useState, useEffect, useMemo } from 'react';
import {
  usePembagianMengajars,
  useSavePembagianMengajar,
  useDeletePembagianMengajar
} from '../hooks/usePembagianMengajar';
import { toast } from '../../../store/toastStore';
import { useGurus } from '../../guru/hooks/useGuru';
import { useKelass } from '../hooks/useKelas';
import { useMapels } from '../../settings/hooks/useMapel';
import {
  useTugasTambahans,
  useSaveTugasTambahan,
  useDeleteTugasTambahan
} from '../../settings/hooks/useTugasTambahan';
import { useAppStore } from '../../../store/appStore';
import {
  Plus,
  Trash2,
  Save,
  LayoutGrid,
  Search,
  Eye,
  AlertTriangle,
  RotateCcw,
  Briefcase,
  Award,
  Printer
} from 'lucide-react';
import type { PembagianMengajar, TugasTambahan, Guru, KelasJenis } from '@/types';
import { db } from '@/database/dexie/schema';
import seedData from '@/database/seed_data.json';

interface MasterTugas {
  id: string;
  nama: string;
  jenis: 'Utama' | 'Ekuivalen' | 'Sekolah';
  jp: number;
  urutan: number;
}

interface GuruTugasRow {
  utama: string;
  ekuivalen1: string;
  ekuivalen2: string;
  ekuivalen3: string;
  sekolah1: string;
  sekolah2: string;
  sekolah3: string;
}

const makeTugasTambahanId = (nama: string, jenis: string): string => {
  return `${jenis}-${nama}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
};

const formatNamaGuru = (g: Guru) => {
  let name = g.nama;
  if (g.gelar_depan) name = `${g.gelar_depan} ${name}`;
  if (g.gelar_belakang) name = `${name}, ${g.gelar_belakang}`;
  return name;
};

export default function PembagianMengajarPage() {
  const { data: allocations = [] } = usePembagianMengajars();
  const { data: gurus = [] } = useGurus();
  const { data: kelass = [] } = useKelass();
  const { data: mapels = [] } = useMapels();
  const { data: tugasTambahans = [] } = useTugasTambahans();
  const currentAcademicTerm = useAppStore((state) => state.currentAcademicTerm);

  const saveAllocationMutation = useSavePembagianMengajar();
  const deleteAllocationMutation = useDeletePembagianMengajar();
  const saveTugasMutation = useSaveTugasTambahan();
  const deleteTugasMutation = useDeleteTugasTambahan();

  const [activeSubTab, setActiveSubTab] = useState<'MENGAJAR' | 'TUGAS_MATRIKS' | 'TUGAS_MASTER' | 'REKAP_JP'>('MENGAJAR');
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedGuruId, setHighlightedGuruId] = useState<string>('');
  const [layoutView, setLayoutView] = useState<'TABLE' | 'CARDS'>('TABLE');

  const handleImportSeedJSON = async () => {
    toast.confirm(
      'Apakah Anda yakin ingin mengimpor seluruh data kurikulum (Guru, Kelas, Mapel, Pembagian Mengajar, dan Tugas Tambahan) dari seed_data.json?',
      async () => {
        try {
          await db.transaction('rw', [
            db.academicTerms,
            db.gurus,
            db.kelass,
            db.mataPelajarans,
            db.pembagianMengajars,
            db.tugasTambahans
          ], async () => {
            await db.academicTerms.clear();
            await db.gurus.clear();
            await db.kelass.clear();
            await db.mataPelajarans.clear();
            await db.pembagianMengajars.clear();
            await db.tugasTambahans.clear();
            await db.academicTerms.bulkAdd(seedData.academicTerms as any);
            await db.gurus.bulkAdd(seedData.gurus as any);
            await db.kelass.bulkAdd(seedData.kelass as any);
            await db.mataPelajarans.bulkAdd(seedData.mataPelajarans as any);
            await db.pembagianMengajars.bulkAdd(seedData.pembagianMengajars as any);
            await db.tugasTambahans.bulkAdd(seedData.tugasTambahans as any);
          });
          toast.success('Data Kurikulum sukses di-seed ke database!');
          window.location.reload();
        } catch (err) {
          console.error('[PembagianMengajarPage] handleImportSeedJSON error:', err);
          toast.error(`Gagal import seed data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    );
  };

  // ------------------------------------------------------------
  // DRAFT ALLOCATIONS SYSTEM
  // ------------------------------------------------------------
  const [draftDapo, setDraftDapo] = useState<PembagianMengajar[]>([]);

  useEffect(() => {
    if (allocations && currentAcademicTerm) {
      const termAllocations = allocations.filter(a => a.academic_term_id === currentAcademicTerm.id);
      setDraftDapo(termAllocations);
    }
  }, [allocations, currentAcademicTerm]);

  const isDapoDirty = useMemo(() => {
    if (!currentAcademicTerm) return false;
    const dbAllocations = allocations.filter(a => a.academic_term_id === currentAcademicTerm.id);
    if (draftDapo.length !== dbAllocations.length) return true;
    return draftDapo.some(d => {
      const match = dbAllocations.find(a => a.mapel_id === d.mapel_id && a.kelas_id === d.kelas_id);
      return !match || match.guru_id !== d.guru_id;
    });
  }, [draftDapo, allocations, currentAcademicTerm]);

  // Tingkat Kelas Filter (7, 8, 9)
  const [selectedTingkatFilter, setSelectedTingkatFilter] = useState<7 | 8 | 9>(7);
  const [selectedClassType, setSelectedClassType] = useState<KelasJenis>('REAL');

  // Sort comparator for kelas: tingkat ASC (7→8→9), then rombel letter (A→Z→AA→AZ)
  const sortKelasComparator = (a: { nama_kelas: string; tingkat: number }, b: { nama_kelas: string; tingkat: number }) => {
    if (a.tingkat !== b.tingkat) return a.tingkat - b.tingkat;
    // Extract letter and convert to number for proper sorting
    const extractLetter = (nama: string) => {
      const cleaned = nama.replace(/\s+/g, '').replace(/DAPO|REAL/gi, '').trim();
      const match = cleaned.match(/[A-Za-z]+$/);
      return match ? match[0].toUpperCase() : cleaned;
    };
    const letterToNumber = (letter: string) => {
      let result = 0;
      for (let i = 0; i < letter.length; i++) {
        result = result * 26 + (letter.charCodeAt(i) - 64);
      }
      return result;
    };
    const numA = letterToNumber(extractLetter(a.nama_kelas));
    const numB = letterToNumber(extractLetter(b.nama_kelas));
    return numA - numB;
  };

  const filteredKelass = useMemo(() => {
    const list = kelass.filter(k => k.status_aktif && k.jenis === selectedClassType && Number(k.tingkat) === selectedTingkatFilter);
    return [...list].sort(sortKelasComparator);
  }, [kelass, selectedTingkatFilter, selectedClassType]);

  const activeMapels = useMemo(() => {
    const list = mapels.filter(m => m.aktif);
    return [...list].sort((a, b) => (a.mapping || 0) - (b.mapping || 0));
  }, [mapels]);

  // ------------------------------------------------------------
  // MASTER TUGAS TAMBAHAN DATABASE
  // ------------------------------------------------------------
  const [masterTugasList, setMasterTugasList] = useState<MasterTugas[]>(() => {
    const defaultList: MasterTugas[] = [
      { id: 'kepala-sekolah', nama: 'Kepala Sekolah', jenis: 'Utama', jp: 18, urutan: 0 },
      { id: 'wakil-kepala', nama: 'Wakil Kepala Satuan Pendidikan', jenis: 'Utama', jp: 12, urutan: 1 },
      { id: 'kepala-perpustakaan', nama: 'Kepala Perpustakaan', jenis: 'Utama', jp: 12, urutan: 2 },
      { id: 'kepala-laboratorium', nama: 'Kepala Laboratorium', jenis: 'Utama', jp: 12, urutan: 3 },
      { id: 'koordinator-pkb', nama: 'Koordinator Pengembangan Keprofesian Berkelanjutan (PKB)', jenis: 'Utama', jp: 6, urutan: 4 },
      { id: 'koordinator-pkg', nama: 'Koordinator Penilaian Kinerja Guru (PKG)', jenis: 'Utama', jp: 6, urutan: 5 },
      { id: 'pembimbing-inklusi', nama: 'Pembimbing Khusus pada Satuan Pendidikan Inklusif', jenis: 'Utama', jp: 6, urutan: 6 },
      { id: 'ekuivalen-wali-kelas', nama: 'Wali Kelas', jenis: 'Ekuivalen', jp: 2, urutan: 7 },
      { id: 'pembina-ekstrakurikuler', nama: 'Pembina Ekstrakurikuler', jenis: 'Ekuivalen', jp: 2, urutan: 8 },
      { id: 'pembina-osis', nama: 'Pembina OSIS', jenis: 'Ekuivalen', jp: 2, urutan: 9 },
      { id: 'guru-piket', nama: 'Guru Piket', jenis: 'Ekuivalen', jp: 2, urutan: 10 },
      { id: 'penilai-kinerja-guru', nama: 'Penilai Kinerja Guru', jenis: 'Ekuivalen', jp: 2, urutan: 11 },
      { id: 'pengurus-profesi-nasional', nama: 'Pengurus Organisasi/Asosiasi Profesi Tingkat Nasional', jenis: 'Ekuivalen', jp: 3, urutan: 12 },
      { id: 'pengurus-profesi-provinsi', nama: 'Pengurus Organisasi/Asosiasi Profesi Tingkat Provinsi', jenis: 'Ekuivalen', jp: 2, urutan: 13 },
      { id: 'pengurus-profesi-kab-kota', nama: 'Pengurus Organisasi/Asosiasi Profesi Tingkat Kabupaten/Kota', jenis: 'Ekuivalen', jp: 1, urutan: 14 },
      { id: 'tutor-pjj', nama: 'Tutor pada Pendidikan Jarak Jauh', jenis: 'Ekuivalen', jp: 3, urutan: 15 }
    ];

    const stored = localStorage.getItem('master_tugas_tambahan');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Error reading master_tugas_tambahan", e);
      }
    }
    localStorage.setItem('master_tugas_tambahan', JSON.stringify(defaultList));
    return defaultList;
  });

  const saveMasterTugasList = (newList: MasterTugas[]) => {
    setMasterTugasList(newList);
    localStorage.setItem('master_tugas_tambahan', JSON.stringify(newList));
  };

  const sortedMasterTugasList = useMemo(() => {
    return [...masterTugasList].sort((a, b) => a.urutan - b.urutan);
  }, [masterTugasList]);

  // Master Tugas Form
  const [newTugasNama, setNewTugasNama] = useState('');
  const [newTugasJenis, setNewTugasJenis] = useState<'Utama' | 'Ekuivalen' | 'Sekolah'>('Utama');
  const [newTugasJP, setNewTugasJP] = useState<number>(2);

  // ------------------------------------------------------------
  // DRAFT TUGAS TAMBAHAN SYSTEM
  // ------------------------------------------------------------
  const [gridDraft, setGridDraft] = useState<Record<string, GuruTugasRow>>({});

  const loadDraftFromParent = () => {
    if (!currentAcademicTerm) return;
    const loaded: Record<string, GuruTugasRow> = {};

    // Use sorted guru for consistent order
    const guruList = [...gurus].sort((a, b) => {
      const aTime = a.created_at || '';
      const bTime = b.created_at || '';
      return aTime.localeCompare(bTime);
    });

    guruList.forEach(g => {
      const isWali = kelass.some(c => c.wali_kelas_id === g.id && c.status_aktif && c.jenis === 'REAL');

      const teacherTasks = tugasTambahans.filter(
        t => t.guru_id === g.id && t.academic_term_id === currentAcademicTerm.id
      );

      let ut = "";
      let eq1 = isWali ? "ekuivalen-wali-kelas" : "";
      let eq2 = "";
      let eq3 = "";
      let sk1 = "";
      let sk2 = "";
      let sk3 = "";

      const eqCustoms: string[] = [];
      const skCustoms: string[] = [];

      teacherTasks.forEach(t => {
        const master = masterTugasList.find(m => m.nama === t.nama_tugas || m.id === t.nama_tugas);
        if (master) {
          if (master.jenis === 'Utama') {
            ut = master.id;
          } else if (master.jenis === 'Ekuivalen') {
            if (master.id !== 'ekuivalen-wali-kelas') {
              eqCustoms.push(master.id);
            }
          } else if (master.jenis === 'Sekolah') {
            skCustoms.push(master.id);
          }
        }
      });

      if (isWali) {
        eq1 = "ekuivalen-wali-kelas";
        if (eqCustoms[0]) eq2 = eqCustoms[0];
        if (eqCustoms[1]) eq3 = eqCustoms[1];
      } else {
        if (eqCustoms[0]) eq1 = eqCustoms[0];
        if (eqCustoms[1]) eq2 = eqCustoms[1];
        if (eqCustoms[2]) eq3 = eqCustoms[2];
      }

      if (skCustoms[0]) sk1 = skCustoms[0];
      if (skCustoms[1]) sk2 = skCustoms[1];
      if (skCustoms[2]) sk3 = skCustoms[2];

      loaded[g.id] = {
        utama: ut,
        ekuivalen1: eq1,
        ekuivalen2: eq2,
        ekuivalen3: eq3,
        sekolah1: sk1,
        sekolah2: sk2,
        sekolah3: sk3
      };
    });
    setGridDraft(loaded);
  };

  useEffect(() => {
    loadDraftFromParent();
  }, [tugasTambahans, kelass, gurus, masterTugasList, currentAcademicTerm]);

  const isTugasGridDirty = useMemo(() => {
    if (!currentAcademicTerm) return false;
    const dbTasks = tugasTambahans.filter(t => t.academic_term_id === currentAcademicTerm.id);

    const compiledDraft: Array<{ guru_id: string; nama_tugas: string }> = [];
    gurus.forEach(g => {
      const row = gridDraft[g.id];
      if (!row) return;
      const isWali = kelass.some(c => c.wali_kelas_id === g.id && c.status_aktif && c.jenis === 'REAL');

      if (isWali) {
        compiledDraft.push({ guru_id: g.id, nama_tugas: 'Wali Kelas' });
      }

      if (row.utama && !isWali) {
        const m = masterTugasList.find(x => x.id === row.utama);
        compiledDraft.push({ guru_id: g.id, nama_tugas: m?.nama || row.utama });
      } else if (!isWali) {
        const eqSlots = [row.ekuivalen1, row.ekuivalen2, row.ekuivalen3];
        eqSlots.forEach(val => {
          if (val && val !== 'ekuivalen-wali-kelas') {
            const m = masterTugasList.find(x => x.id === val);
            compiledDraft.push({ guru_id: g.id, nama_tugas: m?.nama || val });
          }
        });
      } else {
        const eqSlots = [row.ekuivalen2, row.ekuivalen3];
        eqSlots.forEach(val => {
          if (val) {
            const m = masterTugasList.find(x => x.id === val);
            compiledDraft.push({ guru_id: g.id, nama_tugas: m?.nama || val });
          }
        });
      }

      const skSlots = [row.sekolah1, row.sekolah2, row.sekolah3];
      skSlots.forEach(val => {
        if (val) {
          const m = masterTugasList.find(x => x.id === val);
          compiledDraft.push({ guru_id: g.id, nama_tugas: m?.nama || val });
        }
      });
    });

    const dbTaskKeys = dbTasks.map(t => `${t.guru_id}-${t.nama_tugas}`).sort();
    const draftTaskKeys = compiledDraft.map(t => `${t.guru_id}-${t.nama_tugas}`).sort();

    return JSON.stringify(dbTaskKeys) !== JSON.stringify(draftTaskKeys);
  }, [gridDraft, tugasTambahans, currentAcademicTerm, gurus, masterTugasList, kelass]);

  // ------------------------------------------------------------
  // WORKLOAD CALCULATIONS
  // ------------------------------------------------------------
  const getTeacherJPs = (guruId: string) => {
    const dapoAllocations = draftDapo.filter(
      (a) => a.guru_id === guruId && a.academic_term_id === currentAcademicTerm?.id
    );

    let totalDapoHours = 0;
    dapoAllocations.forEach((current) => {
      const subject = mapels.find((m) => m.id === current.mapel_id);
      const kelas = kelass.find((k) => k.id === current.kelas_id);
      if (subject && kelas) {
        const isReal = kelas.jenis === 'REAL';
        const hours = isReal ? (subject.jp_real || 2) : (subject.jp_dapo || 2);
        totalDapoHours += hours;
      }
    });

    let taskHours = 0;
    const row = gridDraft[guruId];
    if (row) {
      const isWali = kelass.some(c => c.wali_kelas_id === guruId && c.status_aktif && c.jenis === 'REAL');
      if (isWali) {
        const m = masterTugasList.find(x => x.id === 'ekuivalen-wali-kelas');
        taskHours += m?.jp || 2;
      }
      if (row.utama && !isWali) {
        const m = masterTugasList.find(x => x.id === row.utama);
        taskHours += m?.jp || 12;
      } else if (!isWali) {
        const eqSlots = [row.ekuivalen1, row.ekuivalen2, row.ekuivalen3];
        eqSlots.forEach(val => {
          if (val && val !== 'ekuivalen-wali-kelas') {
            const m = masterTugasList.find(x => x.id === val);
            taskHours += m?.jp || 0;
          }
        });
      } else {
        const eqSlots = [row.ekuivalen2, row.ekuivalen3];
        eqSlots.forEach(val => {
          if (val) {
            const m = masterTugasList.find(x => x.id === val);
            taskHours += m?.jp || 0;
          }
        });
      }
      const skSlots = [row.sekolah1, row.sekolah2, row.sekolah3];
      skSlots.forEach(val => {
        if (val) {
          const m = masterTugasList.find(x => x.id === val);
          taskHours += m?.jp || 0;
        }
      });
    } else {
      const tTasks = tugasTambahans.filter((t) => t.guru_id === guruId && t.academic_term_id === currentAcademicTerm?.id);
      taskHours = tTasks.reduce((sum, task) => sum + (task.jam_per_minggu || 0), 0);
    }

    const jpTotalDapo = totalDapoHours + taskHours;
    return { totalDapoHours, taskHours, jpTotalDapo };
  };

  const getLoadBadgeAndColor = (totalJpHours: number) => {
    if (totalJpHours === 0) return { label: 'Kosong', style: 'bg-neutral-100 text-neutral-500 border-neutral-200' };
    if (totalJpHours < 24) return { label: 'Kurang Beban', style: 'bg-rose-50 text-rose-700 border-rose-200 font-bold' };
    if (totalJpHours > 40) return { label: 'Overload', style: 'bg-amber-50 text-amber-700 border-amber-200 font-bold' };
    return { label: 'Seimbang', style: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' };
  };

  const filteredGurus = useMemo(() => {
    const list = gurus.filter(
      (g) => g.status_aktif && g.nama.toLowerCase().includes(searchTerm.toLowerCase())
    );
    // Sort by database insertion order (created_at)
    return [...list].sort((a, b) => {
      const aTime = a.created_at || '';
      const bTime = b.created_at || '';
      return aTime.localeCompare(bTime);
    });
  }, [gurus, searchTerm]);

  const sortedActiveGurus = useMemo(() => {
    // Sort by database insertion order (created_at)
    return [...gurus]
      .filter((g) => g.status_aktif)
      .sort((a, b) => {
        const aTime = a.created_at || '';
        const bTime = b.created_at || '';
        return aTime.localeCompare(bTime);
      });
  }, [gurus]);

  // ------------------------------------------------------------
  // MATRIKS MENGAJAR DRAG & CHANGE HANDLERS
  // ------------------------------------------------------------
  const handleLocalDraftChangeDapo = (mapelId: string, classId: string, guruId: string) => {
    setDraftDapo(prev => {
      const clean = prev.filter(p => !(p.mapel_id === mapelId && p.kelas_id === classId && p.academic_term_id === currentAcademicTerm?.id));
      if (guruId === '') return clean;

      const newAssign: PembagianMengajar = {
        id: `pmd-${Date.now()}-${mapelId}-${classId}`,
        guru_id: guruId,
        mapel_id: mapelId,
        kelas_id: classId,
        jenis: kelass.find(k => k.id === classId)?.jenis || 'REAL',
        jp: 2, // will be overridden during commit save based on mapel's defaults
        academic_term_id: currentAcademicTerm?.id || '',
        created_at: new Date().toISOString()
      };
      return [...clean, newAssign];
    });
  };

  const handleSaveDraftChanges = async () => {
    if (!currentAcademicTerm) return;
    try {
      const dbAllocations = allocations.filter(a => a.academic_term_id === currentAcademicTerm.id);

      const toDelete = dbAllocations.filter(
        a => !draftDapo.some(d => d.mapel_id === a.mapel_id && d.kelas_id === a.kelas_id)
      );

      const toSave: PembagianMengajar[] = [];
      draftDapo.forEach(d => {
        const existing = dbAllocations.find(a => a.mapel_id === d.mapel_id && a.kelas_id === d.kelas_id);
        if (!existing || existing.guru_id !== d.guru_id) {
          const mapel = mapels.find(m => m.id === d.mapel_id);
          const kelas = kelass.find(k => k.id === d.kelas_id);
           const isReal = kelas?.jenis === 'REAL';
           const jpVal = isReal ? (mapel?.jp_real || 2) : (mapel?.jp_dapo || 2);

          toSave.push({
            id: existing?.id || crypto.randomUUID(),
            academic_term_id: currentAcademicTerm.id,
            guru_id: d.guru_id,
            mapel_id: d.mapel_id,
            kelas_id: d.kelas_id,
            jenis: kelas?.jenis || 'REAL',
            jp: jpVal,
            created_at: existing?.created_at || new Date().toISOString()
          });
        }
      });

      for (const t of toSave) {
        await saveAllocationMutation.mutateAsync(t);
      }
      for (const t of toDelete) {
        await deleteAllocationMutation.mutateAsync(t.id);
      }

      toast.success("Semua penempatan tugas mengajar berhasil disimpan!");
    } catch (err: any) {
      toast.error(`Gagal menyimpan alokasi mengajar: ${err.message}`);
    }
  };

  const handleDiscardDraftChanges = () => {
    toast.confirm("Apakah Anda yakin ingin membatalkan semua draf perubahan penempatan mengajar?", () => {
      const termAllocations = allocations.filter(a => a.academic_term_id === currentAcademicTerm?.id);
      setDraftDapo(termAllocations);
    });
  };

  // ------------------------------------------------------------
  // MATRIKS TUGAS TAMBAHAN HANDLERS
  // ------------------------------------------------------------
  const handleDropdownChange = (guruId: string, slot: keyof GuruTugasRow, val: string) => {
    setGridDraft(prev => {
      const current = { ...prev[guruId] };
      const isWali = kelass.some(c => c.wali_kelas_id === guruId && c.status_aktif && c.jenis === 'REAL');

      if (slot === 'utama') {
        current.utama = val;
        if (val !== '') {
          if (isWali) {
            toast.error("Wali Kelas memiliki tugas tambahan Ekuivalen sehingga tidak dapat memegang tugas tambahan Utama!");
            current.utama = '';
          } else {
            current.ekuivalen1 = '';
            current.ekuivalen2 = '';
            current.ekuivalen3 = '';
          }
        }
      } else if (slot === 'ekuivalen1') {
        if (isWali && val !== 'ekuivalen-wali-kelas') {
          toast.error("Wali Kelas terkunci otomatis pada slot Ekuivalen 1!");
          return prev;
        }
        current.ekuivalen1 = val;
        if (val !== '') current.utama = '';
        if (val === '') {
          current.ekuivalen2 = '';
          current.ekuivalen3 = '';
        }
      } else if (slot === 'ekuivalen2') {
        current.ekuivalen2 = val;
        if (val !== '') current.utama = '';
        if (val === '') current.ekuivalen3 = '';
      } else if (slot === 'ekuivalen3') {
        current.ekuivalen3 = val;
        if (val !== '') current.utama = '';
      } else if (slot === 'sekolah1') {
        current.sekolah1 = val;
        if (val === '') {
          current.sekolah2 = '';
          current.sekolah3 = '';
        }
      } else if (slot === 'sekolah2') {
        current.sekolah2 = val;
        if (val === '') current.sekolah3 = '';
      } else if (slot === 'sekolah3') {
        current.sekolah3 = val;
      }

      return { ...prev, [guruId]: current };
    });
  };

  const handleSaveTugasGridAll = async () => {
    if (!currentAcademicTerm) return;
    try {
      const dbTasks = tugasTambahans.filter(t => t.academic_term_id === currentAcademicTerm.id);

      const compiledTasks: Array<{ guru_id: string; nama_tugas: string; jam_per_minggu: number }> = [];
      gurus.forEach(g => {
        const row = gridDraft[g.id];
        if (!row) return;

        const isWali = kelass.some(c => c.wali_kelas_id === g.id && c.status_aktif && c.jenis === 'REAL');

        if (isWali) {
          const m = masterTugasList.find(x => x.id === 'ekuivalen-wali-kelas');
          compiledTasks.push({
            guru_id: g.id,
            nama_tugas: m?.nama || 'Wali Kelas',
            jam_per_minggu: m?.jp || 2
          });
        }

        if (row.utama && !isWali) {
          const m = masterTugasList.find(x => x.id === row.utama);
          compiledTasks.push({
            guru_id: g.id,
            nama_tugas: m?.nama || row.utama,
            jam_per_minggu: m?.jp || 12
          });
        } else if (!isWali) {
          const eqSlots = [row.ekuivalen1, row.ekuivalen2, row.ekuivalen3];
          eqSlots.forEach(val => {
            if (val && val !== 'ekuivalen-wali-kelas') {
              const m = masterTugasList.find(x => x.id === val);
              compiledTasks.push({
                guru_id: g.id,
                nama_tugas: m?.nama || val,
                jam_per_minggu: m?.jp || 2
              });
            }
          });
        } else {
          const eqSlots = [row.ekuivalen2, row.ekuivalen3];
          eqSlots.forEach(val => {
            if (val) {
              const m = masterTugasList.find(x => x.id === val);
              compiledTasks.push({
                guru_id: g.id,
                nama_tugas: m?.nama || val,
                jam_per_minggu: m?.jp || 2
              });
            }
          });
        }

        const skSlots = [row.sekolah1, row.sekolah2, row.sekolah3];
        skSlots.forEach(val => {
          if (val) {
            const m = masterTugasList.find(x => x.id === val);
            compiledTasks.push({
              guru_id: g.id,
              nama_tugas: m?.nama || val,
              jam_per_minggu: m?.jp || 2
            });
          }
        });
      });

      const toDelete = dbTasks.filter(
        db => !compiledTasks.some(ct => ct.guru_id === db.guru_id && ct.nama_tugas === db.nama_tugas)
      );

      const toSave: TugasTambahan[] = [];
      compiledTasks.forEach(ct => {
        const existing = dbTasks.find(db => db.guru_id === ct.guru_id && db.nama_tugas === ct.nama_tugas);
        if (!existing || existing.jam_per_minggu !== ct.jam_per_minggu) {
          toSave.push({
            id: existing?.id || crypto.randomUUID(),
            academic_term_id: currentAcademicTerm.id,
            guru_id: ct.guru_id,
            nama_tugas: ct.nama_tugas,
            jam_per_minggu: ct.jam_per_minggu,
            created_at: existing?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      });

      for (const t of toSave) {
        await saveTugasMutation.mutateAsync(t);
      }
      for (const t of toDelete) {
        await deleteTugasMutation.mutateAsync(t.id);
      }

      toast.success("Matriks penugasan tugas tambahan berhasil disimpan!");
    } catch (err: any) {
      toast.error(`Gagal menyimpan tugas tambahan: ${err.message}`);
    }
  };

  const handleResetTugasGridAll = () => {
    toast.confirm("Apakah Anda yakin ingin membatalkan semua draf perubahan tugas tambahan?", () => {
      loadDraftFromParent();
    });
  };

  const handleResetGuruTugasRow = (guruId: string) => {
    const isWali = kelass.some(c => c.wali_kelas_id === guruId && c.status_aktif && c.jenis === 'REAL');
    setGridDraft(prev => ({
      ...prev,
      [guruId]: {
        utama: '',
        ekuivalen1: isWali ? 'ekuivalen-wali-kelas' : '',
        ekuivalen2: '',
        ekuivalen3: '',
        sekolah1: '',
        sekolah2: '',
        sekolah3: ''
      }
    }));
  };

  // ------------------------------------------------------------
  // MASTER TUGAS CONFIG ADD/DELETE
  // ------------------------------------------------------------
  const handleAddMasterTugas = () => {
    if (!newTugasNama.trim()) {
      toast.warning("Nama tugas tambahan wajib diisi!");
      return;
    }
    const newId = makeTugasTambahanId(newTugasNama, newTugasJenis);
    if (masterTugasList.some(m => m.id === newId)) {
      toast.warning("Tugas tambahan serupa sudah terdaftar!");
      return;
    }

    const newTask: MasterTugas = {
      id: newId,
      nama: newTugasNama.trim(),
      jenis: newTugasJenis,
      jp: newTugasJP,
      urutan: masterTugasList.length
    };

    saveMasterTugasList([...masterTugasList, newTask]);
    setNewTugasNama('');
  };

  const handleDeleteMasterTugas = async (id: string) => {
    if (id === 'kepala-sekolah' || id === 'ekuivalen-wali-kelas') {
      toast.warning("Tugas tambahan bawaan sistem tidak boleh dihapus!");
      return;
    }
    toast.confirm("Yakin ingin menghapus master konfigurasi tugas tambahan ini?", () => {
      const filtered = masterTugasList.filter(m => m.id !== id);
      saveMasterTugasList(filtered);
    });
  };

  // Helpers
  const ttuOptions = sortedMasterTugasList.filter(m => m.jenis === 'Utama');
  const tteOptions = sortedMasterTugasList.filter(m => m.jenis === 'Ekuivalen');
  const skOptions = sortedMasterTugasList.filter(m => m.jenis === 'Sekolah');

  return (
    <div className="space-y-6 text-left">

      {/* Header and Sub Tabs Bar */}
      <div className="bg-white border border-neutral-200 rounded-card p-5 shadow-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
        <div>
          <h2 className="text-xl font-bold text-neutral-800 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary-600" />
            Pembagian Jam Mengajar & Tugas Tambahan
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Matriks penugasan mengajar Kurikulum Merdeka formal, tugas tambahan guru ekuivalen, dan rekapitulasi sertifikasi beban kerja.
          </p>
        </div>

        {/* Unified Sub-Tabs Navigation */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveSubTab('MENGAJAR')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-medium transition-all border ${
              activeSubTab === 'MENGAJAR'
                ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                : 'bg-white hover:bg-neutral-50 text-neutral-600 border-neutral-200'
            }`}
          >
            Matriks Mengajar
          </button>

          <button
            onClick={() => setActiveSubTab('TUGAS_MATRIKS')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-medium transition-all border ${
              activeSubTab === 'TUGAS_MATRIKS'
                ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                : 'bg-white hover:bg-neutral-50 text-neutral-600 border-neutral-200'
            }`}
          >
            Matriks Tugas Tambahan
          </button>

          <button
            onClick={() => setActiveSubTab('TUGAS_MASTER')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-medium transition-all border ${
              activeSubTab === 'TUGAS_MASTER'
                ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                : 'bg-white hover:bg-neutral-50 text-neutral-600 border-neutral-200'
            }`}
          >
            Konfig Master Tugas
          </button>

          <button
            onClick={() => setActiveSubTab('REKAP_JP')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-medium transition-all border ${
              activeSubTab === 'REKAP_JP'
                ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                : 'bg-white hover:bg-neutral-50 text-neutral-600 border-neutral-200'
            }`}
          >
            Rekap Beban JP
          </button>

          <button
            onClick={handleImportSeedJSON}
            className="px-3.5 py-1.5 text-xs font-bold rounded-medium transition-all border bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Seed KBM (JSON)
          </button>
        </div>
      </div>

      {/* SUB TAB 1: TEACHING MATRIX */}
      {activeSubTab === 'MENGAJAR' && (
        <>
          {isDapoDirty && (
            <div className="p-4 bg-amber-500 rounded-card text-white shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-left transition-all duration-300">
              <div>
                <p className="text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-white animate-bounce" />
                  DRAF PERUBAHAN MATRIKS MENGAJAR BELUM DISIMPAN!
                </p>
                <p className="text-[10px] opacity-90 mt-1">Sandi perubahan sedang berada dalam memori lokal. Mohon simpan draf Anda sebelum memuat ulang.</p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleDiscardDraftChanges}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-medium border border-transparent transition-colors"
                >
                  Batalkan Perubahan
                </button>
                <button
                  onClick={handleSaveDraftChanges}
                  className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-950 text-white font-bold text-xs rounded-medium border border-transparent shadow flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan Perubahan
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-6">
            <div className="w-full bg-white border border-neutral-200 rounded-card shadow-card p-4 flex flex-col text-left">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 pb-3 border-b border-neutral-200 mb-4 text-left">
                <div>
                  <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                    Alat Plotting : Rombongan Belajar ({currentAcademicTerm?.tahun_ajaran || '-'})
                  </h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    Mekanisme pemilihan Dropdown terintegrasi anti kelebihan beban (Overload).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Class Type Selector Toggle */}
                  <div className="inline-flex bg-neutral-100 rounded-medium p-1 border border-neutral-200 text-xs">
                    <button
                      onClick={() => setSelectedClassType('REAL')}
                      className={`px-3 py-1.5 rounded-medium font-bold transition-all ${
                        selectedClassType === 'REAL'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      REAL (Fisik)
                    </button>
                    <button
                      onClick={() => setSelectedClassType('DAPO')}
                      className={`px-3 py-1.5 rounded-medium font-bold transition-all ${
                        selectedClassType === 'DAPO'
                          ? 'bg-orange-600 text-white shadow-sm'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      DAPO (Dapodik)
                    </button>
                  </div>

                  <div className="inline-flex bg-neutral-100 rounded-medium p-1 border border-neutral-200 text-xs">
                    {[7, 8, 9].map((tingkat) => (
                      <button
                        key={tingkat}
                        onClick={() => setSelectedTingkatFilter(tingkat as 7 | 8 | 9)}
                        className={`px-3.5 py-1.5 rounded-medium font-bold transition-all ${
                          selectedTingkatFilter === tingkat
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'text-neutral-600 hover:text-neutral-900'
                        }`}
                      >
                        Kelas {tingkat}
                      </button>
                    ))}
                  </div>

                  <div className="inline-flex bg-neutral-100 rounded-medium p-0.5 border border-neutral-200 text-xs">
                    <button
                      onClick={() => setLayoutView('TABLE')}
                      className={`px-2 py-1 rounded font-bold transition-all ${
                        layoutView === 'TABLE' ? 'bg-white text-primary-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      Grid
                    </button>
                    <button
                      onClick={() => setLayoutView('CARDS')}
                      className={`px-2 py-1 rounded font-bold transition-all ${
                        layoutView === 'CARDS' ? 'bg-white text-primary-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      Cards
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3.5">
                <label className="text-[10px] font-bold text-neutral-500 font-mono">Highlight Sorot Guru:</label>
                <select
                  className="text-[11px] border border-neutral-200 rounded px-2 py-1 font-medium bg-neutral-50 text-neutral-800 outline-none"
                  value={highlightedGuruId}
                  onChange={(e) => setHighlightedGuruId(e.target.value)}
                >
                  <option value="">-- Sorot Guru --</option>
                  {sortedActiveGurus.map((g) => (
                    <option key={g.id} value={g.id}>
                      {formatNamaGuru(g)}
                    </option>
                  ))}
                </select>
              </div>

              {/* TABLE LAYOUT */}
              {layoutView === 'TABLE' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-450 font-mono text-[9px] uppercase tracking-wider">
                        <th className="py-3 px-3 font-bold w-[220px]">Mata Pelajaran</th>
                        {filteredKelass.map((k) => (
                          <th key={k.id} className="py-3 px-2 font-bold text-center">{k.nama_kelas}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {activeMapels.map((mapel) => (
                        <tr key={mapel.id} className="hover:bg-neutral-50/50">
                          <td className="py-3 px-3 border-r border-neutral-100">
                            <div className="font-bold text-neutral-800 leading-snug">{mapel.nama}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`px-1 rounded text-[9px] font-bold tracking-tight font-mono ${
                                mapel.kelompok_mapel === 'A' ? 'bg-amber-100 text-amber-805' : 'bg-purple-100 text-purple-805'
                              }`}>
                                Kelompok {mapel.kelompok_mapel}
                              </span>
                              <span className="text-[9px] text-neutral-400 font-mono">Real: {mapel.jp_real || 0} JP / Dapo: {mapel.jp_dapo || 0} JP</span>
                            </div>
                          </td>

                          {filteredKelass.map((kelas) => {
                            const draftRec = draftDapo.find(p => p.mapel_id === mapel.id && p.kelas_id === kelas.id && p.academic_term_id === currentAcademicTerm?.id);
                            const currentGuruId = draftRec ? draftRec.guru_id : '';
                            const isHighlighted = highlightedGuruId && currentGuruId === highlightedGuruId;

                            return (
                              <td
                                key={kelas.id}
                                className={`py-2 px-1 text-center transition-all border-r border-neutral-100 ${isHighlighted ? 'bg-amber-100/40 font-bold' : ''}`}
                              >
                                <select
                                  className={`text-[11px] border rounded px-1.5 py-1 w-full max-w-[130px] font-medium transition-all outline-none ${
                                    isHighlighted
                                      ? 'border-primary-400 text-primary-900 bg-primary-50 font-extrabold ring-1 ring-primary-300'
                                      : currentGuruId
                                      ? 'border-neutral-200 text-neutral-700 bg-white font-semibold'
                                      : 'border-dashed border-neutral-300 text-neutral-400 bg-neutral-50/50 hover:bg-neutral-100/50'
                                  }`}
                                  value={currentGuruId}
                                  onChange={(e) => handleLocalDraftChangeDapo(mapel.id, kelas.id, e.target.value)}
                                >
                                  <option value="">-- Kosong --</option>
                                   {sortedActiveGurus.map((g) => (
                                    <option key={g.id} value={g.id}>
                                      {g.nama.slice(0, 16)}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* CARDS LAYOUT FOR MOBILE */}
              {layoutView === 'CARDS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredKelass.map((kelas) => (
                    <div key={kelas.id} className="bg-neutral-50 rounded-card p-4 border border-neutral-200">
                      <div className="font-bold text-neutral-800 text-xs uppercase tracking-wide bg-primary-50 text-primary-700 rounded px-2.5 py-1 inline-block mb-3">
                        Kelas : {kelas.nama_kelas}
                      </div>

                      <div className="space-y-3">
                        {activeMapels.map((mapel) => {
                          const draftRec = draftDapo.find(p => p.mapel_id === mapel.id && p.kelas_id === kelas.id && p.academic_term_id === currentAcademicTerm?.id);
                          const currentGuruId = draftRec ? draftRec.guru_id : '';

                          return (
                            <div key={mapel.id} className="flex justify-between items-center gap-3">
                              <div className="text-left">
                                <p className="font-bold text-[11px] text-neutral-800 leading-tight">{mapel.nama}</p>
                                <p className="text-[9px] text-neutral-400 font-mono mt-0.5">
                                  {kelas.jenis === 'REAL' ? mapel.jp_real : mapel.jp_dapo} JP
                                </p>
                              </div>

                              <select
                                className={`text-[10.5px] border rounded px-1 py-1 font-semibold max-w-[150px] truncate outline-none ${
                                  currentGuruId ? 'bg-white border-neutral-300 text-neutral-700 font-bold' : 'bg-neutral-100 border-dashed border-neutral-300 text-neutral-400'
                                }`}
                                value={currentGuruId}
                                onChange={(e) => handleLocalDraftChangeDapo(mapel.id, kelas.id, e.target.value)}
                              >
                                <option value="">-- Kosong --</option>
                                 {sortedActiveGurus.map((g) => (
                                  <option key={g.id} value={g.id}>{g.nama}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar real-time Monitor */}
            <div className="w-full bg-white border border-neutral-200 rounded-card shadow-card p-5 flex flex-col text-left">
              <div className="pb-3 border-b border-neutral-150 mb-3 text-left">
                <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-primary-600" />
                  Monitor JP & Beban Mengajar Guru
                </h4>
                <p className="text-[10px] text-neutral-400 mt-1 leading-tight">
                  Target sertifikasi beban mengajar: <strong>24 s/d 40 JP</strong>. Merah = Kurang | Hijau = Seimbang | Kuning = Overload.
                </p>
              </div>

              {/* Sidebar filter search */}
              <div className="relative mb-3.5 max-w-sm">
                <input
                  type="text"
                  className="w-full text-xs border border-neutral-250 rounded-medium pl-8 pr-3 py-1.5 bg-neutral-50 focus:bg-white outline-none font-medium text-neutral-800"
                  placeholder="Cari guru..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -tranneutral-y-1/2" />
              </div>

              {/* Workload list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto p-1 text-xs">
                {filteredGurus.map((g) => {
                  const jps = getTeacherJPs(g.id);
                  const loadBadge = getLoadBadgeAndColor(jps.jpTotalDapo);

                  return (
                    <div
                      key={g.id}
                      onClick={() => setHighlightedGuruId(g.id === highlightedGuruId ? '' : g.id)}
                      className={`p-3 rounded-card border text-left cursor-pointer transition-all flex flex-col justify-between ${
                        highlightedGuruId === g.id
                          ? 'bg-amber-50 border-amber-300 shadow-sm'
                          : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100/70'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-bold text-xs text-neutral-800 leading-snug">{formatNamaGuru(g)}</p>
                          <p className="text-[9.5px] text-neutral-450 font-mono mt-1">
                            NIP: {g.nip || '-'}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] border font-bold ${loadBadge.style}`}>
                          {jps.jpTotalDapo} JP
                        </span>
                      </div>

                      <div className="mt-2 text-[9px] font-mono text-neutral-500 bg-white/60 p-1.5 rounded border border-neutral-100 flex justify-between items-center">
                        <div>Fisik Mengajar: <strong className="text-neutral-700">{jps.totalDapoHours} JP</strong></div>
                        <div>Tugas +: <strong className="text-neutral-700">+{jps.taskHours} JP</strong></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* SUB TAB 2: MATRIKS TUGAS TAMBAHAN */}
      {activeSubTab === 'TUGAS_MATRIKS' && (
        <>
          {isTugasGridDirty && (
            <div className="p-4 bg-amber-500 rounded-card text-white shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-left transition-all duration-300">
              <div>
                <p className="text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-white animate-bounce" />
                  DRAF PENUGASAN TUGAS TAMBAHAN BELUM DISIMPAN!
                </p>
                <p className="text-[10px] opacity-90 mt-1">
                  Anda telah membuat perubahan dalam matriks tugas tambahan guru. Silakan simpan untuk memperbarui database.
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleResetTugasGridAll}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-medium border border-transparent transition-colors"
                >
                  Batalkan Perubahan
                </button>
                <button
                  onClick={handleSaveTugasGridAll}
                  className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-950 text-white font-bold text-xs rounded-medium border border-transparent shadow flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan Semua (Save All)
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border border-neutral-200 rounded-card shadow-card p-5 text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-neutral-200 gap-3 mb-5">
              <div>
                <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  Matriks Penugasan Tugas Tambahan Guru
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Slot berwarna: <span className="text-primary-650 font-bold">Biru = TT Utama</span>, <span className="text-success-650 font-bold">Hijau = TT Ekuivalen</span>, <span className="text-purple-650 font-bold">Ungu = TT Sekolah</span>. Wali Kelas terpasang otomatis dan terkunci di TTE 1.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetTugasGridAll}
                  disabled={!isTugasGridDirty}
                  className={`px-3 py-1.5 text-xs font-bold rounded-medium transition-all border ${
                    isTugasGridDirty
                      ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 border-neutral-300'
                      : 'bg-neutral-50 text-neutral-300 border-neutral-200 cursor-not-allowed'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5 inline-block mr-1" />
                  Batalkan Draf
                </button>

                <button
                  onClick={handleSaveTugasGridAll}
                  disabled={!isTugasGridDirty}
                  className={`px-4 py-1.5 text-xs font-bold rounded-medium transition-all shadow-sm flex items-center gap-1.5 ${
                    isTugasGridDirty
                      ? 'bg-primary-600 hover:bg-primary-700 text-white'
                      : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan Semua
                </button>
              </div>
            </div>

            <div className="relative max-w-sm mb-4">
              <input
                type="text"
                placeholder="Cari guru penerima tugas..."
                className="w-full text-xs border border-neutral-250 rounded-medium pl-8 pr-3 py-1.5 bg-neutral-50 focus:bg-white outline-none text-neutral-800 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -tranneutral-y-1/2" />
            </div>

            <div className="overflow-x-auto border border-neutral-200 rounded-card">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                    <th className="py-3 px-3 font-semibold w-[180px]">Nama Guru</th>
                    <th className="py-3 px-3 font-semibold text-center bg-blue-50/50 w-[140px] text-blue-700 border-x border-neutral-100">TT Utama (TTU)</th>
                    <th className="py-3 px-3 font-semibold text-center bg-emerald-50/40 w-[140px] text-emerald-700">TTE 1</th>
                    <th className="py-3 px-3 font-semibold text-center bg-emerald-50/40 w-[140px] text-emerald-700">TTE 2</th>
                    <th className="py-3 px-3 font-semibold text-center bg-emerald-50/40 w-[140px] text-emerald-700 border-r border-neutral-100">TTE 3</th>
                    <th className="py-3 px-3 font-semibold text-center bg-purple-50/40 w-[140px] text-purple-700">TTS 1</th>
                    <th className="py-3 px-3 font-semibold text-center bg-purple-50/40 w-[140px] text-purple-700">TTS 2</th>
                    <th className="py-3 px-3 font-semibold text-center bg-purple-50/40 w-[140px] text-purple-700 border-r border-neutral-100">TTS 3</th>
                    <th className="py-3 px-3 font-semibold text-center w-[90px]">Total JP +</th>
                    <th className="py-3 px-3 text-center w-[60px]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {filteredGurus.map((g) => {
                    const row = gridDraft[g.id] || { utama: '', ekuivalen1: '', ekuivalen2: '', ekuivalen3: '', sekolah1: '', sekolah2: '', sekolah3: '' };
                    const jps = getTeacherJPs(g.id);
                     const isWali = kelass.some(c => c.wali_kelas_id === g.id && c.status_aktif && c.jenis === 'REAL');

                    return (
                      <tr key={g.id} className="hover:bg-neutral-50/30">
                        <td className="py-3 px-3 border-r border-neutral-100 font-bold text-neutral-800">
                          {formatNamaGuru(g)}
                        </td>

                        {/* TT Utama */}
                        <td className="py-2.5 px-2 bg-blue-50/10 border-r border-neutral-100">
                          <select
                            disabled={isWali}
                            className={`text-[10.5px] border rounded px-1.5 py-1 w-full font-semibold outline-none ${
                              isWali
                                ? 'bg-neutral-100 border-neutral-200 text-neutral-400 italic'
                                : row.utama
                                ? 'bg-blue-50 border-blue-200 text-blue-800 font-bold'
                                : 'bg-white border-neutral-200 text-neutral-400 border-dashed hover:bg-neutral-50'
                            }`}
                            value={row.utama}
                            onChange={(e) => handleDropdownChange(g.id, 'utama', e.target.value)}
                          >
                            <option value="">-- Kosong --</option>
                            {ttuOptions.map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.nama} ({opt.jp} JP)</option>
                            ))}
                          </select>
                        </td>

                        {/* TTE 1 */}
                        <td className="py-2.5 px-2 bg-emerald-50/10">
                          {isWali ? (
                            <span className="inline-flex items-center gap-1 justify-center w-full py-1.5 text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold">
                              <Award className="w-3 h-3 text-emerald-600 shrink-0" />
                              Wali Kelas (2 JP)
                            </span>
                          ) : (
                            <select
                              disabled={row.utama !== ''}
                              className={`text-[10.5px] border rounded px-1.5 py-1 w-full font-semibold outline-none ${
                                row.utama !== ''
                                  ? 'bg-neutral-100 border-neutral-200 text-neutral-400 italic'
                                  : row.ekuivalen1
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-805 font-bold'
                                  : 'bg-white border-neutral-200 text-neutral-400 border-dashed hover:bg-neutral-50'
                              }`}
                              value={row.ekuivalen1}
                              onChange={(e) => handleDropdownChange(g.id, 'ekuivalen1', e.target.value)}
                            >
                              <option value="">-- Kosong --</option>
                              {tteOptions.filter(o => o.id !== 'ekuivalen-wali-kelas').map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.nama} ({opt.jp} JP)</option>
                              ))}
                            </select>
                          )}
                        </td>

                        {/* TTE 2 */}
                        <td className="py-2.5 px-2 bg-emerald-50/10">
                          <select
                            disabled={row.utama !== '' || (!isWali && !row.ekuivalen1)}
                            className={`text-[10.5px] border rounded px-1.5 py-1 w-full font-semibold outline-none ${
                              row.utama !== '' || (!isWali && !row.ekuivalen1)
                                ? 'bg-neutral-100 border-neutral-200 text-neutral-400 italic'
                                : row.ekuivalen2
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-808 font-bold'
                                : 'bg-white border-neutral-200 text-neutral-400 border-dashed hover:bg-neutral-50'
                            }`}
                            value={row.ekuivalen2}
                            onChange={(e) => handleDropdownChange(g.id, 'ekuivalen2', e.target.value)}
                          >
                            <option value="">-- Kosong --</option>
                            {tteOptions.filter(o => o.id !== 'ekuivalen-wali-kelas' && o.id !== row.ekuivalen1).map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.nama} ({opt.jp} JP)</option>
                            ))}
                          </select>
                        </td>

                        {/* TTE 3 */}
                        <td className="py-2.5 px-2 bg-emerald-50/10 border-r border-neutral-150">
                          <select
                            disabled={row.utama !== '' || !row.ekuivalen2}
                            className={`text-[10.5px] border rounded px-1.5 py-1 w-full font-semibold outline-none ${
                              row.utama !== '' || !row.ekuivalen2
                                ? 'bg-neutral-100 border-neutral-200 text-neutral-400 italic'
                                : row.ekuivalen3
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold'
                                : 'bg-white border-neutral-200 text-neutral-400 border-dashed hover:bg-neutral-50'
                            }`}
                            value={row.ekuivalen3}
                            onChange={(e) => handleDropdownChange(g.id, 'ekuivalen3', e.target.value)}
                          >
                            <option value="">-- Kosong --</option>
                            {tteOptions.filter(o => o.id !== 'ekuivalen-wali-kelas' && o.id !== row.ekuivalen1 && o.id !== row.ekuivalen2).map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.nama} ({opt.jp} JP)</option>
                            ))}
                          </select>
                        </td>

                        {/* TTS 1 */}
                        <td className="py-2.5 px-2 bg-purple-50/10">
                          <select
                            className={`text-[10.5px] border rounded px-1.5 py-1 w-full font-semibold outline-none ${
                              row.sekolah1
                                ? 'bg-purple-50 border-purple-200 text-purple-800 font-bold'
                                : 'bg-white border-neutral-200 text-neutral-400 border-dashed hover:bg-neutral-50'
                            }`}
                            value={row.sekolah1}
                            onChange={(e) => handleDropdownChange(g.id, 'sekolah1', e.target.value)}
                          >
                            <option value="">-- Kosong --</option>
                            {skOptions.map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.nama} ({opt.jp} JP)</option>
                            ))}
                          </select>
                        </td>

                        {/* TTS 2 */}
                        <td className="py-2.5 px-2 bg-purple-50/10">
                          <select
                            disabled={!row.sekolah1}
                            className={`text-[10.5px] border rounded px-1.5 py-1 w-full font-semibold outline-none ${
                              !row.sekolah1
                                ? 'bg-neutral-100 border-neutral-200 text-neutral-400 italic'
                                : row.sekolah2
                                ? 'bg-purple-50 border-purple-200 text-purple-800 font-bold'
                                : 'bg-white border-neutral-200 text-neutral-400 border-dashed hover:bg-neutral-50'
                            }`}
                            value={row.sekolah2}
                            onChange={(e) => handleDropdownChange(g.id, 'sekolah2', e.target.value)}
                          >
                            <option value="">-- Kosong --</option>
                            {skOptions.filter(o => o.id !== row.sekolah1).map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.nama} ({opt.jp} JP)</option>
                            ))}
                          </select>
                        </td>

                        {/* TTS 3 */}
                        <td className="py-2.5 px-2 bg-purple-50/10 border-r border-neutral-150">
                          <select
                            disabled={!row.sekolah2}
                            className={`text-[10.5px] border rounded px-1.5 py-1 w-full font-semibold outline-none ${
                              !row.sekolah2
                                ? 'bg-neutral-100 border-neutral-200 text-neutral-400 italic'
                                : row.sekolah3
                                ? 'bg-purple-50 border-purple-200 text-purple-800 font-bold'
                                : 'bg-white border-neutral-200 text-neutral-400 border-dashed hover:bg-neutral-50'
                            }`}
                            value={row.sekolah3}
                            onChange={(e) => handleDropdownChange(g.id, 'sekolah3', e.target.value)}
                          >
                            <option value="">-- Kosong --</option>
                            {skOptions.filter(o => o.id !== row.sekolah1 && o.id !== row.sekolah2).map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.nama} ({opt.jp} JP)</option>
                            ))}
                          </select>
                        </td>

                        {/* Total Additional JPs */}
                        <td className="py-3 px-3 border-r border-neutral-100 text-center font-bold font-mono bg-neutral-50">
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-100">
                            +{jps.taskHours} JP
                          </span>
                        </td>

                        {/* Row Reset Actions */}
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleResetGuruTugasRow(g.id)}
                            className="p-1 text-rose-500 hover:text-white hover:bg-rose-600 rounded border border-transparent transition-all"
                            title="Reset tugas guru ini ke default/kosong"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* SUB TAB 3: CONFIG MASTER TUGAS */}
      {activeSubTab === 'TUGAS_MASTER' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">

          {/* New Tugas Form */}
          <div className="bg-white border border-neutral-200 rounded-card p-5 shadow-card h-fit">
            <h3 className="text-sm font-bold text-neutral-800 border-b pb-3 mb-4 uppercase tracking-wide">
              Registrasi Master Tugas Baru
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-500 mb-1">Nama Tugas Tambahan *</label>
                <input
                  type="text"
                  className="w-full text-xs border border-neutral-300 rounded-medium px-3 py-2 bg-neutral-50 outline-none font-medium focus:bg-white text-neutral-800"
                  placeholder="Contoh: Pembina Pramuka"
                  value={newTugasNama}
                  onChange={(e) => setNewTugasNama(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-500 mb-1">Kategori Jenis *</label>
                <select
                  className="w-full text-xs border border-neutral-300 rounded-medium px-3 py-2 bg-white outline-none font-medium text-neutral-800"
                  value={newTugasJenis}
                  onChange={(e) => setNewTugasJenis(e.target.value as any)}
                >
                  <option value="Utama">Utama (TTU)</option>
                  <option value="Ekuivalen">Ekuivalen (TTE)</option>
                  <option value="Sekolah">Sekolah (TTS)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-500 mb-1">Beban JP Ekuivalensi *</label>
                <input
                  type="number"
                  className="w-full text-xs border border-neutral-300 rounded-medium px-3 py-2 bg-neutral-50 outline-none font-medium focus:bg-white text-neutral-800"
                  value={newTugasJP}
                  onChange={(e) => setNewTugasJP(Number(e.target.value))}
                  min={1}
                  max={24}
                />
              </div>

              <button
                onClick={handleAddMasterTugas}
                className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-medium font-bold text-xs shadow-sm flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Daftarkan Master Tugas
              </button>
            </div>
          </div>

          {/* Master Tugas List */}
          <div className="bg-white border border-neutral-200 rounded-card p-5 shadow-card lg:col-span-2">
            <h3 className="text-sm font-bold text-neutral-800 border-b pb-3 mb-4 uppercase tracking-wide">
              Katalog Master Tugas Tambahan
            </h3>

            <div className="overflow-x-auto rounded-card border border-neutral-200">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                    <th className="py-2.5 px-3">Nama Tugas</th>
                    <th className="py-2.5 px-3 text-center">Kategori</th>
                    <th className="py-2.5 px-3 text-center">Nominal Beban (JP)</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {sortedMasterTugasList.map((m) => (
                    <tr key={m.id} className="hover:bg-neutral-50/50">
                      <td className="py-2.5 px-3 font-semibold text-neutral-850">{m.nama}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          m.jenis === 'Utama'
                            ? 'bg-blue-100 text-blue-800'
                            : m.jenis === 'Ekuivalen'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {m.jenis}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">{m.jp} JP</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          disabled={m.id === 'kepala-sekolah' || m.id === 'ekuivalen-wali-kelas'}
                          onClick={() => handleDeleteMasterTugas(m.id)}
                          className={`p-1 text-rose-500 hover:bg-rose-50 rounded ${
                            m.id === 'kepala-sekolah' || m.id === 'ekuivalen-wali-kelas'
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:text-rose-750'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 4: REKAP BEBAN JP */}
      {activeSubTab === 'REKAP_JP' && (
        <div className="bg-white border border-neutral-200 rounded-card shadow-card p-5 text-left">
          <div className="flex justify-between items-center pb-4 border-b border-neutral-200 mb-5">
            <div>
              <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
                Rekapitulasi Jam Pelajaran & Kelayakan Beban Kerja Guru
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Cetak ringkasan total beban JP untuk verifikasi tunjangan sertifikasi pendidik (Target 24 - 40 JP).
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-medium font-bold text-xs flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Cetak Dokumen
            </button>
          </div>

          <div className="overflow-x-auto border border-neutral-200 rounded-card">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                  <th className="py-3 px-3">Nama Guru</th>
                  <th className="py-3 px-3 text-center">NIP</th>
                  <th className="py-3 px-3 text-center">JP Mengajar (Kurikulum)</th>
                  <th className="py-3 px-3 text-center">JP Tugas Tambahan</th>
                  <th className="py-3 px-3 text-center">Total Akumulasi</th>
                  <th className="py-3 px-3 text-center">Status Kelayakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {sortedActiveGurus.map(g => {
                  const jps = getTeacherJPs(g.id);
                  const badge = getLoadBadgeAndColor(jps.jpTotalDapo);

                  return (
                    <tr key={g.id} className="hover:bg-neutral-50/50 h-12">
                      <td className="py-2.5 px-3 font-semibold text-neutral-800">{formatNamaGuru(g)}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-neutral-500">{g.nip || '-'}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">{jps.totalDapoHours} JP</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-primary-600">+{jps.taskHours} JP</td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-neutral-900 bg-neutral-50/50">{jps.jpTotalDapo} JP</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] border font-bold ${badge.style}`}>
                          {badge.label} ({jps.jpTotalDapo} JP)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
