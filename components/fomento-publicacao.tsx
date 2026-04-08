'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, ArrowRight, Check, Upload, Search, Plus, Trash2, FileText } from 'lucide-react';
import { saveToLocal, getFromLocal } from '@/lib/local-storage';
import { formatCPF } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
import { uploadToGoogleDrive } from '@/lib/google-drive';

const GOOGLE_DRIVE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwuBZhMOrfMNzjkODqz-JE5Yu_3qTH94l5rP_Kd-UiwOzV8CWgPf3EuXxp4nvmyz92Y0w/exec';

const STEPS = ['Registro do Artigo', 'Upload de Documentos', 'Revisão Institucional'];

export default function FomentoPublicacao({ onBack, initialData, readOnly = false }: { onBack: () => void, initialData?: any, readOnly?: boolean }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data } = await supabase.from('researchers').select('*').eq('id', user.id).single();
        if (data) setUserProfile(data);
      }
    };
    fetchProfile();
  }, [user]);
  
  const [formData, setFormData] = useState({
    titulo: initialData?.titulo || '',
    revista: initialData?.revista || '',
    qualis: initialData?.qualis || '',
    valor_apc: initialData?.valor_apc || '',
    moeda: initialData?.moeda || 'USD',
  });

  const [autores, setAutores] = useState<any[]>(initialData?.autores || []);
  const [searchCpf, setSearchCpf] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [files, setFiles] = useState<{ artigo: File | null, resumo: File | null, aceite: File | null }>({
    artigo: null,
    resumo: null,
    aceite: null
  });

  // Initialize with current user as main author
  useState(() => {
    if (user && (!initialData || !initialData.autores || initialData.autores.length === 0)) {
      const profile = getFromLocal('researchers', 'uid', user.id)[0];
      if (profile) {
        setAutores([{ ...profile, papel: 'Autor Principal' }]);
      }
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'artigo' | 'resumo' | 'aceite') => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [type]: e.target.files![0] }));
    }
  };

  const handleSearchCpf = async () => {
    setSearchLoading(true);
    setSearchError('');
    setSearchResult(null);

    try {
      const results = getFromLocal('researchers_public', 'cpf', searchCpf);
      if (results && results.length > 0) {
        setSearchResult(results[0]);
      } else {
        setSearchError('Pesquisador não encontrado com este CPF.');
      }
    } catch (error) {
      setSearchError('Erro ao buscar pesquisador.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddAuthor = () => {
    if (searchResult && !autores.find(a => a.cpf === searchResult.cpf)) {
      setAutores([...autores, { ...searchResult, papel: 'Co-autor' }]);
      setSearchResult(null);
      setSearchCpf('');
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    if (!user || !userProfile) return;
    setLoading(true);

    try {
      let artigo_url = '';
      let resumo_url = '';
      let aceite_url = '';

      if (files.artigo) artigo_url = await uploadToGoogleDrive(files.artigo, userProfile.nome, userProfile.cpf, GOOGLE_DRIVE_SCRIPT_URL);
      if (files.resumo) resumo_url = await uploadToGoogleDrive(files.resumo, userProfile.nome, userProfile.cpf, GOOGLE_DRIVE_SCRIPT_URL);
      if (files.aceite) aceite_url = await uploadToGoogleDrive(files.aceite, userProfile.nome, userProfile.cpf, GOOGLE_DRIVE_SCRIPT_URL);

      const rawData = {
        ...formData,
        valor_apc: parseFloat(formData.valor_apc) || 0,
        autores,
        documentos: {
          artigo_url,
          resumo_url,
          aceite_url
        }
      };

      const projectData = {
        author_id: user.id,
        type: 'fomento_publicacao',
        status: isDraft ? 'Rascunho' : 'Em Análise',
        raw_data: rawData
      };

      let error;
      if (initialData?.id) {
        const { error: updateError } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', initialData.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('projects')
          .insert(projectData);
        error = insertError;
      }

      if (error) throw error;

      showToast(isDraft ? 'Rascunho salvo com sucesso!' : 'Solicitação de fomento para publicação submetida com sucesso!', 'success');
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error) {
      console.error('Error submitting publication funding:', error);
      showToast('Erro ao salvar. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 relative pb-24">
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-[100] px-6 py-3 rounded-xl shadow-lg text-white font-bold animate-in slide-in-from-top-4 ${toastMessage.type === 'success' ? 'bg-success' : 'bg-error'}`}>
          {toastMessage.message}
        </div>
      )}
      <header className="mb-12">
        <button onClick={onBack} className="flex items-center gap-2 text-primary font-bold text-sm mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
        </button>
        <h1 className="text-4xl font-bold text-on-surface mb-4">Fomento para Publicação</h1>
        <p className="text-lg text-on-surface-variant">
          Solicitação de custeio de taxas de publicação (APC).
        </p>
      </header>

      {/* Stepper */}
      <div className="flex flex-wrap gap-2 mb-8">
        {STEPS.map((step, index) => (
          <div
            key={step}
            className={`flex-1 py-3 px-4 rounded-md text-sm font-semibold text-center transition-colors ${
              index === currentStep
                ? 'bg-primary text-white'
                : index < currentStep
                ? 'bg-secondary text-white'
                : 'bg-surface-container-low text-on-surface-variant'
            }`}
          >
            {index + 1}. {step}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bento-card space-y-8">
        {currentStep === 0 && (
          <div className="space-y-8 animate-in fade-in">
            <div>
              <h2 className="text-2xl font-bold text-primary mb-2">Informações do Manuscrito</h2>
              <p className="text-sm text-on-surface-variant">Preencha cuidadosamente os detalhes fundamentais para a submissão e registro de sua pesquisa.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="label-text">Título Completo do Artigo</label>
                <input type="text" name="titulo" value={formData.titulo} onChange={handleInputChange} className="input-field" placeholder="Ex: Impactos da Inteligência Artificial..." required disabled={readOnly} />
              </div>

              <div>
                <label className="label-text">Revista Alvo (Target Journal)</label>
                <input type="text" name="revista" value={formData.revista} onChange={handleInputChange} className="input-field" placeholder="Nome da revista" required disabled={readOnly} />
              </div>

              <div>
                <label className="label-text">Valor Estimado do APC</label>
                <div className="flex gap-2">
                  <select name="moeda" value={formData.moeda} onChange={handleInputChange} className="input-field w-1/3" disabled={readOnly}>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="BRL">BRL (R$)</option>
                  </select>
                  <input type="number" name="valor_apc" value={formData.valor_apc} onChange={handleInputChange} min="0" step="0.01" className="input-field w-2/3" placeholder="0.00" required disabled={readOnly} />
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Lista de Autores</h3>
              </div>

              {!readOnly && (
                <div className="bg-surface-container-lowest p-6 rounded-lg border border-gray-200 mb-6">
                  <h4 className="font-bold text-sm mb-4">Adicionar Autor</h4>
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
                      {searchLoading ? 'Buscando...' : 'Buscar Autor'}
                    </button>
                  </div>

                  {searchError && (
                    <p className="text-red-500 text-sm mt-2 font-medium">{searchError}</p>
                  )}

                  {searchResult && (
                    <div className="mt-6 p-4 border border-primary/30 bg-primary/5 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
                      <div>
                        <h4 className="font-bold text-on-surface">{searchResult.nome}</h4>
                        <p className="text-sm text-on-surface-variant">CPF: {searchResult.cpf}</p>
                      </div>
                      <button type="button" onClick={handleAddAuthor} className="btn-secondary text-sm py-2 flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Adicionar Autor
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {autores.map((autor, index) => (
                  <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {autor.nome.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-on-surface text-sm">{autor.nome} {index === 0 && '(Você)'}</h4>
                      <p className="text-xs text-on-surface-variant">{autor.papel} • {autor.email_inst || autor.cpf}</p>
                    </div>
                    {!readOnly && index > 0 && (
                      <button type="button" onClick={() => setAutores(autores.filter((_, i) => i !== index))} className="text-on-surface-variant hover:text-red-500">
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
            <div>
              <h2 className="text-2xl font-bold text-primary mb-2">Upload de Documentos</h2>
              <p className="text-sm text-on-surface-variant">Por favor, anexe os arquivos necessários para a validação da sua submissão. Certifique-se de que os documentos estão em formato PDF.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <div className="border-2 border-dashed border-outline-variant/50 rounded-xl bg-surface-container-lowest p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative h-full min-h-[300px]">
                  <div className="absolute top-4 right-4 bg-surface-container-low text-xs font-bold px-2 py-1 rounded uppercase">Obrigatório</div>
                  <FileText className="w-12 h-12 text-primary mb-4 opacity-50" />
                  <h4 className="font-bold text-lg text-on-surface mb-2">Artigo Submetido (PDF)</h4>
                  <p className="text-sm text-on-surface-variant mb-6">Versão final do artigo para revisão técnica e publicação.</p>
                  
                  {!readOnly && (
                    <label className="btn-secondary cursor-pointer flex items-center gap-2">
                      <Upload className="w-4 h-4" /> Procurar no computador
                      <input
                        type="file"
                        onChange={(e) => handleFileChange(e, 'artigo')}
                        accept=".pdf"
                        className="hidden"
                        required
                      />
                    </label>
                  )}
                  {(files.artigo || (initialData?.documentos_json && JSON.parse(initialData.documentos_json).artigo)) && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-green-600 font-bold bg-green-50 px-4 py-2 rounded-full">
                      <Check className="w-4 h-4" /> {files.artigo?.name || 'artigo.pdf'}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="border border-gray-200 rounded-xl p-6 bg-white hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded bg-teal-50 text-teal-600 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-on-surface">Resumo (Abstract)</h4>
                      <p className="text-xs text-on-surface-variant">Máx. 500 palavras</p>
                    </div>
                  </div>
                  {!readOnly ? (
                    <label className="text-primary text-sm font-bold flex items-center justify-between cursor-pointer hover:underline">
                      {files.resumo ? <span className="text-green-600 flex items-center gap-1"><Check className="w-4 h-4"/> Anexado</span> : 'Anexar arquivo'}
                      {!files.resumo && <ArrowRight className="w-4 h-4" />}
                      <input type="file" onChange={(e) => handleFileChange(e, 'resumo')} accept=".pdf,.doc,.docx" className="hidden" />
                    </label>
                  ) : (
                    <div className="text-primary text-sm font-bold flex items-center justify-between">
                      {(files.resumo || (initialData?.documentos_json && JSON.parse(initialData.documentos_json).resumo)) ? <span className="text-green-600 flex items-center gap-1"><Check className="w-4 h-4"/> Anexado</span> : <span className="text-on-surface-variant">Não anexado</span>}
                    </div>
                  )}
                </div>

                <div className="border border-gray-200 rounded-xl p-6 bg-white hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded bg-yellow-50 text-yellow-600 flex items-center justify-center">
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-on-surface">Carta de Aceite</h4>
                      <p className="text-xs text-on-surface-variant">Documento institucional</p>
                    </div>
                  </div>
                  {!readOnly ? (
                    <label className="text-primary text-sm font-bold flex items-center justify-between cursor-pointer hover:underline">
                      {files.aceite ? <span className="text-green-600 flex items-center gap-1"><Check className="w-4 h-4"/> Anexado</span> : 'Anexar arquivo'}
                      {!files.aceite && <ArrowRight className="w-4 h-4" />}
                      <input type="file" onChange={(e) => handleFileChange(e, 'aceite')} accept=".pdf" className="hidden" />
                    </label>
                  ) : (
                    <div className="text-primary text-sm font-bold flex items-center justify-between">
                      {(files.aceite || (initialData?.documentos_json && JSON.parse(initialData.documentos_json).aceite)) ? <span className="text-green-600 flex items-center gap-1"><Check className="w-4 h-4"/> Anexado</span> : <span className="text-on-surface-variant">Não anexado</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-8 animate-in fade-in">
            <h2 className="text-2xl font-bold text-primary border-l-4 border-primary pl-4">Revisão Institucional</h2>
            <div className="bg-surface-container-lowest p-6 rounded-lg border border-gray-200">
              <h3 className="font-bold text-lg mb-4">Resumo da Solicitação</h3>
              <div className="space-y-4">
                <p><strong>Título:</strong> {formData.titulo}</p>
                <p><strong>Revista:</strong> {formData.revista}</p>
                <p><strong>Valor APC:</strong> {formData.moeda} {formData.valor_apc}</p>
                <p><strong>Autores:</strong> {autores.map(a => a.nome).join(', ')}</p>
                <p><strong>Documentos Anexados:</strong> {Object.values(files).filter(f => f !== null).length} arquivo(s)</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-6 border-t border-gray-100">
          <div className="flex gap-4">
            {currentStep > 0 && (
              <button type="button" onClick={prevStep} className="btn-secondary flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Anterior
              </button>
            )}
            {!readOnly && (
              <button 
                type="button" 
                onClick={(e) => handleSubmit(e, true)} 
                disabled={loading}
                className="btn-secondary flex items-center gap-2 bg-surface-container-low text-on-surface-variant border-none"
              >
                Salvar Rascunho
              </button>
            )}
          </div>
          
          {currentStep < STEPS.length - 1 ? (
            <button type="button" onClick={nextStep} className="btn-primary flex items-center gap-2">
              Próximo Passo <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            !readOnly && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, false)}
                disabled={loading}
                className="btn-primary flex items-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>Finalizar Submissão <Check className="w-4 h-4" /></>
                )}
              </button>
            )
          )}
        </div>
      </form>
    </div>
  );
}
