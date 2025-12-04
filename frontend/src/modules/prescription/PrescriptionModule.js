import React, { useState, useEffect } from 'react';
import { useLicense } from '../../contexts/LicenseContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Printer, Plus, Edit, Trash2, Save, Pill } from 'lucide-react';
import { getDatabase, genId } from '../../core/database/db'; // Acesso direto ao RxDB
import { toast } from 'sonner';

export default function PrescriptionModule() {
  const { practice, terms } = useLicense();
  const [searchTerm, setSearchTerm] = useState('');
  const [drugsList, setDrugsList] = useState([]);
  const [selectedDrugs, setSelectedDrugs] = useState([]);
  const [weight, setWeight] = useState(''); // Apenas para Vet
  
  // Controle do Modal de Edição/Criação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState(null); // Se null, é criação
  const [formData, setFormData] = useState({ name: '', default_dosage: '' });

  // 1. Carrega drogas do banco
  useEffect(() => {
    const loadDrugs = async () => {
        const db = await getDatabase();
        // Filtra por tipo (vet ou human) e busca pelo nome
        const query = {
            selector: {
                type: practice,
                name: { $regex: new RegExp(searchTerm, 'i') } // Busca case-insensitive
            },
            limit: 50
        };
        const docs = await db.drugs.find(query).exec();
        setDrugsList(docs.map(d => d.toJSON()));
    };
    loadDrugs();
  }, [searchTerm, practice, isModalOpen]); // Recarrega ao fechar modal

  // 2. Adiciona à receita
  const addDrugToPrescription = (drug) => {
    let dose = drug.default_dosage;
    
    // Calculadora Automática Vet (Simples)
    if (practice === 'vet' && weight) {
        const w = parseFloat(weight);
        if (!isNaN(w)) {
            // Tenta encontrar padrão "X mg/kg" no texto
            const match = dose.match(/(\d+(\.\d+)?)(\s)?mg\/kg/i);
            if (match) {
                const doseMgKg = parseFloat(match[1]);
                const totalMg = (doseMgKg * w).toFixed(1);
                // Adiciona a nota calculada
                dose += ` (Dose Calc: ${totalMg}mg para ${w}kg)`;
            }
        }
    }

    setSelectedDrugs([...selectedDrugs, { ...drug, prescribed_dosage: dose }]);
  };

  const removeDrugFromPrescription = (index) => {
    setSelectedDrugs(selectedDrugs.filter((_, i) => i !== index));
  };

  // 3. Gestão de Drogas (CRUD)
  const handleOpenModal = (drug = null) => {
      setEditingDrug(drug);
      setFormData(drug ? { name: drug.name, default_dosage: drug.default_dosage } : { name: '', default_dosage: '' });
      setIsModalOpen(true);
  };

  const handleSaveDrug = async () => {
      if (!formData.name || !formData.default_dosage) return toast.error("Preencha nome e dose padrão.");
      
      try {
          const db = await getDatabase();
          if (editingDrug) {
              // Editar
              const doc = await db.drugs.findOne(editingDrug.id).exec();
              await doc.patch({
                  name: formData.name,
                  default_dosage: formData.default_dosage
              });
              toast.success("Medicamento atualizado!");
          } else {
              // Criar
              await db.drugs.insert({
                  id: genId(),
                  name: formData.name,
                  default_dosage: formData.default_dosage,
                  type: practice // 'vet' ou 'human'
              });
              toast.success("Medicamento criado!");
          }
          setIsModalOpen(false);
      } catch (e) {
          console.error(e);
          toast.error("Erro ao salvar medicamento.");
      }
  };

  const handleDeleteDrug = async (id, e) => {
      e.stopPropagation(); // Evita adicionar à receita ao clicar no delete
      if (!window.confirm("Tem certeza que deseja excluir este medicamento do banco?")) return;
      
      try {
          const db = await getDatabase();
          const doc = await db.drugs.findOne(id).exec();
          await doc.remove();
          toast.success("Medicamento excluído.");
          // Atualiza lista local forçadamente
          setDrugsList(prev => prev.filter(d => d.id !== id));
      } catch (e) {
          toast.error("Erro ao excluir.");
      }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto h-[calc(100vh-60px)] flex flex-col">
      <header className="mb-6 flex justify-between items-center shrink-0">
        <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Pill className="h-6 w-6 text-primary" /> {terms.prescription_header}
            </h1>
            <p className="text-xs text-muted-foreground">Banco de Dados: {practice === 'vet' ? 'Veterinário' : 'Humano'}</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => handleOpenModal(null)} className="gap-2 bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4" /> Novo Medicamento
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" /> Imprimir
            </Button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* COLUNA ESQUERDA: Banco de Drogas (4 colunas) */}
        <div className="col-span-4 flex flex-col gap-4 min-h-0">
            <Card className="p-4 bg-muted/30 flex flex-col h-full border-primary/10">
                {practice === 'vet' && (
                    <div className="mb-4 bg-white p-3 rounded-md border shadow-sm shrink-0">
                        <Label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Peso do Paciente (kg)</Label>
                        <div className="flex items-center gap-2">
                            <Input 
                                type="number" 
                                placeholder="0.0" 
                                value={weight}
                                onChange={e => setWeight(e.target.value)}
                                className="font-bold text-lg h-10"
                            />
                            <span className="text-sm font-medium text-muted-foreground">kg</span>
                        </div>
                    </div>
                )}

                <div className="relative mb-2 shrink-0">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar ou Filtrar..." 
                        className="pl-9"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                    {drugsList.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            Nenhum medicamento encontrado.<br/>
                            Clique em "Novo Medicamento" para cadastrar.
                        </div>
                    )}
                    {drugsList.map(drug => (
                        <div 
                            key={drug.id} 
                            className="p-3 bg-card border rounded-md cursor-pointer hover:border-primary hover:shadow-md transition-all group relative"
                            onClick={() => addDrugToPrescription(drug)}
                        >
                            <div className="pr-16"> {/* Espaço para botões */}
                                <div className="font-bold text-sm text-foreground">{drug.name}</div>
                                <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{drug.default_dosage}</div>
                            </div>
                            
                            {/* Botões de Ação (Aparecem no Hover) */}
                            <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card/80 backdrop-blur-sm rounded">
                                <Button 
                                    size="icon" variant="ghost" className="h-7 w-7 text-blue-500 hover:bg-blue-50"
                                    onClick={(e) => { e.stopPropagation(); handleOpenModal(drug); }}
                                    title="Editar"
                                >
                                    <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button 
                                    size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-50"
                                    onClick={(e) => handleDeleteDrug(drug.id, e)}
                                    title="Excluir"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>

        {/* COLUNA DIREITA: Receita (8 colunas) */}
        <div className="col-span-8 flex flex-col min-h-0">
            <Card className="flex-1 p-8 bg-white text-black relative shadow-lg overflow-y-auto print:shadow-none print:border-none print:p-0" id="prescription-paper">
                {/* Cabeçalho da Receita (Print Friendly) */}
                <div className="text-center border-b-2 border-black pb-4 mb-6">
                    <h2 className="text-2xl font-bold uppercase tracking-wide">Receituário {practice === 'vet' ? 'Veterinário' : 'Médico'}</h2>
                    <p className="text-sm text-gray-600 mt-1">Dr(a). Nome do Profissional</p>
                </div>

                {/* Conteúdo */}
                <div className="space-y-6">
                    <div className="flex justify-between text-sm mb-8 font-mono border-b border-gray-200 pb-2">
                        <span><b>Paciente:</b> Nome do Paciente</span>
                        <span><b>Data:</b> {new Date().toLocaleDateString()}</span>
                    </div>

                    <div className="space-y-8 pl-4 min-h-[400px]">
                        {selectedDrugs.map((drug, idx) => (
                            <div key={idx} className="relative group">
                                <div className="flex items-baseline gap-2 font-serif text-lg">
                                    <span className="font-bold">{idx + 1}.</span>
                                    <span className="font-bold text-gray-900">{drug.name}</span>
                                </div>
                                <div className="pl-6 text-gray-700 font-serif italic text-base mt-1">
                                    {drug.prescribed_dosage}
                                </div>
                                {/* Botão Remover da Receita */}
                                <button 
                                    onClick={() => removeDrugFromPrescription(idx)}
                                    className="absolute -left-8 top-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                                    title="Remover da receita"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                        
                        {selectedDrugs.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-300 border-2 border-dashed border-gray-200 rounded-lg print:hidden">
                                <Pill className="h-12 w-12 mb-2 opacity-20" />
                                <p>Selecione medicamentos na lista ao lado</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Rodapé */}
                <div className="mt-auto pt-8 border-t border-gray-300 text-center text-xs text-gray-400">
                    <p>Assinatura e Carimbo</p>
                </div>
            </Card>
        </div>
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>{editingDrug ? 'Editar Medicamento' : 'Novo Medicamento'}</DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Nome</Label>
                    <Input 
                        className="col-span-3" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="Ex: Dipirona 500mg"
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Posologia Padrão</Label>
                    <Textarea 
                        className="col-span-3 font-mono text-sm" 
                        value={formData.default_dosage} 
                        onChange={e => setFormData({...formData, default_dosage: e.target.value})}
                        placeholder={practice === 'vet' ? "Ex: 25 mg/kg a cada 8h" : "Ex: 1 cp a cada 6h"}
                    />
                </div>
                <div className="text-xs text-muted-foreground text-center px-8">
                    {practice === 'vet' ? (
                        <p>💡 Dica: Use "mg/kg" no texto para ativar a calculadora automática.</p>
                    ) : (
                        <p>💡 Dica: Escreva a posologia comum para agilizar.</p>
                    )}
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveDrug} className="bg-green-600 hover:bg-green-700">
                    <Save className="h-4 w-4 mr-2" /> Salvar
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}