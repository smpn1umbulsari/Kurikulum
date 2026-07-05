/**
 * Mutation Types - SIKAD v4.0
 * Type definitions for student mutation (mutation) operations
 */

/**
 * Type of student mutation
 */
export type MutationType = 'NAIK_KELAS' | 'KELULUSAN' | 'PINDAH' | 'DROP_OUT';

/**
 * Status of a mutation process
 */
export type MutationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';

/**
 * Source of mutation initiation
 */
export type MutationSource = 'MANUAL' | 'BULK' | 'AUTOMATED' | 'IMPORT';

/**
 * Reason for student transfer/mutation
 */
export type MutationReason =
  | 'PURSUING_HIGHER_EDUCATION'
  | 'FAMILY_RELOCATON'
  | 'SCHOOL_TRANSFER'
  | 'EXPULSION'
  | 'VOLUNTARY_WITHDRAWAL'
  | 'MEDICAL_REASONS'
  | 'FINANCIAL_DIFFICULTIES'
  | 'OTHER';

/**
 * Student mutation record
 */
export interface StudentMutation {
  id: string;
  siswaId: string;
  type: MutationType;
  status: MutationStatus;
  source: MutationSource;
  reason?: MutationReason;
  notes?: string;

  // Source information
  sourceKelasId?: string;
  sourceTermId?: string;

  // Target information (for transfers)
  targetSekolah?: string;
  targetTahunAjaran?: string;

  // For graduation
  tahunLulus?: number;
  nomorIjazah?: string;

  // For class promotion
  targetKelasId?: string;
  targetTermId?: string;

  // Metadata
  initiatedBy?: string;
  initiatedAt: string;
  processedAt?: string;
  completedAt?: string;

  createdAt: string;
  updatedAt: string;
}

/**
 * Mutation job for bulk operations
 */
export interface MutationJob {
  id: string;
  type: MutationType;
  status: MutationStatus;
  sourceTermId: string;
  targetTermId?: string;
  tahunAjaran?: number;

  // Statistics
  totalStudents: number;
  processedStudents: number;
  successCount: number;
  failedCount: number;

  // Errors
  errors: MutationJobError[];

  // Job metadata
  initiatedBy: string;
  initiatedAt: string;
  completedAt?: string;
}

/**
 * Individual error within a mutation job
 */
export interface MutationJobError {
  siswaId: string;
  siswaName: string;
  error: string;
  timestamp: string;
}

/**
 * Preview result for mutation operations
 */
export interface MutationPreview {
  eligible: MutationPreviewItem[];
  ineligible: MutationPreviewItem[];
  warnings: MutationPreviewWarning[];
}

/**
 * Individual preview item
 */
export interface MutationPreviewItem {
  siswaId: string;
  siswaName: string;
  nisn: string;
  currentKelas: string;
  targetKelas?: string;
  reason?: string;
}

/**
 * Warning during preview
 */
export interface MutationPreviewWarning {
  siswaId: string;
  siswaName: string;
  warningType: 'INCOMPLETE_DATA' | 'OUTSTANDING_DUES' | 'PENDING_RECORDS' | 'AGE_CONDITION';
  message: string;
}

/**
 * Rombel Bayangan (Shadow Class) for pending promotions
 */
export interface RombelBayangan {
  id: string;
  sourceKelasId: string;
  targetTingkat: number;
  academicYearId: string;
  name: string;

  // Status
  status: 'ACTIVE' | 'PROMOTED' | 'ARCHIVED';

  // Students in this shadow class
  studentIds: string[];

  createdAt: string;
  promotedAt?: string;
}

/**
 * Criteria for class promotion
 */
export interface PromotionCriteria {
  minimumAttendance: number; // Percentage (0-100)
  minimumAverageScore: number; // Scale depends on grading system
  maxRemedialAttempts: number;
  allowAutoPromote: boolean;
  requireApproval: boolean;
}

/**
 * Default promotion criteria
 */
export const DEFAULT_PROMOTION_CRITERIA: PromotionCriteria = {
  minimumAttendance: 80,
  minimumAverageScore: 65,
  maxRemedialAttempts: 2,
  allowAutoPromote: true,
  requireApproval: false,
};

/**
 * Graduation criteria
 */
export interface GraduationCriteria {
  minimumAverageScore: number;
  minimumUtsScore?: number;
  minimumUasScore?: number;
  minimumAttendance: number;
  requireAllSubjectsPassed: boolean;
  allowRemedial: boolean;
}

/**
 * Default graduation criteria
 */
export const DEFAULT_GRADUATION_CRITERIA: GraduationCriteria = {
  minimumAverageScore: 65,
  minimumUtsScore: 60,
  minimumUasScore: 60,
  minimumAttendance: 80,
  requireAllSubjectsPassed: true,
  allowRemedial: true,
};

/**
 * Transfer request
 */
export interface TransferRequest {
  id: string;
  siswaId: string;
  destinationSchool: string;
  destinationAddress: string;
  reason: MutationReason;
  requestDate: string;
  documents: TransferDocument[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
}

/**
 * Document required for transfer
 */
export interface TransferDocument {
  type: 'SURAT_PERMOHONAN' | 'IJAZAH' | 'SKHUN' | 'AKTA_KELAHIRAN' | 'KARTU_KELUARGA' | 'LAINNYA';
  name: string;
  fileUrl?: string;
  uploadedAt?: string;
  verified: boolean;
}

/**
 * Helper to get mutation type label
 */
export function getMutationTypeLabel(type: MutationType): string {
  const labels: Record<MutationType, string> = {
    NAIK_KELAS: 'Naik Kelas',
    KELULUSAN: 'Kelulusan',
    PINDAH: 'Pindah Sekolah',
    DROP_OUT: 'Drop Out',
  };
  return labels[type];
}

/**
 * Helper to get mutation status label
 */
export function getMutationStatusLabel(status: MutationStatus): string {
  const labels: Record<MutationStatus, string> = {
    PENDING: 'Menunggu',
    IN_PROGRESS: 'Sedang Diproses',
    COMPLETED: 'Selesai',
    FAILED: 'Gagal',
    ROLLED_BACK: 'Dikembalikan',
  };
  return labels[status];
}

/**
 * Helper to get reason label
 */
export function getReasonLabel(reason: MutationReason): string {
  const labels: Record<MutationReason, string> = {
    PURSUING_HIGHER_EDUCATION: 'Melanjutkan Pendidikan Tinggi',
    FAMILY_RELOCATON: 'Pindah domisili keluarga',
    SCHOOL_TRANSFER: 'Mutasi sekolah',
    EXPULSION: 'Dikeluarkan',
    VOLUNTARY_WITHDRAWAL: 'Pengunduran diri sukarela',
    MEDICAL_REASONS: 'Alasan kesehatan',
    FINANCIAL_DIFFICULTIES: 'Kesulitan finansial',
    OTHER: 'Lainnya',
  };
  return labels[reason];
}
