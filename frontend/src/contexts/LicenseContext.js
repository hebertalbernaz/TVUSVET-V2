/**
 * TVUSVET V2.0 - License & Practice Context
 * Gerencia:
 * 1. Prática Ativa (Vet vs Human)
 * 2. Módulos Licenciados (SaaS)
 * 3. Termos do Dicionário
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getDatabase } from '../core/database/db';
import { vetTerms } from '../config/dictionaries/vet_terms';
import { humanTerms } from '../config/dictionaries/human_terms';

const LicenseContext = createContext({});

export const useLicense = () => useContext(LicenseContext);

export const LicenseProvider = ({ children }) => {
  const { currentUser, claims } = useAuth(); 
  const [practice, setPractice] = useState('vet'); 
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carrega configurações do banco local ou claims
  useEffect(() => {
    const initLicense = async () => {
      try {
        const db = await getDatabase();
        
        // 1. Tenta pegar do Claims (Autenticado - Futuro SaaS Remoto)
        if (currentUser && claims) {
            if (claims.practice) setPractice(claims.practice);
            if (claims.modules) setLicenses(claims.modules);
            
            // Sync to local settings
            const settings = await db.settings.findOne({ selector: { id: 'global_settings' } }).exec();
            if (settings) {
                // Usa incrementalPatch se disponível, senão patch normal
                const patchFn = settings.incrementalPatch ? settings.incrementalPatch.bind(settings) : settings.patch.bind(settings);
                await patchFn({ 
                    practice_type: claims.practice || 'vet',
                    active_modules: claims.modules || []
                });
            }
        } 
        // 2. Fallback: Banco Local (Offline/Anon/Dev)
        else {
            const settings = await db.settings.findOne({ selector: { id: 'global_settings' } }).exec();
            if (settings) {
                const settingsData = settings.toJSON();
                setPractice(settingsData.practice_type || 'vet');
                setLicenses(settingsData.active_modules || ['core']);
            } else {
                setPractice('vet');
                setLicenses(['core']);
            }
        }
      } catch (e) {
        console.error("License Init Error:", e);
        setPractice('vet');
        setLicenses(['core']);
      } finally {
        setLoading(false);
      }
    };

    initLicense();
  }, [currentUser, claims]);

  // Carrega termos baseados na prática
  const terms = practice === 'vet' ? vetTerms : humanTerms;

  // Verifica módulo (Core da Venda Modular)
  const hasModule = (moduleName) => {
    // Core é sempre true
    if (moduleName === 'core') return true;
    
    // Regras Hard-Lock (Segurança de Negócio por Área)
    if (moduleName === 'lab_vet' && practice !== 'vet') return false;
    if (moduleName === 'ophthalmo_human' && practice !== 'human') return false;

    // Se a licença permitir, libera
    return licenses.includes(moduleName);
  };

  // Função DEV para trocar prática e ativar módulos automaticamente
  const switchPractice = async (newType) => {
      setPractice(newType);
      
      const db = await getDatabase();
      const settings = await db.settings.findOne({ selector: { id: 'global_settings' } }).exec();
      
      if (settings) {
          // Lógica Inteligente para Dev/Demo:
          // Se trocou de prática, garante que os módulos dessa prática estejam ativos
          let currentModules = settings.get('active_modules') || [];
          
          if (newType === 'human') {
              // Garante Oftalmo e Receita se virar Médico
              if (!currentModules.includes('ophthalmo_human')) currentModules.push('ophthalmo_human');
              if (!currentModules.includes('prescription')) currentModules.push('prescription');
          } else {
              // Garante Cardio e Receita se virar Vet
              if (!currentModules.includes('cardio')) currentModules.push('cardio');
              if (!currentModules.includes('prescription')) currentModules.push('prescription');
          }

          // Atualiza Contexto Local
          setLicenses(currentModules);

          // Persiste no Banco com incrementalPatch (Seguro contra conflito)
          if (typeof settings.incrementalPatch === 'function') {
              await settings.incrementalPatch({ 
                  practice_type: newType,
                  active_modules: currentModules
              });
          } else {
              await settings.patch({ 
                  practice_type: newType,
                  active_modules: currentModules
              });
          }
      }
  };

  const value = {
    practice,
    setPractice: switchPractice,
    licenses,
    terms,
    hasModule,
    loading
  };

  return (
    <LicenseContext.Provider value={value}>
      {!loading && children}
    </LicenseContext.Provider>
  );
};