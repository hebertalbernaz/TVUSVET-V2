/**
 * TVUSVET Database Service (Adapter for RxDB)
 * Mantém a interface compatível com o UI existente, mas usa RxDB por baixo.
 */
import { getDatabase, genId } from '../core/database/db';

class DatabaseService {
  
  // Helper para obter JSON limpo dos documentos RxDB
  async _files(query) {
      const docs = await query.exec();
      return docs.map(d => d.toJSON());
  }
  
  async _one(query) {
      const doc = await query.exec();
      return doc ? doc.toJSON() : null;
  }

  // ================= PACIENTES =================
  async createPatient(p) { 
      const db = await getDatabase();
      const np = { ...p, id: genId(), created_at: new Date().toISOString() }; 
      await db.patients.insert(np);
      return np; 
  }
  
  async getPatients() { 
      const db = await getDatabase();
      return await this._files(db.patients.find().sort({ name: 'asc' }));
  }
  
  async getPatient(id) { 
      const db = await getDatabase();
      return await this._one(db.patients.findOne(id));
  }
  
  async updatePatient(id, d) { 
      const db = await getDatabase();
      const doc = await db.patients.findOne(id).exec();
      if (doc) {
          await doc.patch(d);
          return doc.toJSON();
      }
      throw new Error('Not found');
  }
  
  async deletePatient(id) { 
      const db = await getDatabase();
      const doc = await db.patients.findOne(id).exec();
      if (doc) await doc.remove();
      
      // Cascade Delete Exams
      const exams = await db.exams.find({ selector: { patient_id: id } }).exec();
      await Promise.all(exams.map(e => e.remove()));
  }

  // ================= EXAMES =================
  async createExam(d) { 
      const db = await getDatabase();
      const ne = { 
          ...d, 
          id: genId(), 
          exam_type: d.exam_type||'ultrasound_abd', 
          date: d.exam_date||new Date().toISOString(), // Schema usa 'date', adapter antigo usava 'exam_date'
          organs_data: d.organs_data||[], 
          images: d.images||[], 
          status: 'draft'
      }; 
      await db.exams.insert(ne);
      return ne; 
  }
  
  async getExams(pid = null) { 
      const db = await getDatabase();
      const query = pid ? { selector: { patient_id: pid } } : {};
      return await this._files(db.exams.find(query).sort({ date: 'desc' }));
  }
  
  async getExam(id) { 
      const db = await getDatabase();
      return await this._one(db.exams.findOne(id));
  }
  
  async updateExam(id, d) { 
      const db = await getDatabase();
      const doc = await db.exams.findOne(id).exec();
      if (doc) {
          await doc.patch(d);
          return doc.toJSON();
      }
      throw new Error('Not found');
  }
  
  async deleteExam(id) { 
      const db = await getDatabase();
      const doc = await db.exams.findOne(id).exec();
      if (doc) await doc.remove();
  }

  // ================= SETTINGS & PROFILES =================
  async getSettings() { 
      const db = await getDatabase();
      let s = await this._one(db.settings.findOne('global_settings'));
      
      // FALLBACK: Se settings não existir, cria automaticamente
      if (!s) {
        console.warn('Settings não encontrado, criando configurações padrão...');
        const defaultSettings = {
          id: 'global_settings',
          practice_type: 'vet',
          active_modules: ['core', 'ultrasound', 'financial'],
          clinic_name: '',
          theme: 'light',
          active_profile_id: null,
          active_profile_name: null
        };
        try {
          await db.settings.insert(defaultSettings);
          s = defaultSettings;
        } catch (e) {
          console.error('Erro ao criar settings:', e);
          return defaultSettings; // Retorna default mesmo se insert falhar
        }
      }
      return s || {};
  }
  
  async updateSettings(d) { 
      const db = await getDatabase();
      const doc = await db.settings.findOne('global_settings').exec();
      if (doc) {
          await doc.patch(d);
          return doc.toJSON();
      }
  }

  async getProfiles() {
      const db = await getDatabase();
      return await this._files(db.profiles.find());
  }

