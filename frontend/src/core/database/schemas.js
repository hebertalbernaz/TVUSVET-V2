/**
 * TVUSVET V2.0 - RxDB Schemas (Corrigido V3 Strict)
 */

// --- SETTINGS ---
export const SettingsSchema = {
  title: 'settings schema',
  version: 2,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    clinic_name: { type: 'string' },
    veterinarian_name: { type: 'string' },
    crmv: { type: 'string' },
    active_profile_id: { type: 'string' },
    active_profile_name: { type: 'string' },
    clinic_address: { type: 'string' },
    professional_email: { type: 'string' },
    professional_phone: { type: 'string' },
    letterhead_path: { type: 'string' },
    signature_path: { type: 'string' },
    letterhead_margins_mm: { type: 'object' },
    practice_type: { type: 'string', enum: ['vet', 'human'], default: 'vet' },
    active_modules: { type: 'array', items: { type: 'string' }, default: ['core'] },
    theme: { type: 'string', default: 'light' }
  },
  required: ['id']
};

// --- PATIENTS ---
export const PatientSchema = {
  title: 'patient schema',
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    species: { type: 'string' }, 
    breed: { type: 'string' },
    size: { type: 'string' },
    owner_name: { type: 'string' },
    ownerPhone: { type: 'string' },
    document: { type: 'string' }, 
    birth_date: { type: 'string', format: 'date' },
    birth_year: { type: 'string' },
    weight: { type: 'number' },
    sex: { type: 'string', enum: ['M', 'F', 'male', 'female'] },
    is_neutered: { type: 'boolean' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    practice: { type: 'string' }
  },
  required: ['id', 'name']
};

// --- EXAMS (CORRIGIDO PARA STRICT MODE) ---
export const ExamSchema = {
  title: 'exam schema',
  version: 3, // 🟢 Atualizado para V3 para forçar migração limpa
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    patient_id: { type: 'string' },
    exam_type: { type: 'string' },
    date: { type: 'string', format: 'date-time' },
    exam_weight: { type: 'number' },
    referring_vet: { type: 'string' },
    
    organs_data: {
        type: 'array',
        items: {
            type: 'object',
            properties: {
                organ_name: { type: 'string' },
                report_text: { type: 'string' },
                measurements: { type: 'object', additionalProperties: true },
                
                // 🟢 CORREÇÃO STRICT MODE:
                // Em vez de type: ['string', 'object'], usamos oneOf.
                visual_data: { 
                    oneOf: [
                        { type: 'string' }, // Base64
                        { type: 'object', additionalProperties: true }, // Campimetria
                        { type: 'array' }, // Legado/Outros
                        { type: 'null' }
                    ]
                }
            }
        }
    },

    report_content: { type: 'string' },
    conclusion: { type: 'string' },
    
    images: {
        type: 'array',
        items: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                filename: { type: 'string' },
                data: { type: 'string' },
                originalData: { type: 'string' },
                mimeType: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } }
            }
        }
    },
    
    status: { type: 'string', enum: ['draft', 'finalized'] }
  },
  required: ['id', 'patient_id']
};

// --- TEMPLATES ---
export const TemplateSchema = {
  title: 'template schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    title: { type: 'string' },
    text: { type: 'string' },
    organ: { type: 'string' },
    lang: { type: 'string', default: 'pt' }
  },
  required: ['id', 'title', 'text']
};

// --- REFERENCE VALUES ---
export const ReferenceValueSchema = {
  title: 'reference value schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    species: { type: 'string' },
    organ: { type: 'string' },
    parameter: { type: 'string' },
    min_value: { type: 'number' },
    max_value: { type: 'number' },
    unit: { type: 'string' },
    size: { type: 'string' }
  },
  required: ['id', 'organ']
};

// --- PROFILES ---
export const ProfileSchema = {
  title: 'profile schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    clinic_name: { type: 'string' },
    clinic_address: { type: 'string' },
    veterinarian_name: { type: 'string' },
    crmv: { type: 'string' },
    professional_email: { type: 'string' },
    professional_phone: { type: 'string' },
    letterhead_path: { type: 'string' },
    signature_path: { type: 'string' },
    letterhead_margins_mm: { type: 'object' }
  },
  required: ['id', 'name']
};

// --- DRUGS ---
export const DrugSchema = {
  title: 'drug schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    type: { type: 'string', enum: ['vet', 'human'] },
    default_dosage: { type: 'string' }
  },
  required: ['id', 'name']
};

// --- PRESCRIPTIONS ---
export const PrescriptionSchema = {
  title: 'prescription schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    patient_id: { type: 'string' },
    doctor_name: { type: 'string' },
    date: { type: 'string', format: 'date-time' },
    items: { type: 'array', items: { type: 'object' } },
    notes: { type: 'string' }
  },
  required: ['id', 'patient_id']
};

// --- OPHTHALMO ---
export const OphthalmoSchema = {
  title: 'ophthalmo schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    exam_id: { type: 'string' },
    diagnosis: { type: 'string' },
    visual_data: { type: 'string' }
  },
  required: ['id', 'exam_id']
};