/**
 * RoomManagementPage - SIKAD v4.0
 * Manage exam rooms with capacity and visual seat layout
 */

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Edit2, Trash2, X, Users, DoorOpen, MapPin,
  Grid3x3
} from 'lucide-react';
import { useExamRooms, useSaveExamRoom, useDeleteExamRoom } from '../hooks/useExamRoom';
import { LoadingState } from '../../../components/ui/LoadingState';
import { EmptyState } from '../../../components/ui/EmptyState';
import { toast } from '../../../store/toastStore';
import type { ExamRoom } from '@/types';

// Validation schema
const roomFormSchema = z.object({
  nama_ruang: z.string().min(1, 'Nama ruang wajib diisi').max(100),
  lokasi: z.string().optional(),
  kapasitas: z.preprocess((val) => Number(val), z.number().min(1, 'Kapasitas minimal 1').max(100)),
  rows: z.preprocess((val) => Number(val), z.number().min(1, 'Baris minimal 1').max(20)),
  seats_per_row: z.preprocess((val) => Number(val), z.number().min(1, 'Kursi per baris minimal 1').max(10)),
});

type RoomFormValues = z.infer<typeof roomFormSchema>;

export default function RoomManagementPage() {
  // State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<ExamRoom | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<ExamRoom | null>(null);

  // Queries & Mutations
  const { data: rooms = [], isLoading } = useExamRooms();
  const saveMutation = useSaveExamRoom();
  const deleteMutation = useDeleteExamRoom();

  // Form
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      nama_ruang: '',
      lokasi: '',
      kapasitas: 36,
      rows: 6,
      seats_per_row: 6,
    },
  });

  const watchedRows = watch('rows');
  const watchedSeatsPerRow = watch('seats_per_row');

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    if (!searchTerm) return rooms;
    const term = searchTerm.toLowerCase();
    return rooms.filter(r =>
      r.nama_ruang.toLowerCase().includes(term) ||
      r.lokasi?.toLowerCase().includes(term)
    );
  }, [rooms, searchTerm]);

  // KPI
  const totalRooms = rooms.length;
  const totalCapacity = rooms.reduce((sum, r) => sum + r.kapasitas, 0);
  // Handlers
  const openModal = (room?: ExamRoom) => {
    if (room) {
      setEditingRoom(room);
      reset({
        nama_ruang: room.nama_ruang,
        lokasi: room.lokasi || '',
        kapasitas: room.kapasitas,
        rows: room.rows || 6,
        seats_per_row: room.seats_per_row || 6,
      });
    } else {
      setEditingRoom(null);
      reset({
        nama_ruang: '',
        lokasi: '',
        kapasitas: 36,
        rows: 6,
        seats_per_row: 6,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
    reset();
  };

  const onSubmit = (data: RoomFormValues) => {
    const room: ExamRoom = {
      id: editingRoom?.id || crypto.randomUUID(),
      nama_ruang: data.nama_ruang,
      lokasi: data.lokasi,
      kapasitas: data.kapasitas,
      rows: data.rows,
      seats_per_row: data.seats_per_row,
      is_active: editingRoom?.is_active ?? true,
      created_at: editingRoom?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveMutation.mutate(room, {
      onSuccess: () => {
        closeModal();
      },
      onError: (error) => {
        toast.error(`Gagal menyimpan: ${error}`);
      },
    });
  };

  const handleDelete = (room: ExamRoom) => {
    toast.confirm(`Hapus ruang "${room.nama_ruang}"?`, () => {
      deleteMutation.mutate(room.id);
    });
  };

  // Generate seat layout
  const generateSeatLayout = (rows: number, seatsPerRow: number) => {
    const layout: { row: number; seat: number; label: string }[] = [];
    for (let r = 1; r <= rows; r++) {
      for (let s = 1; s <= seatsPerRow; s++) {
        layout.push({ row: r, seat: s, label: `${String.fromCharCode(64 + r)}${s}` });
      }
    }
    return layout;
  };

  const seatLayout = generateSeatLayout(watchedRows || 6, watchedSeatsPerRow || 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            Asesmen
          </span>
          <h2 className="text-2xl font-bold text-neutral-900">Pengaturan Ruang Ujian</h2>
          <p className="text-sm text-neutral-500 mt-1">Kelola ruangan ujian dan layout tempat duduk.</p>
        </div>

        {/* KPI */}
        <div className="flex gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-3">
            <DoorOpen className="h-6 w-6 text-blue-500" />
            <div>
              <p className="text-xs text-neutral-500">Total Ruangan</p>
              <p className="text-lg font-bold text-neutral-900">{totalRooms}</p>
            </div>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-3">
            <Users className="h-6 w-6 text-emerald-500" />
            <div>
              <p className="text-xs text-neutral-500">Total Kapasitas</p>
              <p className="text-lg font-bold text-neutral-900">{totalCapacity}</p>
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
            Tambah Ruang
          </button>

          <div className="flex-1 min-w-[250px]">
            <input
              type="text"
              placeholder="Cari ruang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Room Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full"><LoadingState message="Memuat data ruangan..." /></div>
        ) : filteredRooms.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={DoorOpen}
              title="Tidak ada ruangan ditemukan"
              description="Tambahkan ruangan ujian baru dengan tombol di atas."
              action={{
                label: 'Tambah Ruangan',
                onClick: openModal,
              }}
            />
          </div>
        ) : (
          filteredRooms.map((room) => (
            <div
              key={room.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${
                selectedRoom?.id === room.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-neutral-200'
              }`}
              onClick={() => setSelectedRoom(room)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-neutral-900">{room.nama_ruang}</h3>
                    {room.lokasi && (
                      <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {room.lokasi}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    room.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {room.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-neutral-600">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {room.kapasitas} kursi
                  </span>
                  <span className="flex items-center gap-1">
                    <Grid3x3 className="h-4 w-4" />
                    {room.rows || 6} x {room.seats_per_row || 6}
                  </span>
                </div>
              </div>

              <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); openModal(room); }}
                  className="p-2 text-neutral-500 hover:bg-blue-100 hover:text-blue-600 rounded-lg"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(room); }}
                  className="p-2 text-neutral-500 hover:bg-red-100 hover:text-red-600 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Selected Room Seat Layout Preview */}
      {selectedRoom && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
          <h3 className="font-bold text-neutral-900 mb-4">
            Layout: {selectedRoom.nama_ruang}
          </h3>
          <div className="flex justify-center">
            <div className="inline-block bg-neutral-100 rounded-2xl p-4">
              {/* Front of room */}
              <div className="text-center text-xs text-neutral-500 mb-4 pb-2 border-b border-neutral-300">
                PAPAN TULIS / DEPAN RUANGAN
              </div>

              {/* Seat grid */}
              <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${(selectedRoom as any).seats_per_row || 6}, 1fr)` }}>
                {Array.from({ length: (selectedRoom as any).rows || 6 }, (_, rowIdx) => (
                  <div key={rowIdx} className="flex gap-2">
                    {Array.from({ length: (selectedRoom as any).seats_per_row || 6 }, (_, seatIdx) => {
                      const label = `${String.fromCharCode(65 + rowIdx)}${seatIdx + 1}`;
                      return (
                        <div
                          key={seatIdx}
                          className="w-10 h-10 bg-white border border-neutral-300 rounded flex items-center justify-center text-xs font-semibold text-neutral-600 shadow-sm"
                        >
                          {label}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-200 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-neutral-900">
                  {editingRoom ? 'Ubah Ruang' : 'Tambah Ruang Baru'}
                </h3>
                <button onClick={closeModal} className="p-2 text-neutral-400 hover:text-neutral-600 rounded-xl">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-600 mb-1">
                    Nama Ruang *
                  </label>
                  <input
                    type="text"
                    {...register('nama_ruang')}
                    placeholder="Contoh: Ruang 101"
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.nama_ruang && (
                    <p className="text-xs text-red-600 mt-1">{errors.nama_ruang.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-600 mb-1">
                    Lokasi
                  </label>
                  <input
                    type="text"
                    {...register('lokasi')}
                    placeholder="Contoh: Lantai 1 Gedung A"
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-600 mb-1">
                      Kapasitas *
                    </label>
                    <input
                      type="number"
                      {...register('kapasitas')}
                      min="1"
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.kapasitas && (
                      <p className="text-xs text-red-600 mt-1">{errors.kapasitas.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-600 mb-1">
                      Baris
                    </label>
                    <input
                      type="number"
                      {...register('rows')}
                      min="1"
                      max="20"
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-neutral-600 mb-1">
                      Kursi/Baris
                    </label>
                    <input
                      type="number"
                      {...register('seats_per_row')}
                      min="1"
                      max="10"
                      className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Preview Layout */}
                <div className="mt-4 p-4 bg-neutral-50 rounded-xl">
                  <p className="text-xs font-semibold text-neutral-600 mb-2">Preview Layout:</p>
                  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${watchedSeatsPerRow || 6}, 1fr)` }}>
                    {seatLayout.slice(0, watchedRows * watchedSeatsPerRow).map((seat) => (
                      <div
                        key={seat.label}
                        className="aspect-square bg-white border border-neutral-300 rounded flex items-center justify-center text-xs font-medium text-neutral-500"
                      >
                        {seat.label}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-500 mt-2 text-center">
                    Total: {seatLayout.length} kursi
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 border border-neutral-300 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
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