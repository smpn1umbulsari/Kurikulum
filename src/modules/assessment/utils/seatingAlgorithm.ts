import type { Siswa, ExamSeat, ExamRoom } from '@/types';

export interface LevelSeatingSettings {
  enabled: boolean;
  order: 'az' | 'za';
  manualCounts: number[]; // Capacity per room for manual mode
}

export interface SeatingConfig {
  mode: 'setengah' | '20siswa' | 'manual';
  jumlahRuangUjian: number;
  levelSettings: Record<number, LevelSeatingSettings>;
}

interface StudentWithClass extends Siswa {
  kelas_name: string; // e.g. "VII A"
  tingkat: number;    // e.g. 7
}

/**
 * Helper to chunk an array
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Main seating allocation algorithm
 */
export function generateExamSeating(
  students: StudentWithClass[],
  rooms: ExamRoom[],
  config: SeatingConfig
): ExamSeat[] {
  const seats: ExamSeat[] = [];
  const levelRoomsMap: Record<number, StudentWithClass[][]> = {
    7: [],
    8: [],
    9: [],
  };

  // 1. Process each grade level (7, 8, 9)
  [7, 8, 9].forEach((level) => {
    const levelSettings = config.levelSettings[level];
    if (!levelSettings || !levelSettings.enabled) return;

    // Filter students for this level
    const levelStudents = students.filter((s) => s.tingkat === level);

    // Sort classes
    const classOrderMultiplier = levelSettings.order === 'za' ? -1 : 1;
    const sortedStudents = [...levelStudents].sort((a, b) => {
      // Sort by class name
      const classComp = a.kelas_name.localeCompare(b.kelas_name) * classOrderMultiplier;
      if (classComp !== 0) return classComp;
      // Sort by student name within the class
      return a.nama.localeCompare(b.nama);
    });

    let chunks: StudentWithClass[][] = [];

    if (config.mode === '20siswa') {
      // Chunk directly into groups of 20
      chunks = chunkArray(sortedStudents, 20);
    } else if (config.mode === 'manual') {
      // Slice manually based on counts
      let cursor = 0;
      levelSettings.manualCounts
        .slice(0, config.jumlahRuangUjian)
        .map((cnt) => Math.min(Math.max(cnt || 0, 0), 40))
        .filter((cnt) => cnt > 0)
        .forEach((cnt) => {
          const slice = sortedStudents.slice(cursor, cursor + cnt);
          cursor += cnt;
          if (slice.length > 0) {
            chunks.push(slice);
          }
        });
    } else {
      // DEFAULT: "setengah" (split each class in half)
      // Group by class first
      const classGroups: Record<string, StudentWithClass[]> = {};
      sortedStudents.forEach((s) => {
        if (!classGroups[s.kelas_name]) {
          classGroups[s.kelas_name] = [];
        }
        classGroups[s.kelas_name].push(s);
      });

      // Sort classes keys
      const sortedClassNames = Object.keys(classGroups).sort((a, b) => 
        a.localeCompare(b) * classOrderMultiplier
      );

      // For each class, split in half and add as chunks
      sortedClassNames.forEach((className) => {
        const classStudents = classGroups[className].sort((a, b) => a.nama.localeCompare(b.nama));
        const halfSize = Math.max(1, Math.ceil(classStudents.length / 2));
        const classChunks = chunkArray(classStudents, halfSize);
        chunks.push(...classChunks);
      });
    }

    levelRoomsMap[level] = chunks;
  });

  // 2. Distribute chunks to physical rooms and interleave them (alternating seats)
  // Group assignments by room index (0 to jumlahRuangUjian - 1)
  const roomAssignments: StudentWithClass[][] = Array.from(
    { length: rooms.length },
    () => []
  );

  [7, 8, 9].forEach((level) => {
    const chunks = levelRoomsMap[level];
    chunks.forEach((chunk, index) => {
      const roomIndex = index % rooms.length;
      roomAssignments[roomIndex].push(...chunk);
    });
  });

  // 3. For each room, arrange students in alternating seating layout
  rooms.forEach((room, roomIdx) => {
    const roomStudents = roomAssignments[roomIdx];
    if (roomStudents.length === 0) return;

    // Group by level in this room to interleave them
    const studentsByLevel: Record<number, StudentWithClass[]> = {
      7: roomStudents.filter((s) => s.tingkat === 7),
      8: roomStudents.filter((s) => s.tingkat === 8),
      9: roomStudents.filter((s) => s.tingkat === 9),
    };

    // Interleave students from different levels
    const interleaved: StudentWithClass[] = [];
    const maxLen = Math.max(
      studentsByLevel[7].length,
      studentsByLevel[8].length,
      studentsByLevel[9].length
    );

    for (let i = 0; i < maxLen; i++) {
      if (studentsByLevel[7][i]) interleaved.push(studentsByLevel[7][i]);
      if (studentsByLevel[8][i]) interleaved.push(studentsByLevel[8][i]);
      if (studentsByLevel[9][i]) interleaved.push(studentsByLevel[9][i]);
    }

    // Limit to room capacity
    const finalizedStudents = interleaved.slice(0, room.kapasitas);

    // Generate seats
    finalizedStudents.forEach((student, seatIdx) => {
      seats.push({
        id: crypto.randomUUID(),
        room_id: room.id,
        siswa_id: student.id,
        nomor_kursi: seatIdx + 1,
        created_at: new Date().toISOString(),
      });
    });
  });

  return seats;
}
