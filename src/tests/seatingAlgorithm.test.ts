import assert from 'assert';
import { generateExamSeating, SeatingConfig } from '../modules/assessment/utils/seatingAlgorithm';
import type { Siswa, ExamRoom } from '../types';

interface StudentWithClass extends Siswa {
  kelas_name: string;
  tingkat: number;
}

function runTests() {
  console.log("=========================================");
  console.log("RUNNING SEATING ALGORITHMS TESTS");
  console.log("=========================================");

  // Mock Students
  const students: StudentWithClass[] = [];
  
  // VII A (16 students)
  for (let i = 1; i <= 16; i++) {
    students.push({
      id: `siswa-7a-${i}`,
      nama: `Siswa Tujuh A ${i}`,
      status_aktif: true,
      kelas_name: 'VII A',
      tingkat: 7,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // VIII A (16 students)
  for (let i = 1; i <= 16; i++) {
    students.push({
      id: `siswa-8a-${i}`,
      nama: `Siswa Delapan A ${i}`,
      status_aktif: true,
      kelas_name: 'VIII A',
      tingkat: 8,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // Mock Rooms
  const rooms: ExamRoom[] = [
    { id: 'room-1', academic_term_id: 'term-1', nama_ruang: 'Ruang 1', kapasitas: 40, is_active: true, created_at: new Date().toISOString() },
    { id: 'room-2', academic_term_id: 'term-1', nama_ruang: 'Ruang 2', kapasitas: 40, is_active: true, created_at: new Date().toISOString() },
  ];

  // Config: "setengah" mode (split classes in half)
  const config: SeatingConfig = {
    mode: 'setengah',
    jumlahRuangUjian: 2,
    levelSettings: {
      7: { enabled: true, order: 'az', manualCounts: [] },
      8: { enabled: true, order: 'az', manualCounts: [] },
      9: { enabled: false, order: 'az', manualCounts: [] }, // Disabled/empty
    }
  };

  console.log("Running Seating Generation in 'setengah' mode...");
  const seats = generateExamSeating(students, rooms, config);

  // Assertion 1: Total assigned seats should not exceed total capacity of rooms (40 seats)
  // Total students: 32. All should fit.
  assert.strictEqual(seats.length, 32, "Total seats assigned should be 32");

  // Assertion 2: Alternating seats verification
  // Level 7 and Level 8 should alternate since they are interleaved.
  // Let's filter seats for Room 1
  const room1Seats = seats.filter((s) => s.room_id === 'room-1').sort((a, b) => a.nomor_kursi - b.nomor_kursi);
  
  console.log("Verifying interleaved seating for Room 1...");
  for (let i = 0; i < room1Seats.length - 1; i++) {
    const currentStudent = students.find((s) => s.id === room1Seats[i].siswa_id);
    const nextStudent = students.find((s) => s.id === room1Seats[i + 1].siswa_id);
    
    if (currentStudent && nextStudent) {
      // Adjacent seats should alternate grade levels if both grade levels are present in the room
      assert.notStrictEqual(currentStudent.tingkat, nextStudent.tingkat, `Seats ${i+1} and ${i+2} should have different grades`);
    }
  }

  // Assertion 3: Mode "20siswa"
  const config20: SeatingConfig = {
    mode: '20siswa',
    jumlahRuangUjian: 2,
    levelSettings: {
      7: { enabled: true, order: 'az', manualCounts: [] },
      8: { enabled: true, order: 'az', manualCounts: [] },
      9: { enabled: false, order: 'az', manualCounts: [] }
    }
  };

  console.log("Running Seating Generation in '20siswa' mode...");
  const seats20 = generateExamSeating(students, rooms, config20);
  assert.strictEqual(seats20.length, 32, "Total seats assigned in 20siswa mode should be 32");

  console.log("✔ Seating Algorithm Tests passed successfully!");
}

try {
  runTests();
} catch (error) {
  console.error("Test failed:", error);
  process.exit(1);
}
