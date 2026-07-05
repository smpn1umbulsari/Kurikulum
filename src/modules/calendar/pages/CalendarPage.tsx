/**
 * CalendarPage - SIKAD v4.0
 * Premium Calendar with Auto-RPE Calculator
 * Styled to match Aplikasi Kurikulum's CalendarView
 */

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  X,
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  Edit,
  Sun,
  Flag,
  BookOpen,
  Coffee,
  AlertCircle,
  CalendarDays,
  Printer,
  Search,
  Info,
  CalendarRange,
} from 'lucide-react';
import { toast } from '../../../store/toastStore';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  useCalendarEvents,
  useSaveCalendarEvent,
  useDeleteCalendarEvent,
  useCurrentAcademicTerm,
} from '../hooks/useCalendar';
import { useAcademicTerms } from '@/modules/academic-term/hooks/useAcademicTerm';
import {
  calculateSemesterRPE,
  getEventTypeLabel,
  formatDateISO,
} from '../utils/rpeCalculator';
import type { AcademicCalendarEvent, AcademicTerm } from '@/types';

// Validation schema
const eventFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  type: z.enum(['national_holiday', 'school_event', 'exam', 'break'] as const, {
    required_error: 'Pilih tipe acara',
  }),
  title: z.string().min(1, 'Judul tidak boleh kosong').max(255),
  description: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

// Event types for filtering
const EVENT_TYPES = [
  { value: 'all', label: 'Semua', icon: CalendarIcon, color: 'bg-blue-600' },
  { value: 'national_holiday', label: 'Hari Libur Nasional', icon: Sun, color: 'bg-red-500' },
  { value: 'school_event', label: 'Kegiatan Sekolah', icon: Flag, color: 'bg-blue-500' },
  { value: 'exam', label: 'Ujian/SAS', icon: BookOpen, color: 'bg-amber-500' },
  { value: 'break', label: 'Libur/Cuti', icon: Coffee, color: 'bg-green-500' },
] as const;

// Event type specific styles
const EVENT_STYLES: Record<string, { bg: string; border: string; text: string; color: string }> = {
  national_holiday: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', color: 'bg-red-500' },
  school_event: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', color: 'bg-blue-500' },
  exam: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', color: 'bg-amber-500' },
  break: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', color: 'bg-green-500' },
};

