/**
 * Service Index - SIKAD v4.0
 * Export all service classes
 */

export * from './baseService';
export * from './guruService';
export * from './siswaService';
export * from './assessmentService';

// Re-export types
export type { CreateGuruPayload, UpdateGuruPayload } from './guruService';
export type { CreateSiswaPayload, UpdateSiswaPayload } from './siswaService';
export type { CreateAssessmentPayload, UpdateAssessmentPayload, UpdateScorePayload } from './assessmentService';
