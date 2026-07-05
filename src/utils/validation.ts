// Validation utilities for SIKAD v4.0

// UUID regex pattern
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Date format: YYYY-MM-DD
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// NIP format: 18 digits
export const NIP_REGEX = /^\d{18}$/;

// NISN format: 4-10 digits
export const NISN_REGEX = /^\d{4,10}$/;

// NIPD format: 4-10 digits
export const NIPD_REGEX = /^\d{4,10}$/;

// Email validation
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone format: +62 or 08xx
export const PHONE_REGEX = /^(\+62|62|0)[0-9]{9,12}$/;

// Valid enum values (aligned with PRD Revision 4)
export const ENUMS = {
  jk: ['L', 'P'],
  status: ['AKTIF', 'NON_AKTIF'],
  semester: ['GANJIL', 'GENAP'],
  jenis_kelas: ['REAL', 'DAPO'], // PRD Revision 4: REAL=Kelas Riil, DAPO=Kelas Administrasi Dapodik
  tingkat: [7, 8, 9], // SMP: 7, 8, 9
  kelompok_mapel: ['A', 'B'],
  attendance_status: ['HADIR', 'SAKIT', 'IZIN', 'ALPHA'],
  assessment_stage: ['DRAFT', 'PUBLISHED', 'ARCHIVED']
};

// Validation error class
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Validate UUID
export function validateUUID(value: any, fieldName: string = 'id'): string {
  if (!value) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
    throw new ValidationError(`${fieldName} must be a valid UUID`, fieldName);
  }
  return value;
}

// Validate date
export function validateDate(value: any, fieldName: string = 'date'): string {
  if (!value) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  if (typeof value !== 'string' || !DATE_REGEX.test(value)) {
    throw new ValidationError(`${fieldName} must be in YYYY-MM-DD format`, fieldName);
  }
  return value;
}

// Validate NIP
export function validateNIP(value: any): string {
  if (!value) {
    throw new ValidationError('NIP is required', 'nip');
  }
  if (typeof value !== 'string' || !NIP_REGEX.test(value)) {
    throw new ValidationError('NIP must be 18 digits', 'nip');
  }
  return value;
}

// Validate NISN
export function validateNISN(value: any): string {
  if (!value) {
    throw new ValidationError('NISN is required', 'nisn');
  }
  if (typeof value !== 'string' || !NISN_REGEX.test(value)) {
    throw new ValidationError('NISN must be 4-10 digits', 'nisn');
  }
  return value;
}

// Validate NIPD
export function validateNIPD(value: any): string {
  if (!value) {
    throw new ValidationError('NIPD is required', 'nipd');
  }
  if (typeof value !== 'string' || !NIPD_REGEX.test(value)) {
    throw new ValidationError('NIPD must be 4-10 digits', 'nipd');
  }
  return value;
}

// Validate email
export function validateEmail(value: any): string {
  if (value && typeof value !== 'string') {
    throw new ValidationError('Email must be a string', 'email');
  }
  if (value && !EMAIL_REGEX.test(value)) {
    throw new ValidationError('Invalid email format', 'email');
  }
  return value;
}

// Validate phone
export function validatePhone(value: any): string {
  if (value && typeof value !== 'string') {
    throw new ValidationError('Phone must be a string', 'phone');
  }
  if (value && !PHONE_REGEX.test(value.replace(/\s/g, ''))) {
    throw new ValidationError('Invalid phone format', 'phone');
  }
  return value;
}

// Validate enum
export function validateEnum(value: any, allowedValues: string[], fieldName: string): string {
  if (!value) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      fieldName
    );
  }
  return value;
}

// Validate string
export function validateString(value: any, fieldName: string, options?: {
  minLength?: number;
  maxLength?: number;
  required?: boolean;
}): string {
  if (!value && options?.required) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  if (value && typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName);
  }
  if (value) {
    if (options?.minLength && value.length < options.minLength) {
      throw new ValidationError(
        `${fieldName} must be at least ${options.minLength} characters`,
        fieldName
      );
    }
    if (options?.maxLength && value.length > options.maxLength) {
      throw new ValidationError(
        `${fieldName} must be at most ${options.maxLength} characters`,
        fieldName
      );
    }
  }
  return value;
}

