'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, ArrowRight, Plus, Trash2, Upload, Check, Search, Edit2, FileText, AlertCircle } from 'lucide-react';
import { saveToLocal, getFromLocal, getOneFromLocal } from '@/lib/local-storage';
import { formatCPF } from '@/lib/formatters';
import { doc, getDoc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadToGoogleDrive } from '@/lib/google-drive';

const GOOGLE_DRIVE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwuBZhMOrfMNzjkODqz-JE5Yu_3qTH94l5rP_Kd-UiwOzV8CWgPf3EuXxp4nvmyz92Y0w/exec';

const STEPS = ['Projeto', 'Orçamento', 'Equipe', 'Anexos', 'Revisão'];

export default function FomentoPesquisa({ onBack, initialData, readOnly = false }: { onBack: () => void, initialData?: any, readOnly?: boolean }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // Form States
  const [formData, setFormData] = useState({
    titulo: initialData?.titulo || '',
    resumo: initialData?.resumo || '',
    metodologia: initialData?.metodologia || '',
  });

  const [cronograma, setCronograma] = useState(() => {
    if (initialData?.cronograma_json) {
      try { return JSON.parse(initialData.cronograma_json); } catch(e) {}
    }
    if (initialData?.cronograma) return initialData.cronograma;
    return [{ atividade: '', inicio: '', termino: '' }];
  });

  const [orcamento, setOrcamento] = useState(() => {
    if (initialData?.orcamento_json) {
      try { return JSON.parse(initialData.orcamento_json); } catch(e) {}
    }
    if (initialData?.orcamento) return initialData.orcamento;
    return [{ categoria: 'Material de Consumo', descricao: '', qtd: 1, valor: 0 }];
  });

  const [equipe, setEquipe] = useState<any[]>(() => {
    if (initialData?.equipe_json) {
      try { return JSON.parse(initialData.equipe_json); } catch(e) {}
    }
    if (initialData?.equipe) return initialData.equipe;
    return [];
  });
  const [files, setFiles] = useState<Record<string, File>>({});
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  // Search States
  const [searchCpf, setSearchCpf] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const docRef = doc(db, 'researchers', user.uid);
          const docSnap = await getDoc(docRef);
            
          if (docSnap.exists()) {
            const data = docSnap.data();
            const profileData = { ...data, ...data.raw_data };
            setUserProfile(profileData);
            setEquipe(prev => {
              if (prev.length === 0) {
                return [{
                  nome: profileData.nome,
                  cpf: profileData.cpf,
                  titulacao: profileData.titulacao || 'Não informada',
                  lattes: profileData.lattes || '',
                  papel: 'Líder'
                }];
              }
              return prev;
            });
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
        }
      }
    };
    fetchProfile();
  }, [user, initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles && selectedFiles[0]) {
      setFiles(prev => ({ ...prev, [name]: selectedFiles[0] }));
    }
  };

  const handleSearchCpf = async () => {
    if (!searchCpf) return;
    setSearchLoading(true);
    setSearchError('');
    setSearchResult(null);

    try {
      const results = getFromLocal('researchers_public', 'cpf', searchCpf);
      
      if (results.length > 0) {
        const docData = results[0];
        // Check if already in team
        if (equipe.some(m => m.cpf === docData.cpf)) {
          setSearchError('Este pesquisador já está na equipe.');
        } else {
          setSearchResult({
            nome: docData.nome,
            cpf: docData.cpf,
            titulacao: docData.titulacao || 'Não informada',
            lattes: docData.lattes || '',
            papel: 'Pesquisador'
          });
        }
      } else {
        setSearchError('Pesquisador não encontrado no sistema.');
      }
    } catch (error) {
      console.error('Error searching CPF:', error);
      setSearchError('Erro ao buscar pesquisador.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddMember = () => {
    if (searchResult) {
      setEquipe([...equipe, searchResult]);
      setSearchResult(null);
      setSearchCpf('');
    }
  };

  const totalOrcamento = orcamento.reduce((acc: number, item: any) => acc + (item.qtd * item.valor), 0);
  const formattedTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOrcamento);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSubmit = async (isDraft = false) => {
    if (!user || !userProfile) return;
    if (!isDraft && !declarationAccepted) {
      showToast('Você deve aceitar a declaração de veracidade para submeter o projeto.', 'error');
      return;
    }
    setLoading(true);

    try {
      // Upload files to Google Drive
      const uploadedDocs: Record<string, string> = {};
      for (const [key, file] of Object.entries(files)) {
        const url = await uploadToGoogleDrive(file, userProfile.nome, userProfile.cpf, GOOGLE_DRIVE_SCRIPT_URL);
        uploadedDocs[key] = url;
      }

      let existingDocs = {};
      if (initialData?.anexos_json) {
        try { existingDocs = JSON.parse(initialData.anexos_json); } catch(e) {}
      }
      const mergedDocs = { ...existingDocs, ...uploadedDocs };

      let currentRawData = initialData?.raw_data || {};
      if (initialData?.id) {
        const docRef = doc(db, 'projects', initialData.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().raw_data) {
          currentRawData = JSON.parse(docSnap.data().raw_data);
        }
      }

      // Clear document statuses for newly uploaded documents
      const documentStatuses = { ...(currentRawData.document_statuses || {}) };
      for (const key of Object.keys(uploadedDocs)) {
        delete documentStatuses[key];
      }

      // Save project to Supabase
      const rawData = {
        ...currentRawData,
        ...formData,
        cronograma_json: JSON.stringify(cronograma),
        orcamento_json: JSON.stringify(orcamento),
        equipe_json: JSON.stringify(equipe),
        anexos_json: JSON.stringify(mergedDocs),
        document_statuses: documentStatuses
      };

      const projectData = {
        authorUid: user.uid,
        type: 'fomento_pesquisa',
        status: isDraft ? 'Rascunho' : 'Em Análise',
        raw_data: JSON.stringify(rawData),
        createdAt: new Date().toISOString()
      };

      if (initialData?.id) {
        const docRef = doc(db, 'projects', initialData.id);
        await updateDoc(docRef, projectData);
      } else {
        const newDocRef = doc(collection(db, 'projects'));
        await setDoc(newDocRef, projectData);
      }
      
      showToast(isDraft ? 'Rascunho salvo com sucesso!' : 'Projeto submetido com sucesso!', 'success');
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error) {
      console.error('Error submitting project:', error);
      showToast('Erro ao salvar o projeto. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const wordCount = formData.resumo.trim() ? formData.resumo.trim().split(/\s+/).length : 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 relative pb-24">
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-[100] px-6 py-3 rounded-xl shadow-lg text-white font-bold animate-in slide-in-from-top-4 ${toastMessage.type === 'success' ? 'bg-success' : 'bg-error'}`}>
          {toastMessage.message}
        </div>
      )}
      {/* Floating Dashboard (Visible on Budget and Review steps) */}
      {(currentStep === 1 || currentStep === 4) && (
        <div className="fixed top-24 right-8 z-50 glass-panel p-4 rounded-xl shadow-lg border border-primary/20 hidden lg:flex flex-col items-end animate-in slide-in-from-right-8">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant mb-1">Total Solicitado</span>
          <span className="font-manrope font-extrabold text-2xl text-primary">{formattedTotal}</span>
        </div>
      )}

      <header className="mb-12">
        <button onClick={onBack} className="flex items-center gap-2 text-primary font-bold text-sm mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
        </button>
        <h1 className="text-4xl font-bold text-on-surface mb-4">Edital de Fomento à Pesquisa</h1>
        <p className="text-lg text-on-surface-variant">
          Estruture sua proposta de pesquisa. Preencha os módulos abaixo com precisão técnica e rigor acadêmico.
        </p>
      </header>

      {/* Stepper */}
      <div className="flex gap-2 mb-12 overflow-x-auto pb-4">
        {STEPS.map((step, index) => (
          <div key={step} className="flex items-center flex-1 min-w-[120px]">
            <div className={`flex-1 p-3 rounded-md flex items-center gap-3 transition-colors ${
              index === currentStep ? 'bg-primary text-white' : index < currentStep ? 'bg-secondary/20 text-primary' : 'bg-surface-container-high text-on-surface-variant'
            }`}>
              <span className="text-xs font-bold uppercase tracking-wider">{index + 1}. {step}</span>
            </div>
            {index < STEPS.length - 1 && <div className="w-2 h-1 bg-surface-container mx-1 rounded-full"></div>}
          </div>
        ))}
      </div>

      <div className="bento-card">
        {currentStep === 0 && (
          <div className="space-y-8 animate-in fade-in">
            <h2 className="text-2xl font-bold text-primary border-l-4 border-primary pl-4">Identificação e Escopo</h2>
            
            <div>
              <label className="label-text">Título do Projeto</label>
              <input type="text" name="titulo" value={formData.titulo} onChange={handleInputChange} maxLength={200} className="input-field" placeholder="Ex: Análise Epidemiológica..." required disabled={readOnly} />
              <div className="text-right mt-1"><span className="text-[10px] text-on-surface-variant">{formData.titulo.length}/200 caracteres</span></div>
            </div>

            <div>
              <label className="label-text">Resumo da Proposta</label>
              <textarea name="resumo" value={formData.resumo} onChange={handleInputChange} rows={4} className="input-field" placeholder="Sintetize os objetivos e justificativa..." required disabled={readOnly} />
              <div className="text-right mt-1"><span className={`text-[10px] ${wordCount > 500 ? 'text-red-500 font-bold' : 'text-on-surface-variant'}`}>{wordCount}/500 palavras</span></div>
            </div>

            <div>
              <label className="label-text">Metodologia</label>
              <textarea name="metodologia" value={formData.metodologia} onChange={handleInputChange} rows={6} className="input-field" placeholder="Descreva detalhadamente o desenho do estudo..." required disabled={readOnly} />
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">Cronograma de Atividades</h3>
                {!readOnly && (
                  <button type="button" onClick={() => setCronograma([...cronograma, { atividade: '', inicio: '', termino: '' }])} className="text-primary font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-surface-container px-3 py-2 rounded transition-colors">
                    <Plus className="w-4 h-4" /> Adicionar Marco
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                {cronograma.map((item: any, index: number) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-surface p-4 rounded border border-outline-variant/20 relative">
                    <div className="md:col-span-2">
                      <label className="label-text text-xs uppercase">Atividade/Marco Civil</label>
                      <input type="text" value={item.atividade} onChange={(e) => {
                        const newC = [...cronograma]; newC[index].atividade = e.target.value; setCronograma(newC);
                      }} className="input-field py-2" placeholder="Ex: Coleta de Dados" disabled={readOnly} />
                    </div>
                    <div>
                      <label className="label-text text-xs uppercase">Início</label>
                      <input type="month" value={item.inicio} onChange={(e) => {
                        const newC = [...cronograma]; newC[index].inicio = e.target.value; setCronograma(newC);
                      }} className="input-field py-2" disabled={readOnly} />
                    </div>
                    <div>
                      <label className="label-text text-xs uppercase">Término</label>
                      <input type="month" value={item.termino} onChange={(e) => {
                        const newC = [...cronograma]; newC[index].termino = e.target.value; setCronograma(newC);
                      }} className="input-field py-2" disabled={readOnly} />
                    </div>
                    {!readOnly && cronograma.length > 1 && (
                      <button type="button" onClick={() => setCronograma(cronograma.filter((_: any, i: number) => i !== index))} className="absolute -top-3 -right-3 bg-white text-red-500 rounded-full p-1 shadow-sm hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-8 animate-in fade-in">
            <h2 className="text-2xl font-bold text-primary border-l-4 border-primary pl-4">Estrutura Orçamentária</h2>
            <p className="text-sm text-on-surface-variant">Baseie-se nos valores de mercado e especificações dos editais da ESPDF.</p>

            <div className="bg-surface-container-lowest rounded-lg border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-12 gap-4 bg-surface-container p-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant hidden md:grid">
                <div className="col-span-3">Categoria</div>
                <div className="col-span-4">Item/Descrição</div>
                <div className="col-span-1 text-center">Qtd</div>
                <div className="col-span-2 text-right">Val. Unitário</div>
                <div className="col-span-2 text-right">Total</div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {orcamento.map((item: any, index: number) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center hover:bg-surface/50 transition-colors">
                    <div className="md:col-span-3">
                      <label className="md:hidden label-text text-xs uppercase">Categoria</label>
                      <select value={item.categoria} onChange={(e) => {
                        const newO = [...orcamento]; newO[index].categoria = e.target.value; setOrcamento(newO);
                      }} className="input-field py-2 text-sm" disabled={readOnly}>
                        <option>Equipamento e Material Permanente</option>
                        <option>Material de Consumo</option>
                        <option>Serviços de Terceiros - PF</option>
                        <option>Serviços de Terceiros - PJ</option>
                        <option>Passagens e Despesas com Locomoção</option>
                        <option>Diárias</option>
                      </select>
                    </div>
                    <div className="md:col-span-4">
                      <label className="md:hidden label-text text-xs uppercase">Descrição</label>
                      <input type="text" value={item.descricao} onChange={(e) => {
                        const newO = [...orcamento]; newO[index].descricao = e.target.value; setOrcamento(newO);
                      }} placeholder="Descrição do item" className="input-field py-2 text-sm" disabled={readOnly} />
                    </div>
                    <div className="md:col-span-1">
                      <label className="md:hidden label-text text-xs uppercase">Qtd</label>
                      <input type="number" min="1" value={item.qtd} onChange={(e) => {
                        const newO = [...orcamento]; newO[index].qtd = parseInt(e.target.value) || 0; setOrcamento(newO);
                      }} className="input-field py-2 text-sm text-center" disabled={readOnly} />
                    </div>
                    <div className="md:col-span-2 relative">
                      <label className="md:hidden label-text text-xs uppercase">Valor Unitário</label>
                      <span className="absolute left-3 top-9 md:top-2.5 text-sm text-on-surface-variant">R$</span>
                      <input type="number" min="0" step="0.01" value={item.valor} onChange={(e) => {
                        const newO = [...orcamento]; newO[index].valor = parseFloat(e.target.value) || 0; setOrcamento(newO);
                      }} className="input-field py-2 pl-8 text-sm text-right" disabled={readOnly} />
                    </div>
                    <div className="md:col-span-2 flex items-center justify-between gap-2 mt-2 md:mt-0">
                      <div className="w-full text-right">
                        <span className="md:hidden text-xs text-on-surface-variant uppercase mr-2">Total:</span>
                        <span className="font-bold text-sm text-primary">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.qtd * item.valor)}
                        </span>
                      </div>
                      {!readOnly && orcamento.length > 1 && (
                        <button type="button" onClick={() => setOrcamento(orcamento.filter((_: any, i: number) => i !== index))} className="text-on-surface-variant hover:text-red-500 p-1 bg-surface rounded-full">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                {!readOnly && (
                  <button type="button" onClick={() => setOrcamento([...orcamento, { categoria: 'Material de Consumo', descricao: '', qtd: 1, valor: 0 }])} className="text-primary font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-opacity">
                    <Plus className="w-4 h-4" /> Adicionar Item
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <div className="bg-primary text-white p-6 rounded-xl shadow-lg min-w-[300px] flex justify-between items-center relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-10">
                  <FileText className="w-32 h-32" />
                </div>
                <div className="relative z-10 w-full text-right">
                  <span className="block text-xs uppercase tracking-widest opacity-80 mb-1">Valor Total do Projeto</span>
                  <span className="font-manrope font-extrabold text-3xl">
                    {formattedTotal}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-8 animate-in fade-in">
            <h2 className="text-2xl font-bold text-primary border-l-4 border-primary pl-4">Composição da Equipe</h2>
            
            {!readOnly && (
              <div className="bg-surface-container-lowest p-6 rounded-lg border border-gray-200 mb-8">
                <h3 className="font-bold text-lg mb-4">Adicionar Membro</h3>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="label-text">Buscar por CPF</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-5 h-5 text-on-surface-variant" />
                      <input 
                        type="text" 
                        value={searchCpf} 
                        onChange={(e) => setSearchCpf(formatCPF(e.target.value))} 
                        className="input-field pl-10" 
                        placeholder="000.000.000-00" 
                      />
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleSearchCpf}
                    disabled={searchLoading || !searchCpf}
                    className="btn-primary whitespace-nowrap"
                  >
                    {searchLoading ? 'Buscando...' : 'Buscar Pesquisador'}
                  </button>
                </div>

                {searchError && (
                  <p className="text-red-500 text-sm mt-2 font-medium">{searchError}</p>
                )}

                {searchResult && (
                  <div className="mt-6 p-4 border border-primary/30 bg-primary/5 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                      <h4 className="font-bold text-on-surface">{searchResult.nome}</h4>
                      <p className="text-sm text-on-surface-variant">CPF: {searchResult.cpf} • {searchResult.titulacao}</p>
                      {searchResult.lattes && (
                        <a href={searchResult.lattes} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                          Ver Currículo Lattes
                        </a>
                      )}
                    </div>
                    <button type="button" onClick={handleAddMember} className="btn-secondary text-sm py-2">
                      Adicionar à Equipe
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {equipe.map((membro: any, index: number) => (
                <div key={index} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative">
                  {index === 0 && (
                    <span className="absolute top-4 right-4 text-[10px] bg-secondary text-white px-2 py-1 rounded font-bold uppercase">Líder</span>
                  )}
                  {!readOnly && index > 0 && (
                    <button type="button" onClick={() => setEquipe(equipe.filter((_: any, i: number) => i !== index))} className="absolute top-4 right-4 text-on-surface-variant hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <h4 className="font-manrope font-bold text-lg mb-1 pr-12">{membro.nome}</h4>
                  <p className="text-xs text-on-surface-variant mb-3">CPF: {membro.cpf}</p>
                  <div className="flex items-center gap-2 text-xs text-primary font-medium">
                    <span>{membro.titulacao}</span>
                    {membro.lattes && (
                      <>
                        <span>•</span>
                        <a href={membro.lattes} target="_blank" rel="noreferrer" className="hover:underline">Lattes</a>
                      </>
                    )}
                  </div>
                  {index > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <label className="text-xs font-bold uppercase text-on-surface-variant mb-1 block">Papel no Projeto</label>
                      <select value={membro.papel} onChange={(e) => {
                        const newE = [...equipe]; newE[index].papel = e.target.value; setEquipe(newE);
                      }} className="w-full bg-surface border-none rounded p-2 text-sm" disabled={readOnly}>
                        <option>Pesquisador</option>
                        <option>Bolsista</option>
                        <option>Apoio Técnico</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-8 animate-in fade-in">
            <h2 className="text-2xl font-bold text-primary border-l-4 border-primary pl-4">Repositório Documental</h2>
            <p className="text-sm text-on-surface-variant">
              Todos os arquivos serão enviados para o Drive institucional, sob a pasta criptografada do projeto.
              <br/><span className="text-tertiary font-medium">Nota: O upload de arquivos é opcional nesta versão de testes.</span>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { id: 'projeto_completo', label: 'Projeto Completo', desc: 'PDF. Max 10MB.' },
                { id: 'planos_trabalho', label: 'Planos de Trabalho Individuais', desc: 'ZIP ou PDF.' },
                { id: 'aprovacao_cep', label: 'Aprovação do CEP/CONEP', desc: 'Obrigatório para pesquisas com seres humanos.' },
              ].map((doc) => (
                <div key={doc.id} className="border-2 border-dashed border-outline-variant/50 rounded-xl bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative">
                  <Upload className="w-8 h-8 text-primary mb-3 opacity-50" />
                  <h4 className="font-bold text-on-surface mb-1 text-sm">{doc.label}</h4>
                  <p className="text-xs text-on-surface-variant mb-4">{doc.desc}</p>
                  {!readOnly && (
                    <input
                      type="file"
                      name={doc.id}
                      onChange={handleFileChange}
                      accept=".pdf,.zip"
                      className="text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer w-full"
                    />
                  )}
                  {(files[doc.id] || (initialData?.anexos_json && JSON.parse(initialData.anexos_json)[doc.id])) && (
                    <div className="absolute top-3 right-3 bg-green-100 text-green-600 p-1 rounded-full">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-8 animate-in fade-in">
            <h2 className="text-2xl font-bold text-primary border-l-4 border-primary pl-4">Revisão Geral e Submissão Final</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Resumo do Projeto */}
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-gray-200 relative">
                {!readOnly && (
                  <button onClick={() => setCurrentStep(0)} className="absolute top-6 right-6 text-primary text-sm font-bold uppercase flex items-center gap-1 hover:underline">
                    <Edit2 className="w-4 h-4" /> Editar
                  </button>
                )}
                <h3 className="font-manrope font-bold text-sm text-on-surface-variant uppercase tracking-widest mb-4">Dados do Projeto</h3>
                <p className="font-manrope text-xl font-bold mb-2 text-on-surface">{formData.titulo || 'Sem título preenchido'}</p>
                <p className="text-sm text-on-surface-variant line-clamp-3 mb-4">{formData.resumo || 'Sem resumo preenchido'}</p>
                <div className="flex gap-4 text-sm font-medium text-primary">
                  <span>{cronograma.length} Marcos no Cronograma</span>
                  <span>{equipe.length} Membros na Equipe</span>
                </div>
              </div>

              {/* Resumo do Orçamento */}
              <div className="bg-surface-container-lowest p-6 rounded-xl border border-gray-200 relative flex flex-col justify-center">
                {!readOnly && (
                  <button onClick={() => setCurrentStep(1)} className="absolute top-6 right-6 text-primary text-sm font-bold uppercase flex items-center gap-1 hover:underline">
                    <Edit2 className="w-4 h-4" /> Editar
                  </button>
                )}
                <h3 className="font-manrope font-bold text-sm text-on-surface-variant uppercase tracking-widest mb-4">Síntese Financeira</h3>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-on-surface-variant">Solicitação Total</p>
                    <p className="font-manrope text-3xl font-extrabold text-primary">{formattedTotal}</p>
                  </div>
                </div>
                <p className="text-sm text-on-surface-variant mt-4">Distribuído em {orcamento.length} itens orçamentários.</p>
              </div>
            </div>

            {/* Declaração */}
            <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl">
              <label className="flex items-start gap-4 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={declarationAccepted}
                  onChange={(e) => setDeclarationAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded text-primary focus:ring-primary border-gray-300"
                  disabled={readOnly}
                />
                <span className="text-sm text-yellow-900 font-medium leading-relaxed">
                  Declaro sob as penas da lei que todas as informações prestadas e documentos anexados são verdadeiros e autênticos. Compreendo que a submissão criará um repositório oficial vinculado ao meu CPF e que a falsidade de informações implicará em sanções administrativas e legais.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-12 flex justify-between items-center pt-6 border-t border-gray-100">
          <div className="flex gap-4">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0 || loading}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            {!readOnly && (
              <button 
                type="button" 
                onClick={() => handleSubmit(true)} 
                disabled={loading}
                className="btn-secondary flex items-center gap-2 bg-surface-container-low text-on-surface-variant border-none"
              >
                Salvar Rascunho
              </button>
            )}
          </div>
          
          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={() => {
                if (currentStep === 0 && wordCount > 500) {
                  showToast('O resumo não pode ultrapassar 500 palavras.', 'error');
                  return;
                }
                setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1));
                window.scrollTo(0, 0);
              }}
              className="btn-primary flex items-center gap-2"
            >
              Próxima Etapa <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            !readOnly && (
              <button
                onClick={() => handleSubmit(false)}
                disabled={loading || !declarationAccepted}
                className="btn-primary flex items-center gap-2 text-lg py-4 px-8 shadow-xl"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                  <>Submeter Projeto Oficialmente <Check className="w-5 h-5" /></>
                )}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
