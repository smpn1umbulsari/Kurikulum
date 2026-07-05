/**
 * SupervisorSchedulePage - SIKAD v4.0
 * Schedule exam supervisors with conflict detection
 */

import { useState, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, X, Users, AlertTriangle,
  Clock, User
} from 'lucide-react';
import { toast } from '../../../store/toastStore';
import { useExamSupervisors, useSaveExamSupervisor, useDeleteExamSupervisor } from '../hooks/useExamSupervisor';
import { useGurus } from '../../guru/hooks/useGuru';
import { useExamRooms } from '../hooks/useExamRoom';
import type { ExamSupervisor } from '@/types';

const SLOT_OPTIONS = [
  { value: 'SESI1_PAGI', label: 'Sesi 1 (07:00 - 09:00)' },
  { value: 'SESI2_PAGI', label: 'Sesi 2 (09:30 - 11:30)' },
  { value: 'SESI1_SIANG', label: 'Sesi 3 (12:30 - 14:30)' },
  { value: 'SESI2_SIANG', label: 'Sesi 4 (15:00 - 17:00)' },
];

export default function SupervisorSchedulePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<ExamSupervisor | null>(null);
  const [selectedGuruId, setSelectedGuruId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [filterSlot, setFilterSlot] = useState('');

  // Queries
  const { data: supervisors = [] } = useExamSupervisors();
  const { data: gurus = [] } = useGurus();
  const { data: rooms = [] } = useExamRooms();

  // Mutations
  const saveMutation = useSaveExamSupervisor();
  const deleteMutation = useDeleteExamSupervisor();

  // Get guru name by ID
  const getGuruName = (guruId: string) => {
    const guru = gurus.find(g => g.id === guruId);
    return guru?.nama || 'Unknown';
  };

  // Get room name by ID
  const getRoomName = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    return room?.nama_ruang || 'Unknown';
  };

  // Filter supervisors
  const filteredSupervisors = useMemo(() => {
    let result = [...supervisors];
    if (filterSlot) {
      result = result.filter(s => s.slot_waktu === filterSlot);
    }
    return result;
  }, [supervisors, filterSlot]);

  // Group by slot
  const groupedBySlot = useMemo(() => {
    const groups: Record<string, ExamSupervisor[]> = {};
    filteredSupervisors.forEach(s => {
      if (!groups[s.slot_waktu]) {
        groups[s.slot_waktu] = [];
      }
      groups[s.slot_waktu].push(s);
    });
    return groups;
  }, [filteredSupervisors]);

  // Check conflicts (same guru, same slot)
  const conflicts = useMemo(() => {
    const conflictMap = new Map<string, string[]>();
    const guruSlotMap = new Map<string, string>();

    supervisors.forEach(s => {
      const key = `${s.guru_id}_${s.slot_waktu}`;
      const existing = guruSlotMap.get(key);
      if (existing) {
        // Conflict found
        if (!conflictMap.has(s.guru_id)) {
          conflictMap.set(s.guru_id, [existing, s.id]);
        } else {
          conflictMap.get(s.guru_id)!.push(s.id);
        }
      } else {
        guruSlotMap.set(key, s.id);
      }
    });

    return conflictMap;
  }, [supervisors]);

  // KPI
  const totalSupervisors = supervisors.length;
  const uniqueGurus = new Set(supervisors.map(s => s.guru_id)).size;
  const conflictCount = conflicts.size;

  // Handlers
  const openModal = (supervisor?: ExamSupervisor) => {
    if (supervisor) {
      setEditingSupervisor(supervisor);
      setSelectedGuruId(supervisor.guru_id);
      setSelectedRoomId(supervisor.room_id || '');
      setSelectedSlot(supervisor.slot_waktu);
    } else {
      setEditingSupervisor(null);
      setSelectedGuruId('');
      setSelectedRoomId('');
      setSelectedSlot('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSupervisor(null);
    setSelectedGuruId('');
    setSelectedRoomId('');
    setSelectedSlot('');
  };

  const handleSave = () => {
    if (!selectedGuruId || !selectedSlot) {
      toast.error('Guru dan slot waktu wajib dipilih!');
      return;
    }

    const supervisor: ExamSupervisor = {
      id: editingSupervisor?.id || crypto.randomUUID(),
      guru_id: selectedGuruId,
      room_id: selectedRoomId || undefined,
      exam_id: editingSupervisor?.exam_id || '',
      slot_waktu: selectedSlot,
      shift: getShiftFromSlot(selectedSlot),
      is_active: true,
      created_at: editingSupervisor?.created_at || new Date().toISOString(),
    };

    saveMutation.mutate(supervisor, {
      onSuccess: () => closeModal(),
      onError: (error) => toast.error(`Gagal: ${error}`),
    });
  };

  const handleDelete = (id: string) => {
    toast.confirm('Hapus penugasan pengawas ini?', () => {
      deleteMutation.mutate(id);
    });
  };

  const getShiftFromSlot = (slot: string): 'SESI1' | 'SESI2' | 'SESI3' | 'SESI4' => {
    if (slot.includes('SESI1_PAGI')) return 'SESI1';
    if (slot.includes('SESI2_PAGI')) return 'SESI2';
    if (slot.includes('SESI1_SIANG')) return 'SESI3';
    return 'SESI4';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            Asesmen
          </span>
          <h2 className="text-2xl font-bold text-neutral-900">Jadwal Pengawas Ujian</h2>
          <p className="text-sm text-neutral-500 mt-1">Atur jadwal pengawas ujian dan deteksi bentrok.</p>
        </div>

        {/* KPI */}
        <div className="flex gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-3">
            <Users className="h-6 w-6 text-blue-500" />
            <div>
              <p className="text-xs text-neutral-500">Total Penugasan</p>
              <p className="text-lg font-bold text-neutral-900">{totalSupervisors}</p>
            </div>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-3">
            <User className="h-6 w-6 text-emerald-500" />
            <div>
              <p className="text-xs text-neutral-500">Guru Terpakai</p>
              <p className="text-lg font-bold text-neutral-900">{uniqueGurus}</p>
            </div>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <div>
              <p className="text-xs text-neutral-500">Bentrok</p>
              <p className="text-lg font-bold text-amber-600">{conflictCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Tambah Pengawas
          </button>

          <select
            value={filterSlot}
            onChange={(e) => setFilterSlot(e.target.value)}
            className="px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Slot</option>
            {SLOT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showConflictsOnly}
              onChange={(e) => setShowConflictsOnly(e.target.checked)}
              className="h-4 w-4 text-amber-600"
            />
            <span className="text-sm text-neutral-700">Tampilkan bentrok saja</span>
          </label>
        </div>
      </div>

      {/* Schedule by Slot */}
      <div className="space-y-4">
        {SLOT_OPTIONS.map(slot => {
          const slotSupervisors = groupedBySlot[slot.value] || [];
          if (showConflictsOnly && slotSupervisors.length === 0) return null;

          return (
            <div key={slot.value} className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-neutral-600" />
                  <h3 className="font-bold text-neutral-800">{slot.label}</h3>
                </div>
                <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                  {slotSupervisors.length} pengawas
                </span>
              </div>

              {slotSupervisors.length === 0 ? (
                <div className="px-4 py-8 text-center text-neutral-400">
                  Belum ada pengawas terjadwal
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {slotSupervisors.map(supervisor => {
                    const isConflict = conflicts.has(supervisor.guru_id);
                    return (
                      <div
                        key={supervisor.id}
                        className={`px-4 py-3 flex items-center justify-between hover:bg-neutral-50 ${
                          isConflict ? 'bg-amber-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                           {isConflict && (
                            <span title="Bentrok jadwal!">
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                            </span>
                          )}
                          <div>
                            <p className="font-semibold text-neutral-900">{getGuruName(supervisor.guru_id)}</p>
                            {supervisor.room_id && (
                              <p className="text-xs text-neutral-500">
                                Ruang: {getRoomName(supervisor.room_id)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openModal(supervisor)}
                            className="p-2 text-neutral-500 hover:bg-blue-100 hover:text-blue-600 rounded-lg"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(supervisor.id)}
                            className="p-2 text-neutral-500 hover:bg-red-100 hover:text-red-600 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-200 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-neutral-900">
                  {editingSupervisor ? 'Ubah Pengawas' : 'Tambah Pengawas'}
                </h3>
                <button onClick={closeModal} className="p-2 text-neutral-400 hover:text-neutral-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-600 mb-1">
                  Guru Pengawas *
                </label>
                <select
                  value={selectedGuruId}
                  onChange={(e) => setSelectedGuruId(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih Guru</option>
                  {gurus.filter(g => g.status_aktif).map(guru => (
                    <option key={guru.id} value={guru.id}>
                      {guru.nama} {guru.nip && `(${guru.nip})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-neutral-600 mb-1">
                  Slot Waktu *
                </label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih Slot</option>
                  {SLOT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-neutral-600 mb-1">
                  Ruang (Opsional)
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tidak指定</option>
                  {rooms.filter(r => r.is_active).map(room => (
                    <option key={room.id} value={room.id}>{room.nama_ruang}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}