// Validate number
export function validateNumber(value: any, fieldName: string, options?: {
  min?: number;
  max?: number;
  required?: boolean;
  integer?: boolean;
}): number {
  if (value === undefined || value === null) {
    if (options?.required) {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }
    return value;
  }
  
  const num = typeof value === 'number' ? value : parseFloat(value);
  
  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a number`, fieldName);
  }
  if (options?.integer && !Number.isInteger(num)) {
    throw new ValidationError(`${fieldName} must be an integer`, fieldName);
  }
  if (options?.min !== undefined && num < options.min) {
    throw new ValidationError(`${fieldName} must be at least ${options.min}`, fieldName);
  }
  if (options?.max !== undefined && num > options.max) {
    throw new ValidationError(`${fieldName} must be at most ${options.max}`, fieldName);
  }
  return num;
}

// Validate date range
export function validateDateRange(startDate: string, endDate: string): void {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (end <= start) {
    throw new ValidationError('End date must be after start date', 'tanggal_selesai');
  }
}

// Validate object
export function validateObject(value: any, schema: Record<string, Function>): Record<string, any> {
  const result: Record<string, any> = {};
  const errors: string[] = [];
  
  for (const [field, validator] of Object.entries(schema)) {
    try {
      result[field] = validator(value?.[field]);
    } catch (e) {
      if (e instanceof ValidationError) {
        errors.push(e.message);
      } else {
        throw e;
      }
    }
  }
  
  if (errors.length > 0) {
    throw new ValidationError(errors.join('; '));
  }
  
  return result;
}

// Sanitize input - remove potentially dangerous characters
export function sanitizeString(value: string): string {
  if (!value) return value;
  return value
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
}

// Validate guru input
export function validateGuruInput(body: any) {
  return validateObject(body, {
    nip: validateNIP,
    nama: (v: any) => validateString(v, 'nama', { required: true, minLength: 2, maxLength: 100 }),
    jk: (v: any) => validateEnum(v, ENUMS.jk, 'jk'),
    tempat_lahir: (v: any) => validateString(v, 'tempat_lahir', { maxLength: 50 }),
    tanggal_lahir: validateDate,
    email: validateEmail,
    phone: validatePhone,
    status: (v: any) => validateEnum(v, ENUMS.status, 'status')
  });
}

// Validate siswa input
export function validateSiswaInput(body: any) {
  return validateObject(body, {
    nisn: validateNISN,
    nipd: validateNIPD,
    nama: (v: any) => validateString(v, 'nama', { required: true, minLength: 2, maxLength: 100 }),
    jk: (v: any) => validateEnum(v, ENUMS.jk, 'jk'),
    tempat_lahir: (v: any) => validateString(v, 'tempat_lahir', { maxLength: 50 }),
    tanggal_lahir: validateDate,
    status: (v: any) => validateEnum(v, ENUMS.status, 'status')
  });
}

// Validate mapel input
export function validateMapelInput(body: any) {
  return validateObject(body, {
    kode: (v: any) => validateString(v, 'kode', { required: true, minLength: 2, maxLength: 20 }),
    nama: (v: any) => validateString(v, 'nama', { required: true, minLength: 2, maxLength: 100 }),
    kelompok: (v: any) => validateEnum(v, ENUMS.kelompok_mapel, 'kelompok')
  });
}

// Validate academic term input
export function validateAcademicTermInput(body: any) {
  const result = validateObject(body, {
    tahun_ajaran: (v: any) => validateString(v, 'tahun_ajaran', { required: true, minLength: 9, maxLength: 9 }),
    semester: (v: any) => validateEnum(v, ENUMS.semester, 'semester'),
    tanggal_mulai: validateDate,
    tanggal_selesai: validateDate,
    status: (v: any) => validateEnum(v, ENUMS.status, 'status')
  });
  
  if (result.tanggal_mulai && result.tanggal_selesai) {
    validateDateRange(result.tanggal_mulai, result.tanggal_selesai);
  }
  
  return result;
}

// Validate kelas input
export function validateKelasInput(body: any) {
  return validateObject(body, {
    nama_kelas: (v: any) => validateString(v, 'nama_kelas', { required: true, minLength: 3, maxLength: 20 }),
    tingkat: (v: any) => validateEnum(v, ENUMS.tingkat.map(String), 'tingkat'),
    jenis: (v: any) => validateEnum(v, ENUMS.jenis_kelas, 'jenis'),
    academic_term_id: validateUUID
  });
}

// Validate attendance input
export function validateAttendanceInput(body: any) {
  return validateObject(body, {
    academic_term_id: validateUUID,
    pembagian_mengajar_id: validateUUID,
    siswa_id: validateUUID,
    tanggal: validateDate,
    status: (v: any) => validateEnum(v, ENUMS.attendance_status, 'status'),
    keterangan: (v: any) => validateString(v, 'keterangan', { maxLength: 255 })
  });
}

// Validate assessment input
export function validateAssessmentInput(body: any) {
  return validateObject(body, {
    assessment_type_id: validateUUID,
    pembagian_mengajar_id: validateUUID,
    academic_term_id: validateUUID,
    judul: (v: any) => validateString(v, 'judul', { required: true, minLength: 2, maxLength: 200 }),
    deskripsi: (v: any) => validateString(v, 'deskripsi', { maxLength: 500 }),
    tanggal: validateDate,
    bobot: (v: any) => validateNumber(v, 'bobot', { min: 0, max: 100 })
  });
}

// Validate rapor catatan input
export function validateCatatanInput(body: any) {
  return validateObject(body, {
    term_id: validateUUID,
    siswa_id: validateUUID,
    kelas_id: validateUUID,
    catatan: (v: any) => validateString(v, 'catatan', { maxLength: 1000 })
  });
}