export default function CalendarPage() {
  // State
  const [currentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AcademicCalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [activeSemesterTab, setActiveSemesterTab] = useState<'ganjil' | 'genap'>('ganjil');
  const [activeTab, setActiveTab] = useState<'kaldik' | 'rpe' | 'timeline' | 'manage'>('kaldik');
  const [jpPerWeek, setJpPerWeek] = useState<number>(4);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectedDate, setInspectedDate] = useState<string | null>(null);
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState<5 | 6>(5); // 5 = Senin-Jumat, 6 = Senin-Sabtu

  // Queries & Mutations
  const { data: events = [] } = useCalendarEvents();
  const currentTerm = useCurrentAcademicTerm();
  const { data: allTerms = [] } = useAcademicTerms();
  const saveMutation = useSaveCalendarEvent();
  const deleteMutation = useDeleteCalendarEvent();

  // Helper validation for disabled "dead" dates
  const isDeadDate = (monthIdx: number, day: number, year: number): boolean => {
    const test = new Date(year, monthIdx, day);
    return test.getMonth() !== monthIdx;
  };

  // Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      date: '',
      type: 'school_event',
      title: '',
      description: '',
    },
  });

  // Group terms by semester
  const ganjilTerm = useMemo(() => allTerms.find(t => t.semester === 'GANJIL') || allTerms[0], [allTerms]);
  const genapTerm = useMemo(() => allTerms.find(t => t.semester === 'GENAP'), [allTerms]);

  // Calculate semester RPEs
  const ganjilRPE = useMemo(() => {
    if (!ganjilTerm) return null;
    return calculateSemesterRPE(ganjilTerm, events.filter(e => e.is_active));
  }, [ganjilTerm, events]);

  const genapRPE = useMemo(() => {
    if (!genapTerm) return null;
    return calculateSemesterRPE(genapTerm, events.filter(e => e.is_active));
  }, [genapTerm, events]);

  // Helper to extract monthly breakdown for table RPE
  const getRpeCalculation = (rpeData: any, term: AcademicTerm | undefined) => {
    if (!rpeData || !term) return [];
    return rpeData.monthlyBreakdown.map((m: any) => {
      const totalWeeks = m.weeks.length;
      const effectiveWeeks = m.weeks.filter((w: any) => w.effectiveDays >= 3).length;
      const nonEffectiveWeeks = totalWeeks - effectiveWeeks;
      
      const monthEvents = events.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === m.month && d.getFullYear() === m.year && e.is_active && (e.type === 'national_holiday' || e.type === 'break' || e.type === 'exam');
      });
      const eventTitles = Array.from(new Set(monthEvents.map(e => e.title)));

      return {
        monthName: m.monthName,
        totalDays: m.totalDays,
        effectiveDays: m.effectiveDays,
        weekends: m.weekends,
        holidays: m.holidays,
        breaks: m.breaks,
        totalWeeks,
        effectiveWeeks,
        nonEffectiveWeeks,
        keterangan: eventTitles,
      };
    });
  };

  const ganjilBreakdown = useMemo(() => getRpeCalculation(ganjilRPE, ganjilTerm), [ganjilRPE, ganjilTerm, events]);
  const genapBreakdown = useMemo(() => getRpeCalculation(genapRPE, genapTerm), [genapRPE, genapTerm, events]);

  // dayCache logic to map dates of the active semester
  const dayCache = useMemo(() => {
    const cache: Record<string, {
      display_text: string;
      class_name: 'sunday' | 'holiday' | 'exam' | 'school_event' | 'break' | 'effective' | 'weekend';
      is_hari_efektif: boolean;
      event_nama?: string;
      event?: AcademicCalendarEvent;
    }> = {};

    const baseTerm = ganjilTerm || currentTerm;
    const startYear = baseTerm ? new Date(baseTerm.tanggal_mulai).getFullYear() : currentDate.getFullYear();
    const months = activeSemesterTab === 'ganjil' ? [6, 7, 8, 9, 10, 11] : [0, 1, 2, 3, 4, 5];

    let counter = 0;

    for (const m of months) {
      // Ganjil months (Jul-Dec) belong to startYear. Genap months (Jan-Jun) belong to startYear + 1.
      const yr = activeSemesterTab === 'ganjil' ? startYear : startYear + 1;
      const totalDaysInMonth = new Date(yr, m + 1, 0).getDate();

      for (let d = 1; d <= totalDaysInMonth; d++) {
        const dateObj = new Date(yr, m, d);
        const dateStr = `${yr}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayOfWeek = dateObj.getDay();
        const isSun = dayOfWeek === 0;
        const isSat = dayOfWeek === 6;

        const matchingEvent = events.find(e => e.date === dateStr && e.is_active);

        if (isSun) {
          cache[dateStr] = {
            display_text: 'Mgg',
            class_name: 'sunday',
            is_hari_efektif: false,
            event_nama: matchingEvent?.title,
            event: matchingEvent,
          };
        } else if (isSat) {
          cache[dateStr] = {
            display_text: 'Sab',
            class_name: 'weekend',
            is_hari_efektif: false,
            event_nama: matchingEvent?.title,
            event: matchingEvent,
          };
        } else if (matchingEvent) {
          let disp = 'EVT';
          let cls: 'holiday' | 'exam' | 'school_event' | 'break' | 'effective' = 'school_event';
          let isEfektif = false;

          if (matchingEvent.type === 'national_holiday') {
            disp = 'LHB';
            cls = 'holiday';
          } else if (matchingEvent.type === 'break') {
            disp = 'LBR';
            cls = 'break';
          } else if (matchingEvent.type === 'exam') {
            disp = matchingEvent.title.toUpperCase().includes('SAS') ? 'SAS' : 
                   matchingEvent.title.toUpperCase().includes('SAT') ? 'SAT' : 'UJN';
            cls = 'exam';
          } else {
            disp = matchingEvent.title.substring(0, 3).toUpperCase();
            cls = 'school_event';
            isEfektif = true;
          }

          if (isEfektif) {
            counter++;
            disp = String(counter);
          }

          cache[dateStr] = {
            display_text: disp,
            class_name: cls,
            is_hari_efektif: isEfektif,
            event_nama: matchingEvent.title,
            event: matchingEvent,
          };
        } else {
          counter++;
          cache[dateStr] = {
            display_text: String(counter),
            class_name: 'effective',
            is_hari_efektif: true,
          };
        }
      }
    }

    return cache;
  }, [events, activeSemesterTab, ganjilTerm, genapTerm, currentTerm, currentDate]);

  // Filtered timeline events
  const filteredTimelineEvents = useMemo(() => {
    return events
      .filter(e => e.is_active)
      .filter(e => {
        const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesType = filterType === 'all' || e.type === filterType;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, searchQuery, filterType]);

  // Modal handlers
  const openModal = (date?: string, event?: AcademicCalendarEvent) => {
    if (event) {
      setEditingEvent(event);
      reset({
        date: event.date,
        type: event.type,
        title: event.title,
        description: event.description || '',
      });
    } else {
      setEditingEvent(null);
      reset({
        date: date || formatDateISO(new Date()),
        type: 'school_event',
        title: '',
        description: '',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    reset();
  };

  // Form submission
  const onSubmit = (data: EventFormValues) => {
    const event: AcademicCalendarEvent = {
      id: editingEvent?.id || crypto.randomUUID(),
      academic_year_id: currentTerm?.id || '',
      date: data.date,
      type: data.type,
      title: data.title,
      description: data.description,
      is_active: true,
      created_at: editingEvent?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveMutation.mutate(event, {
      onSuccess: () => {
        closeModal();
        if (activeTab === 'manage') {
          reset();
          setEditingEvent(null);
        }
      },
    });
  };

  // Delete handler
  const handleDelete = (id: string) => {
    toast.confirm('Apakah Anda yakin ingin menghapus acara ini?', () => {
      deleteMutation.mutate(id);
    });
  };

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur">
                <CalendarIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Kalender Pendidikan</h1>
                <p className="text-blue-100 text-sm mt-0.5">Kelola agenda akademik & hitung Rincian Pekan Efektif (RPE) secara otomatis</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-neutral-200 bg-white p-2 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm border border-neutral-100">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('kaldik')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'kaldik'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800'
            }`}
          >
            <CalendarIcon className="w-4 h-4" /> Kalender Matriks
          </button>
          <button
            onClick={() => setActiveTab('rpe')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'rpe'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" /> Pekan Efektif (RPE)
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'timeline'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800'
            }`}
          >
            <Clock className="w-4 h-4" /> Timeline Kegiatan
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'manage'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800'
            }`}
          >
            <Plus className="w-4 h-4" /> Input & Kelola
          </button>
        </div>

        <div className="flex items-center gap-3">
          {activeTab !== 'manage' && (
            <button
              onClick={() => window.print()}
              className="bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 font-extrabold text-[11px] py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Printer className="w-4 h-4 text-neutral-500" /> Cetak Dokumen
            </button>
          )}
          <button
            onClick={() => openModal()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Tambah Kegiatan
          </button>
        </div>
      </div>

      {/* TAB 1: KALDIK GRID MONTH VIEW */}
      {activeTab === 'kaldik' && (
        <div className="space-y-4 text-left">
          {/* Warn Banner */}
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-805 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4.5 h-4.5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <strong>Resolusi Konflik Hari Penting Aktif:</strong> Hari Penting (seperti Hari Pramuka atau Hari Santri) yang tidak ditetapkan sebagai libur / menghentikan jam KBM wajib <strong>tetap melanjutkan penomoran numerik Hari Efektif Belajar (HEB)</strong> pada petak tanggal. Kode singkatan khusus (LHB, SAS, SAT) hanya tertulis apabila agenda mem-pause pembelajaran efektif sekolah.
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm overflow-x-auto">
            <div className="min-w-[950px] space-y-4">
              {/* Top Selector bar */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-neutral-800 text-sm">Matriks Kalender Pendidikan</h3>
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-bold border border-blue-200 px-2 py-0.5 rounded-lg">
                    {activeSemesterTab === 'ganjil' ? 'Semester 1 (Ganjil)' : 'Semester 2 (Genap)'} - {ganjilTerm?.tahun_ajaran || '2026/2027'}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  {/* Toggle 5/6 Hari Kerja */}
                  <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 p-1 rounded-xl">
                    <span className="text-[10px] font-bold text-neutral-500 px-2 flex items-center gap-1.5">
                      <CalendarRange className="w-3.5 h-3.5" />
                      Hari Kerja:
                    </span>
                    <button
                      onClick={() => setWorkingDaysPerWeek(5)}
                      className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-all ${
                        workingDaysPerWeek === 5
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-700'
                      }`}
                    >
                      5 Hari
                    </button>
                    <button
                      onClick={() => setWorkingDaysPerWeek(6)}
                      className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-all ${
                        workingDaysPerWeek === 6
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-neutral-500 hover:text-neutral-700'
                      }`}
                    >
                      6 Hari
                    </button>
                  </div>

                  {/* Semester Selector */}
                  <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200">
                  <button
                    onClick={() => setActiveSemesterTab('ganjil')}
                    className={`text-[10px] font-bold px-3.5 py-1.5 rounded-lg transition-all ${
                      activeSemesterTab === 'ganjil'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    Semester Ganjil
                  </button>
                  <button
                    onClick={() => setActiveSemesterTab('genap')}
                    className={`text-[10px] font-bold px-3.5 py-1.5 rounded-lg transition-all ${
                      activeSemesterTab === 'genap'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    Semester Genap
                  </button>
                  </div>
                </div>
              </div>

              {/* Matrix Table */}
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 border-b border-neutral-200">
                    <th className="py-3 px-4 text-left w-28">Bulan</th>
                    {Array.from({ length: 31 }, (_, idx) => (
                      <th key={idx} className="py-2 text-center w-6.5 font-mono border-l border-neutral-100">{idx + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {(() => {
                    const months = activeSemesterTab === 'ganjil' ? [6, 7, 8, 9, 10, 11] : [0, 1, 2, 3, 4, 5];
                    const baseTerm = ganjilTerm || currentTerm;
                    const baseYr = baseTerm ? new Date(baseTerm.tanggal_mulai).getFullYear() : currentDate.getFullYear();

                    return months.map((mIdx) => {
                      const yr = activeSemesterTab === 'ganjil' ? baseYr : baseYr + 1;
                      return (
                        <tr key={mIdx} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-neutral-800 bg-neutral-50/70 border-r border-neutral-100">
                            {monthNames[mIdx]}
                          </td>
                          {Array.from({ length: 31 }, (_, dayIdx) => {
                            const day = dayIdx + 1;
                            const dateStr = `${yr}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            
                            const isDead = isDeadDate(mIdx, day, yr);
                            if (isDead) {
                              return (
                                <td 
                                  key={dayIdx} 
                                  className="p-1 border bg-neutral-200 bg-[linear-gradient(45deg,#e5e5e5_25%,transparent_25%,transparent_50%,#e5e5e5_50%,#e5e5e5_75%,transparent_75%,transparent)] bg-[length:10px_10px] opacity-60 cursor-not-allowed border-neutral-100" 
                                  title="Tanggal Mati"
                                />
                              );
                            }

                            const cachedDay = dayCache[dateStr];
                            const dateObj = new Date(yr, mIdx, day);
                            const dayOfWeek = dateObj.getDay();
                            const isSun = dayOfWeek === 0;
                            const isSat = dayOfWeek === 6;

                            // Class styles
                            let cellBg = "bg-white hover:bg-neutral-50";
                            let cellText = "text-neutral-700";
                            let borderStyle = "border-neutral-100";

                            if (isSun) {
                              cellBg = "bg-red-50 hover:bg-red-100 border-red-200";
                              cellText = "text-red-700 font-extrabold";
                            } else if (isSat) {
                              cellBg = "bg-neutral-50 hover:bg-neutral-100 border-neutral-200";
                              cellText = "text-neutral-500 font-bold";
                            } else if (cachedDay) {
                              if (cachedDay.class_name === 'holiday') {
                                cellBg = "bg-red-100 hover:bg-red-200 border-red-300";
                                cellText = "text-red-900 font-extrabold";
                              } else if (cachedDay.class_name === 'break') {
                                cellBg = "bg-green-50 hover:bg-green-100 border-green-200";
                                cellText = "text-green-700 font-extrabold";
                              } else if (cachedDay.class_name === 'exam') {
                                cellBg = "bg-amber-100 hover:bg-amber-200 border-amber-300";
                                cellText = "text-amber-900 font-extrabold";
                              } else if (cachedDay.class_name === 'school_event') {
                                cellBg = "bg-blue-100 hover:bg-blue-200 border-blue-300";
                                cellText = "text-blue-900 font-extrabold";
                              } else if (cachedDay.class_name === 'effective') {
                                cellBg = "bg-emerald-50 hover:bg-emerald-100 border-emerald-250";
                                cellText = "text-emerald-800 font-bold";
                              }
                            }

                            const hasAgenda = cachedDay?.event_nama;

                            return (
                              <td
                                key={dayIdx}
                                onClick={() => setInspectedDate(dateStr)}
                                className={`p-1 text-center font-mono text-[9px] border cursor-pointer select-none relative h-10 transition-all ${cellBg} ${cellText} ${borderStyle}`}
                                title={`${day} ${monthNames[mIdx]} ${yr} ${hasAgenda ? ': ' + hasAgenda : ''}`}
                              >
                                <div className="absolute top-1 left-1.5 text-[7px] text-neutral-400 font-sans">
                                  {day}
                                </div>
                                <div className="mt-2.5 font-bold text-[10px]">
                                  {isSun ? 'Mgg' : isSat ? 'Sab' : cachedDay ? cachedDay.display_text : '-'}
                                </div>

                                {hasAgenda && (
                                  <span className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>

              {/* Legend explanation of colors */}
              <div className="pt-4 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-500">
                <div className="flex flex-wrap gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 bg-white border border-neutral-200 rounded"></span> Hari Biasa (Non-KBM)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 bg-emerald-50 border border-emerald-250 rounded"></span> Hari Efektif Belajar (HEB)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 bg-red-50 border border-red-200 rounded"></span> Hari Minggu (Libur Pekan)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 bg-red-100 border border-red-300 rounded"></span> Libur Nasional (LHB)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 bg-amber-100 border border-amber-300 rounded"></span> Masa Ujian Semester (SAS/SAT)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 bg-blue-100 border border-blue-300 rounded"></span> Kegiatan Sekolah (KBM)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 bg-neutral-200 bg-[linear-gradient(45deg,#cbd5e1_25%,transparent_25%,transparent_50%,#cbd5e1_50%,#cbd5e1_75%,transparent_75%,transparent)] bg-[length:6px_6px] rounded opacity-70"></span> Tanggal Mati (Kunci Matriks)
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Klik petak tanggal</span> untuk melihat rincian agenda.
                </div>
              </div>
            </div>
          </div>

          {/* Inspected Date Drawer */}
          {inspectedDate && (
            <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-2xl text-left flex justify-between items-center transition-all shadow-sm">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-600" />
                  Detail Informasi Agenda: Tanggal {(() => {
                    const parts = inspectedDate.split('-');
                    return `${parts[2]} ${monthNames[parseInt(parts[1]) - 1]} ${parts[0]}`;
                  })()}
                </h4>
                <div className="text-[11px] text-neutral-500 mt-1 font-medium">
                  {dayCache[inspectedDate] ? (
                    <div className="space-y-1">
                      <p>Kategori Hari: <span className="font-bold text-neutral-700 capitalize">{dayCache[inspectedDate].class_name.replace('_', ' ')}</span></p>
                      <p>Status Pembelajaran: <span className="font-bold text-neutral-700">{dayCache[inspectedDate].is_hari_efektif ? `Efektif Riel (Ke- ${dayCache[inspectedDate].display_text})` : 'Hari Libur / Jeda Ujian'}</span></p>
                      {dayCache[inspectedDate].event_nama && (
                        <p className="bg-white px-2.5 py-1.5 rounded-xl border border-neutral-250 inline-block font-semibold text-neutral-800 mt-1 shadow-sm">
                          Agenda: {dayCache[inspectedDate].event_nama}
                        </p>
                      )}
                    </div>
                  ) : (
                    <EmptyState
                      icon={CalendarDays}
                      title="Tidak ada agenda di tanggal ini"
                      description="Klik tanggal lain untuk melihat agendanya."
                    />
                  )}
                </div>
              </div>
              <button
                onClick={() => setInspectedDate(null)}
                className="text-[10px] text-neutral-450 hover:text-neutral-700 border border-neutral-300 px-3 py-1.5 rounded-xl hover:bg-neutral-100 transition-colors font-bold shadow-sm bg-white"
              >
                Tutup Info
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RPE BREAKDOWN TABLE */}
      {activeTab === 'rpe' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 text-blue-950 p-4 rounded-2xl text-xs space-y-1.5 leading-relaxed">
            <p><strong>Kalkulator Rincian Pekan Efektif (RPE) Otomatis:</strong> Data ini diperoleh secara otomatis berdasarkan sebaran agenda kegiatan sekolah dan libur resmi yang diinput pada kalender. Rumus perhitungan didasarkan pada jumlah hari dalam seminggu (Senin s.d. Jumat). Sebuah pekan dinyatakan <strong>Minggu Efektif</strong> jika didalamnya terdapat minimal <strong>3 hari efektif kegiatan belajar mengajar (KBM)</strong>.</p>
            <div className="flex items-center gap-3 pt-1">
              <label className="font-bold text-blue-900">Konfigurasi Jam Pelajaran (JP) / Minggu:</label>
              <input
                type="number"
                min={1}
                max={10}
                value={jpPerWeek}
                onChange={(e) => setJpPerWeek(Number(e.target.value))}
                className="w-16 px-2 py-1 border border-blue-300 rounded-lg font-mono font-bold text-center text-xs outline-none bg-white text-neutral-800"
              />
              <span className="text-neutral-500 font-semibold">JP / Minggu</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Semester Ganjil */}
            <div className="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h3 className="font-bold text-neutral-800 text-sm">Semester 1 (Ganjil)</h3>
                <span className="text-xs font-mono font-bold bg-neutral-100 px-2.5 py-1 rounded-lg text-neutral-600">
                  {ganjilTerm?.tahun_ajaran || '2026/2027'}
                </span>
              </div>

              {ganjilBreakdown.length === 0 ? (
                <p className="text-center py-8 text-neutral-400 text-xs">Belum ada data akademik Semester Ganjil</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 text-[10px] text-neutral-500 font-extrabold uppercase border-b border-neutral-200">
                        <th className="p-2">Bulan</th>
                        <th className="p-2 text-center">Minggu</th>
                        <th className="p-2 text-center text-emerald-700 bg-emerald-50">Efektif</th>
                        <th className="p-2 text-center text-red-700 bg-red-50">Tidak Efektif</th>
                        <th className="p-2">Keterangan/Agenda</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-medium">
                      {ganjilBreakdown.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-neutral-50/50">
                          <td className="p-2 font-bold text-neutral-800">{r.monthName}</td>
                          <td className="p-2 text-center font-mono">{r.totalWeeks}</td>
                          <td className="p-2 text-center font-mono font-bold text-emerald-600 bg-emerald-50/20">{r.effectiveWeeks}</td>
                          <td className="p-2 text-center font-mono text-red-500 bg-red-50/10">{r.nonEffectiveWeeks}</td>
                          <td className="p-2 text-[10px] text-neutral-500 leading-normal max-w-xs truncate" title={r.keterangan.join(', ')}>
                            {r.keterangan.join(', ') || 'Pembelajaran Efektif'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-neutral-50 font-bold border-t-2 border-neutral-200">
                        <td className="p-2">TOTAL:</td>
                        <td className="p-2 text-center font-mono">{ganjilBreakdown.reduce((sum: number, r: any) => sum + r.totalWeeks, 0)}</td>
                        <td className="p-2 text-center font-mono text-emerald-600 bg-emerald-50">{ganjilBreakdown.reduce((sum: number, r: any) => sum + r.effectiveWeeks, 0)}</td>
                        <td className="p-2 text-center font-mono text-red-500 bg-red-50">{ganjilBreakdown.reduce((sum: number, r: any) => sum + r.nonEffectiveWeeks, 0)}</td>
                        <td className="p-2 font-normal text-[10px] text-neutral-400">Pekan Terkalkulasi</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-emerald-800 block uppercase text-[10px] tracking-wide">Jam Pelajaran Efektif (Jam Tatap Muka)</span>
                    <p className="text-emerald-700 leading-normal">
                      Total Pekan Efektif: <strong>{ganjilBreakdown.reduce((sum: number, r: any) => sum + r.effectiveWeeks, 0)} Minggu</strong>.<br />
                      Maka Alokasi Waktu Efektif: <strong>{ganjilBreakdown.reduce((sum: number, r: any) => sum + r.effectiveWeeks, 0) * jpPerWeek} JP</strong> (tatap muka selama semester ganjil).
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Semester Genap */}
            <div className="bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h3 className="font-bold text-neutral-800 text-sm">Semester 2 (Genap)</h3>
                <span className="text-xs font-mono font-bold bg-neutral-100 px-2.5 py-1 rounded-lg text-neutral-600">
                  {genapTerm?.tahun_ajaran || '2026/2027'}
                </span>
              </div>

              {genapBreakdown.length === 0 ? (
                <p className="text-center py-8 text-neutral-400 text-xs">Belum ada data akademik Semester Genap</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 text-[10px] text-neutral-500 font-extrabold uppercase border-b border-neutral-200">
                        <th className="p-2">Bulan</th>
                        <th className="p-2 text-center">Minggu</th>
                        <th className="p-2 text-center text-emerald-700 bg-emerald-50">Efektif</th>
                        <th className="p-2 text-center text-red-700 bg-red-50">Tidak Efektif</th>
                        <th className="p-2">Keterangan/Agenda</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-medium">
                      {genapBreakdown.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-neutral-50/50">
                          <td className="p-2 font-bold text-neutral-800">{r.monthName}</td>
                          <td className="p-2 text-center font-mono">{r.totalWeeks}</td>
                          <td className="p-2 text-center font-mono font-bold text-emerald-600 bg-emerald-50/20">{r.effectiveWeeks}</td>
                          <td className="p-2 text-center font-mono text-red-500 bg-red-50/10">{r.nonEffectiveWeeks}</td>
                          <td className="p-2 text-[10px] text-neutral-500 leading-normal max-w-xs truncate" title={r.keterangan.join(', ')}>
                            {r.keterangan.join(', ') || 'Pembelajaran Efektif'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-neutral-50 font-bold border-t-2 border-neutral-200">
                        <td className="p-2">TOTAL:</td>
                        <td className="p-2 text-center font-mono">{genapBreakdown.reduce((sum: number, r: any) => sum + r.totalWeeks, 0)}</td>
                        <td className="p-2 text-center font-mono text-emerald-600 bg-emerald-50">{genapBreakdown.reduce((sum: number, r: any) => sum + r.effectiveWeeks, 0)}</td>
                        <td className="p-2 text-center font-mono text-red-500 bg-red-50">{genapBreakdown.reduce((sum: number, r: any) => sum + r.nonEffectiveWeeks, 0)}</td>
                        <td className="p-2 font-normal text-[10px] text-neutral-400">Pekan Terkalkulasi</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-emerald-800 block uppercase text-[10px] tracking-wide">Jam Pelajaran Efektif (Jam Tatap Muka)</span>
                    <p className="text-emerald-700 leading-normal">
                      Total Pekan Efektif: <strong>{genapBreakdown.reduce((sum: number, r: any) => sum + r.effectiveWeeks, 0)} Minggu</strong>.<br />
                      Maka Alokasi Waktu Efektif: <strong>{genapBreakdown.reduce((sum: number, r: any) => sum + r.effectiveWeeks, 0) * jpPerWeek} JP</strong> (tatap muka selama semester genap).
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TIMELINE AGENDA SEKOLAH */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Cari agenda sekolah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 outline-none text-neutral-800 bg-white"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
              {EVENT_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setFilterType(type.value)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                      filterType === type.value
                        ? `${type.color} text-white shadow-sm`
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeline list */}
          {filteredTimelineEvents.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Tidak ada agenda sekolah yang sesuai"
              description="Coba ubah filter pencarian di atas."
            />
          ) : (
            <div className="relative border-l-2 border-indigo-100 ml-4 pl-6 space-y-6">
              {filteredTimelineEvents.map((event) => {
                const style = EVENT_STYLES[event.type] || EVENT_STYLES.school_event;
                const Icon = EVENT_TYPES.find(t => t.value === event.type)?.icon || Flag;
                return (
                  <div key={event.id} className="relative">
                    {/* Circle timeline indicator */}
                    <span className={`absolute -left-10 top-1 p-1.5 rounded-full ${style.color} text-white ring-8 ring-white shadow-sm border border-neutral-200`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold tracking-wider text-neutral-450 uppercase font-mono">
                          {new Date(event.date).toLocaleDateString('id-ID', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                        <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md border ${style.bg} ${style.border} ${style.text} tracking-wider font-sans self-start sm:self-auto`}>
                          {getEventTypeLabel(event.type)}
                        </span>
                      </div>
                      <h4 className={`text-base font-bold text-neutral-800 ${style.text}`}>{event.title}</h4>
                      {event.description && (
                        <p className="text-xs text-neutral-500 mt-2 font-medium leading-relaxed">{event.description}</p>
                      )}

                      <div className="flex justify-end gap-1 mt-4 pt-3 border-t border-neutral-100">
                        <button
                          onClick={() => openModal(undefined, event)}
                          className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: INPUT & KELOLA AGENDA */}
      {activeTab === 'manage' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Input Form Card */}
          <div className="lg:col-span-5 bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-neutral-800 text-sm pb-2 border-b border-neutral-100 flex items-center gap-1.5">
                <Plus className="w-5 h-5 text-blue-600" />
                {editingEvent ? 'Ubah Agenda Akademis' : 'Formulir Agenda Akademis Baru'}
              </h3>
              <p className="text-[10px] text-neutral-500 mt-1">
                Gunakan panel ini untuk mengentri agenda kegiatan sekolah baru atau mengubah agenda terdaftar.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs font-semibold text-neutral-700">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">Tanggal Kegiatan *</label>
                <input
                  type="date"
                  {...register('date')}
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-neutral-800"
                />
                {errors.date && (
                  <p className="text-[10px] text-red-600 mt-1">{errors.date.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">Kategori Acara *</label>
                <select
                  {...register('type')}
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-neutral-800"
                >
                  <option value="school_event">🏫 Kegiatan Sekolah</option>
                  <option value="national_holiday">🦃 Libur Nasional</option>
                  <option value="exam">📝 Ujian/SAS</option>
                  <option value="break">☕ Libur/Cuti</option>
                </select>
                {errors.type && (
                  <p className="text-[10px] text-red-600 mt-1">{errors.type.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">Nama Agenda / Kegiatan *</label>
                <input
                  type="text"
                  placeholder="Contoh: Sumatif Akhir Semester (SAS)"
                  {...register('title')}
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-neutral-800"
                />
                {errors.title && (
                  <p className="text-[10px] text-red-600 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">Deskripsi Kegiatan</label>
                <textarea
                  rows={3}
                  placeholder="Keterangan tambahan atau jadwal detil (opsional)"
                  {...register('description')}
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white text-neutral-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                {editingEvent && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEvent(null);
                      reset();
                    }}
                    className="flex-1 py-2.5 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saveMutation.isPending ? 'Menyimpan...' : editingEvent ? 'Update Agenda' : 'Simpan Agenda'}
                </button>
              </div>
            </form>
          </div>

          {/* Right: Management List Card */}
          <div className="lg:col-span-7 bg-white border border-neutral-200 p-5 rounded-2xl shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-neutral-800 text-sm pb-2 border-b border-neutral-100 flex items-center justify-between">
                <span>Daftar Agenda Akademik Sekolah</span>
                <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">Total: {events.filter(e => e.is_active).length} Agenda</span>
              </h3>
            </div>

            {events.filter(e => e.is_active).length === 0 ? (
              <div className="text-center py-12 text-neutral-400">
                <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">Belum ada agenda sekolah terdaftar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-[10px] text-neutral-500 font-bold uppercase border-b border-neutral-205">
                      <th className="p-2.5">Tanggal</th>
                      <th className="p-2.5">Kategori</th>
                      <th className="p-2.5">Nama Kegiatan</th>
                      <th className="p-2.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-medium">
                    {events
                      .filter(e => e.is_active)
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((event) => {
                        const style = EVENT_STYLES[event.type] || EVENT_STYLES.school_event;
                        return (
                          <tr key={event.id} className="hover:bg-neutral-50/50">
                            <td className="p-2.5 font-mono text-[11px] whitespace-nowrap text-neutral-850">
                              {new Date(event.date).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md border ${style.bg} ${style.border} ${style.text}`}>
                                {getEventTypeLabel(event.type)}
                              </span>
                            </td>
                            <td className="p-2.5 max-w-[200px] truncate font-bold text-neutral-750" title={event.title}>
                              {event.title}
                            </td>
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingEvent(event);
                                    reset({
                                      date: event.date,
                                      type: event.type,
                                      title: event.title,
                                      description: event.description || '',
                                    });
                                  }}
                                  className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(event.id)}
                                  className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Form fallback (for quick actions) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-neutral-100">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-6 w-6" />
                  <h3 className="text-lg font-bold">
                    {editingEvent ? 'Ubah Kegiatan' : 'Tambah Kegiatan Baru'}
                  </h3>
                </div>
                <button onClick={closeModal} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 text-xs font-semibold text-neutral-700">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Tanggal Kegiatan *
                </label>
                <input
                  type="date"
                  {...register('date')}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-neutral-800"
                />
                {errors.date && (
                  <p className="text-[10px] text-red-650 mt-1">{errors.date.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Kategori *
                </label>
                <select
                  {...register('type')}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-neutral-800"
                >
                  <option value="school_event">🏫 Kegiatan Sekolah</option>
                  <option value="national_holiday">🦃 Libur Nasional</option>
                  <option value="exam">📝 Ujian/SAS</option>
                  <option value="break">☕ Libur/Cuti</option>
                </select>
                {errors.type && (
                  <p className="text-[10px] text-red-650 mt-1">{errors.type.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Nama Kegiatan / Judul *
                </label>
                <input
                  type="text"
                  {...register('title')}
                  placeholder="Contoh: Masa Pengenalan Lingkungan Sekolah"
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-neutral-800"
                />
                {errors.title && (
                  <p className="text-[10px] text-red-650 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Deskripsi
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Keterangan tambahan (opsional)"
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white text-neutral-800"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}