  async createProfile(name, settingsData) {
      const db = await getDatabase();
      const profile = {
          id: genId(),
          name: name,
          clinic_name: settingsData.clinic_name || '',
          clinic_address: settingsData.clinic_address || '',
          veterinarian_name: settingsData.veterinarian_name || '',
          crmv: settingsData.crmv || '',
          professional_email: settingsData.professional_email || '',
          professional_phone: settingsData.professional_phone || '',
          letterhead_path: settingsData.letterhead_path || null,
          signature_path: settingsData.signature_path || null,
          letterhead_margins_mm: settingsData.letterhead_margins_mm || { top: 30, left: 15, right: 15, bottom: 20 }
      };
      await db.profiles.insert(profile);
      await this.activateProfile(profile.id);
      return profile;
  }

  async updateProfile(id, data) {
      const db = await getDatabase();
      const doc = await db.profiles.findOne(id).exec();
      if (doc) {
          await doc.patch(data);
          // Se for o ativo, atualiza as configs globais na hora
          const settings = await this.getSettings();
          if (settings.active_profile_id === id) {
              await this.activateProfile(id);
          }
          return true;
      }
      return false;
  }

  async activateProfile(profileId) {
      const db = await getDatabase();
      const target = await db.profiles.findOne(profileId).exec();
      if (!target) throw new Error("Perfil não encontrado");

      const profileData = target.toJSON();
      
      const settingsDoc = await db.settings.findOne('global_settings').exec();
      
      // Copia dados do perfil para settings (Flattening)
      await settingsDoc.patch({
          active_profile_id: profileData.id,
          active_profile_name: profileData.name,
          
          clinic_name: profileData.clinic_name,
          clinic_address: profileData.clinic_address,
          veterinarian_name: profileData.veterinarian_name,
          crmv: profileData.crmv,
          professional_email: profileData.professional_email,
          professional_phone: profileData.professional_phone,
          letterhead_path: profileData.letterhead_path,
          signature_path: profileData.signature_path,
          letterhead_margins_mm: profileData.letterhead_margins_mm
      });
      
      return settingsDoc.toJSON();
  }

  async deleteProfile(id) {
      const db = await getDatabase();
      const doc = await db.profiles.findOne(id).exec();
      if (doc) await doc.remove();
      
      const s = await this.getSettings();
      if (s.active_profile_id === id) {
          await this.updateSettings({ active_profile_id: null, active_profile_name: null });
      }
  }

  // ================= TEMPLATES & REFERENCE VALUES =================
  async getTemplates(organ = null) {
      const db = await getDatabase();
      const query = organ ? { selector: { organ } } : {};
      return await this._files(db.templates.find(query));
  }

  async createTemplate(d) {
      const db = await getDatabase();
      const n = { ...d, id: genId(), lang: d.lang || 'pt' };
      await db.templates.insert(n);
      return n;
  }

  async updateTemplate(id, d) {
      const db = await getDatabase();
      const doc = await db.templates.findOne(id).exec();
      if (doc) await doc.patch(d);
  }

  async deleteTemplate(id) {
      const db = await getDatabase();
      const doc = await db.templates.findOne(id).exec();
      if (doc) await doc.remove();
  }

  async getReferenceValues(f={}) {
      const db = await getDatabase();
      let selector = {};
      if (f.organ) selector.organ = f.organ;
      if (f.species) selector.species = f.species;
      return await this._files(db.reference_values.find({ selector }));
  }

  async createReferenceValue(d) {
      const db = await getDatabase();
      const n = { ...d, id: genId() };
      await db.reference_values.insert(n);
      return n;
  }

  async updateReferenceValue(id, d) {
      const db = await getDatabase();
      const doc = await db.reference_values.findOne(id).exec();
      if (doc) await doc.patch(d);
  }

  async deleteReferenceValue(id) {
      const db = await getDatabase();
      const doc = await db.reference_values.findOne(id).exec();
      if (doc) await doc.remove();
  }

  async saveImage(eid, d) {
      const db = await getDatabase();
      const doc = await db.exams.findOne(eid).exec();
      if (doc) {
          const img = { 
              id: genId(), 
              filename: d.filename, 
              data: d.data, 
              originalData: d.data,
              mimeType: d.mimeType || 'image/png',
              tags: d.tags || []
          };
          const currentImages = doc.images || [];
          await doc.patch({ images: [...currentImages, img] });
          return img;
      }
  }

  async deleteImage(eid, iid) {
      const db = await getDatabase();
      const doc = await db.exams.findOne(eid).exec();
      if (doc) {
          const currentImages = doc.images || [];
          const newImages = currentImages.filter(i => i.id !== iid);
          await doc.patch({ images: newImages });
      }
  }
}

export const db = new DatabaseService();
