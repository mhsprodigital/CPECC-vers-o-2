'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Check, ChevronRight, ChevronLeft, Upload } from 'lucide-react';
import { mockUploadFile } from '@/lib/local-storage';
import { formatCPF, formatPhone, formatCEP } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';

const STEPS = [
  'Dados Pessoais',
  'Dados Institucionais',
  'Formação Acadêmica',
  'Características Sociodemográficas',
  'Documentação Comprobatória',
];

export default function Onboarding({ onComplete, initialData }: { onComplete: () => void, initialData?: any }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>(initialData || {
    nome: user?.user_metadata?.full_name || '',
    email_inst: user?.email || '',
  });
  const [historicoFormacao, setHistoricoFormacao] = useState<any[]>(initialData?.historico_formacao || []);
  const [files, setFiles] = useState<Record<string, File>>({});

  const handleAddFormacao = () => {
    setHistoricoFormacao([...historicoFormacao, { instituicao: '', titulo: '', nivel: '', data_conclusao: '' }]);
  };

  const handleFormacaoChange = (index: number, field: string, value: string) => {
    const newHistorico = [...historicoFormacao];
    newHistorico[index][field] = value;
    setHistoricoFormacao(newHistorico);
  };

  const handleRemoveFormacao = (index: number) => {
    const newHistorico = [...historicoFormacao];
    newHistorico.splice(index, 1);
    setHistoricoFormacao(newHistorico);
  };

  const calculateProgress = () => {
    const requiredFields = [
      'nome', 'cpf', 'data_nascimento', 'email_inst', 'email_pessoal', 'telefone', 'cep', 'logradouro', 'cidade', 'uf',
      'vinculo', 'matricula', 'carga_horaria', 'regional', 'lotacao', 'tipo_unidade', 'setor', 'endereco_sei', 'cep_inst', 'endereco_inst',
      'graduacao', 'titulacao', 'area', 'lattes',
      'genero', 'raca', 'ensino_medio', 'beneficiario', 'pcd'
    ];
    let filled = 0;
    requiredFields.forEach(field => {
      if (formData[field] && formData[field].trim() !== '') filled++;
    });
    
    const docFields = ['doc_rg', 'doc_cpf', 'doc_civil', 'doc_eleitor', 'doc_militar', 'doc_residencia', 'doc_vacina', 'doc_diploma', 'doc_hist_escolar', 'doc_estrangeiro', 'doc_ingles', 'doc_vinculo'];
    let docsFilled = 0;
    let uploadedDocs: any = {};
    try {
      uploadedDocs = initialData?.documentos_json ? JSON.parse(initialData.documentos_json) : {};
    } catch (e) {}
    
    docFields.forEach(doc => {
      if (files[doc] || uploadedDocs[doc]) docsFilled++;
    });

    const totalFields = requiredFields.length + docFields.length;
    const totalFilled = filled + docsFilled;
    
    return Math.round((totalFilled / totalFields) * 100);
  };

  const getDocStatus = (docId: string) => {
    if (files[docId]) return { label: 'Pronto para envio', color: 'bg-blue-100 text-blue-800' };
    
    let uploadedDocs: any = {};
    try {
      uploadedDocs = initialData?.documentos_json ? JSON.parse(initialData.documentos_json) : {};
    } catch (e) {}

    if (uploadedDocs[docId]) {
      // Mocking a pending status for demonstration
      if (docId === 'doc_rg' && initialData?.status === 'Pendente') {
        return { label: 'Inconsistência', color: 'bg-red-100 text-red-800' };
      }
      return { label: 'Em Análise', color: 'bg-yellow-100 text-yellow-800' };
    }
    
    return { label: 'Pendente de Envio', color: 'bg-gray-100 text-gray-800' };
  };

  const progress = calculateProgress();

  const [toastMessage, setToastMessage] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cpf') {
      formattedValue = formatCPF(value);
    } else if (name === 'telefone' || name === 'whatsapp') {
      formattedValue = formatPhone(value);
    } else if (name === 'cep' || name === 'cep_inst') {
      formattedValue = formatCEP(value);
    }

    setFormData((prev: any) => ({ ...prev, [name]: formattedValue }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles && selectedFiles[0]) {
      setFiles((prev) => ({ ...prev, [name]: selectedFiles[0] }));
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

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Upload files
      const uploadedDocs: Record<string, string> = {};
      for (const [key, file] of Object.entries(files)) {
        const url = await mockUploadFile(file);
        uploadedDocs[key] = url;
      }

      // Save profile to Supabase
      const rawData = {
        ...initialData,
        ...formData,
        historico_formacao: historicoFormacao,
        foto_perfil: uploadedDocs['foto_perfil'] || initialData?.foto_perfil,
        documentos_json: Object.keys(uploadedDocs).length > 0 ? JSON.stringify(uploadedDocs) : initialData?.documentos_json,
      };

      const hasNewDocs = Object.keys(uploadedDocs).length > 0;
      const newStatus = hasNewDocs ? 'Pendente' : (initialData?.status || 'Ativo');

      const { error } = await supabase
        .from('researchers')
        .upsert({
          id: user.id,
          nome: formData.nome || '',
          cpf: formData.cpf || '',
          email_inst: formData.email_inst || '',
          titulacao: formData.titulacao || '',
          lattes: formData.lattes || '',
          status: newStatus,
          raw_data: rawData
        });

      if (error) throw error;

      onComplete();
    } catch (error) {
      console.error('Error saving profile:', error);
      showToast('Erro ao salvar o perfil. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface py-12 px-4 sm:px-6 lg:px-8">
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-[100] px-6 py-3 rounded-xl shadow-lg text-white font-bold animate-in slide-in-from-top-4 ${toastMessage.type === 'success' ? 'bg-success' : 'bg-error'}`}>
          {toastMessage.message}
        </div>
      )}
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Perfil do Pesquisador</h1>
          <p className="text-on-surface-variant mb-4">
            Complete seu cadastro para acessar o portal.
          </p>
          
          <div className="bg-surface-container-low p-4 rounded-xl mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-on-surface">Progresso do Perfil</span>
              <span className="text-sm font-bold text-primary">{progress}%</span>
            </div>
            <div className="w-full bg-surface-container rounded-full h-2.5">
              <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>

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

        {/* Form Content */}
        <div className="bento-card mb-8">
          {currentStep === 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-bold text-primary border-l-4 border-primary pl-3">Dados Pessoais & Contato</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="label-text">Foto do Pesquisador</label>
                  <input
                    type="file"
                    name="foto_perfil"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label-text">Nome Completo</label>
                  <input type="text" name="nome" value={formData.nome || ''} onChange={handleInputChange} className="input-field" required />
                </div>
                <div>
                  <label className="label-text">CPF</label>
                  <input type="text" name="cpf" value={formData.cpf || ''} onChange={handleInputChange} className="input-field" placeholder="000.000.000-00" required />
                </div>
                <div>
                  <label className="label-text">Data de Nascimento</label>
                  <input type="date" name="nascimento" value={formData.nascimento || ''} onChange={handleInputChange} className="input-field" required />
                </div>
                
                <div className="md:col-span-2 mt-4">
                  <h3 className="text-lg font-bold text-secondary">Informações de Contato</h3>
                </div>
                <div>
                  <label className="label-text">E-mail Institucional</label>
                  <input type="email" name="email_inst" value={formData.email_inst || ''} onChange={handleInputChange} className="input-field" required />
                </div>
                <div>
                  <label className="label-text">E-mail Pessoal</label>
                  <input type="email" name="email_pess" value={formData.email_pess || ''} onChange={handleInputChange} className="input-field" />
                </div>
                <div>
                  <label className="label-text">Telefone Principal</label>
                  <input type="text" name="telefone" value={formData.telefone || ''} onChange={handleInputChange} className="input-field" required />
                </div>
                <div>
                  <label className="label-text">WhatsApp</label>
                  <input type="text" name="whatsapp" value={formData.whatsapp || ''} onChange={handleInputChange} className="input-field" />
                </div>

                <div className="md:col-span-2 mt-4">
                  <h3 className="text-lg font-bold text-secondary">Endereço de Correspondência</h3>
                </div>
                <div>
                  <label className="label-text">CEP</label>
                  <input type="text" name="cep" value={formData.cep || ''} onChange={handleInputChange} className="input-field" placeholder="00000-000" required />
                </div>
                <div className="md:col-span-2">
                  <label className="label-text">Logradouro</label>
                  <input type="text" name="logradouro" value={formData.logradouro || ''} onChange={handleInputChange} className="input-field" required />
                </div>
                <div>
                  <label className="label-text">Cidade</label>
                  <input type="text" name="cidade" value={formData.cidade || ''} onChange={handleInputChange} className="input-field" required />
                </div>
                <div>
                  <label className="label-text">UF</label>
                  <input type="text" name="uf" value={formData.uf || ''} onChange={handleInputChange} className="input-field" maxLength={2} required />
                </div>
                <div className="md:col-span-2">
                  <label className="label-text">Complemento</label>
                  <input type="text" name="complemento" value={formData.complemento || ''} onChange={handleInputChange} className="input-field" />
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-bold text-primary border-l-4 border-primary pl-3">Vínculo Institucional</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label-text">Vínculo Empregatício</label>
                  <select name="vinculo" value={formData.vinculo || ''} onChange={handleInputChange} className="input-field" required>
                    <option value="">Selecione...</option>
                    <option value="Servidor">Servidor</option>
                    <option value="Estudante">Estudante</option>
                    <option value="Externo">Externo</option>
                  </select>
                </div>
                <div>
                  <label className="label-text">Matrícula</label>
                  <input type="text" name="matricula" value={formData.matricula || ''} onChange={handleInputChange} className="input-field" required />
                </div>
                <div>
                  <label className="label-text">Carga Horária para Pesquisa (h/sem)</label>
                  <input type="number" name="carga_horaria" value={formData.carga_horaria || ''} onChange={handleInputChange} className="input-field" required />
                </div>
                <div>
                  <label className="label-text">Regional de Saúde</label>
                  <select name="regional" value={formData.regional || ''} onChange={handleInputChange} className="input-field" required>
                    <option value="">Selecione...</option>
                    <option value="Central">Central</option>
                    <option value="Centro-Sul">Centro-Sul</option>
                    <option value="Sul">Sul</option>
                    <option value="Sudoeste">Sudoeste</option>
                    <option value="Oeste">Oeste</option>
                    <option value="Leste">Leste</option>
                    <option value="Norte">Norte</option>
                  </select>
                </div>
                <div>
                  <label className="label-text">Lotação/Unidade</label>
                  <input type="text" name="lotacao" value={formData.lotacao || ''} onChange={handleInputChange} className="input-field" required />
                </div>
                <div>
                  <label className="label-text">Tipo de Unidade de Saúde</label>
                  <input type="text" name="tipo_unidade_saude" value={formData.tipo_unidade_saude || ''} onChange={handleInputChange} className="input-field" required />
                </div>
                <div>
                  <label className="label-text">Setor Específico de Lotação</label>
                  <input type="text" name="setor_lotacao" value={formData.setor_lotacao || ''} onChange={handleInputChange} className="input-field" required />
                </div>
                <div>
                  <label className="label-text">Endereço SEI (Processo Oficial)</label>
                  <input type="text" name="endereco_sei" value={formData.endereco_sei || ''} onChange={handleInputChange} className="input-field" placeholder="00000-00000000/0000-00" required />
                </div>
                
                <div className="md:col-span-2 mt-4">
                  <h3 className="text-lg font-bold text-secondary">Endereço da Instituição</h3>
                </div>
                <div>
                  <label className="label-text">CEP da Instituição</label>
                  <input type="text" name="cep_inst" value={formData.cep_inst || ''} onChange={handleInputChange} className="input-field" placeholder="00000-000" required />
                </div>
                <div className="md:col-span-2">
                  <label className="label-text">Endereço da Instituição</label>
                  <input type="text" name="endereco_inst" value={formData.endereco_inst || ''} onChange={handleInputChange} className="input-field" required />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-bold text-primary border-l-4 border-primary pl-3">Formação Acadêmica</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label-text">Graduação</label>
                  <input type="text" name="graduacao" value={formData.graduacao || ''} onChange={handleInputChange} className="input-field" required />
                </div>
                <div>
                  <label className="label-text">Maior Titulação</label>
                  <select name="titulacao" value={formData.titulacao || ''} onChange={handleInputChange} className="input-field" required>
                    <option value="">Selecione...</option>
                    <option value="Graduação">Graduação</option>
                    <option value="Especialização">Especialização</option>
                    <option value="Mestrado">Mestrado</option>
                    <option value="Doutorado">Doutorado</option>
                    <option value="Pós-Doutorado">Pós-Doutorado</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label-text">Área de Conhecimento (CNPq)</label>
                  <select name="area" value={formData.area || ''} onChange={handleInputChange} className="input-field" required>
                    <option value="">Selecione...</option>
                    <option value="Ciências da Saúde">Ciências da Saúde</option>
                    <option value="Ciências Biológicas">Ciências Biológicas</option>
                    <option value="Ciências Exatas e da Terra">Ciências Exatas e da Terra</option>
                    <option value="Engenharias e Tecnologia">Engenharias e Tecnologia</option>
                    <option value="Ciências Agrárias">Ciências Agrárias</option>
                    <option value="Ciências Sociais Aplicadas">Ciências Sociais Aplicadas</option>
                    <option value="Ciências Humanas">Ciências Humanas</option>
                    <option value="Linguística, Letras e Artes">Linguística, Letras e Artes</option>
                    <option value="Multidisciplinar / Outras">Multidisciplinar / Outras</option>
                  </select>
                </div>
                
                <div className="md:col-span-2 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-secondary">Histórico de Formação</h3>
                    <button type="button" onClick={handleAddFormacao} className="btn-secondary text-xs py-1 px-3">
                      + Adicionar Formação
                    </button>
                  </div>
                  
                  {historicoFormacao.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-outline-variant rounded-xl">
                      <p className="text-sm text-on-surface-variant">Nenhuma formação adicionada.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {historicoFormacao.map((formacao, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-surface-container-lowest border border-outline-variant/30 rounded-lg relative">
                          <div className="md:col-span-4">
                            <label className="label-text text-xs">Instituição</label>
                            <input type="text" value={formacao.instituicao} onChange={(e) => handleFormacaoChange(index, 'instituicao', e.target.value)} className="input-field py-2" required />
                          </div>
                          <div className="md:col-span-3">
                            <label className="label-text text-xs">Título da Formação</label>
                            <input type="text" value={formacao.titulo} onChange={(e) => handleFormacaoChange(index, 'titulo', e.target.value)} className="input-field py-2" required />
                          </div>
                          <div className="md:col-span-3">
                            <label className="label-text text-xs">Nível</label>
                            <select value={formacao.nivel} onChange={(e) => handleFormacaoChange(index, 'nivel', e.target.value)} className="input-field py-2" required>
                              <option value="">Selecione...</option>
                              <option value="Graduação">Graduação</option>
                              <option value="Especialização">Especialização</option>
                              <option value="Mestrado">Mestrado</option>
                              <option value="Doutorado">Doutorado</option>
                              <option value="Pós-Doutorado">Pós-Doutorado</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="label-text text-xs">Data de Conclusão</label>
                            <input type="date" value={formacao.data_conclusao} onChange={(e) => handleFormacaoChange(index, 'data_conclusao', e.target.value)} className="input-field py-2" required />
                          </div>
                          <button type="button" onClick={() => handleRemoveFormacao(index)} className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1 shadow-sm hover:bg-red-50">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 mt-4">
                  <h3 className="text-lg font-bold text-secondary">Identificadores</h3>
                </div>
                <div className="md:col-span-2">
                  <label className="label-text">Link do Currículo Lattes</label>
                  <input type="url" name="lattes" value={formData.lattes || ''} onChange={handleInputChange} className="input-field" required />
                </div>
                <div>
                  <label className="label-text">ORCID ID</label>
                  <input type="text" name="orcid" value={formData.orcid || ''} onChange={handleInputChange} className="input-field" placeholder="0000-0000-0000-0000" />
                </div>
                <div>
                  <label className="label-text">ORCID Link</label>
                  <input type="url" name="orcid_link" value={formData.orcid_link || ''} onChange={handleInputChange} className="input-field" placeholder="https://orcid.org/..." />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-bold text-primary border-l-4 border-primary pl-3">Características Sociodemográficas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label-text">Gênero</label>
                  <select name="genero" value={formData.genero || ''} onChange={handleInputChange} className="input-field" required>
                    <option value="">Selecione...</option>
                    <option value="Mulher Cis">Mulher Cis</option>
                    <option value="Homem Cis">Homem Cis</option>
                    <option value="Mulher Trans">Mulher Trans</option>
                    <option value="Homem Trans">Homem Trans</option>
                    <option value="Não-binário">Não-binário</option>
                    <option value="Prefiro não informar">Prefiro não informar</option>
                  </select>
                </div>
                <div>
                  <label className="label-text">Raça/Cor</label>
                  <select name="raca" value={formData.raca || ''} onChange={handleInputChange} className="input-field" required>
                    <option value="">Selecione...</option>
                    <option value="Branca">Branca</option>
                    <option value="Preta">Preta</option>
                    <option value="Parda">Parda</option>
                    <option value="Amarela">Amarela</option>
                    <option value="Indígena">Indígena</option>
                    <option value="Prefiro não informar">Prefiro não informar</option>
                  </select>
                </div>
                <div>
                  <label className="label-text">Instituição de Conclusão do Ensino Médio</label>
                  <select name="ensino_medio" value={formData.ensino_medio || ''} onChange={handleInputChange} className="input-field" required>
                    <option value="">Selecione...</option>
                    <option value="Pública">Somente Pública</option>
                    <option value="Privada">Somente Privada</option>
                    <option value="Mista">Mista</option>
                  </select>
                </div>
                <div>
                  <label className="label-text">Beneficiário de Algum programa do Governo</label>
                  <select name="beneficiario" value={formData.beneficiario || ''} onChange={handleInputChange} className="input-field" required>
                    <option value="">Selecione...</option>
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label-text">É portador de Necessidades Especiais?</label>
                  <select name="pcd" value={formData.pcd || ''} onChange={handleInputChange} className="input-field" required>
                    <option value="">Selecione...</option>
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>
                </div>
                {formData.pcd === 'Sim' && (
                  <div className="md:col-span-2">
                    <label className="label-text">Qual a limitação ou deficiência?</label>
                    <input type="text" name="pcd_detalhe" value={formData.pcd_detalhe || ''} onChange={handleInputChange} className="input-field" />
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-bold text-primary border-l-4 border-primary pl-3">Documentação Comprobatória</h2>
              <p className="text-sm text-tertiary mb-6">
                Faça o upload dos documentos abaixo. Formatos aceitos: PDF, JPG, PNG.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'doc_rg', label: 'Registro Geral (RG)' },
                  { id: 'doc_cpf', label: 'Cadastro de Pessoa Física (CPF)' },
                  { id: 'doc_civil', label: 'Registro Civil' },
                  { id: 'doc_eleitor', label: 'Título de Eleitor' },
                  { id: 'doc_militar', label: 'Certificado de Quitação Militar' },
                  { id: 'doc_residencia', label: 'Comprovante de Residência' },
                  { id: 'doc_vacina', label: 'Comprovante de Vacinação' },
                  { id: 'doc_diploma', label: 'Diploma de Graduação' },
                  { id: 'doc_hist_escolar', label: 'Histórico Escolar' },
                  { id: 'doc_estrangeiro', label: 'Estrangeiros (RNM/PASSAPORTE)' },
                  { id: 'doc_ingles', label: 'Comprovante de Proficiência em Inglês' },
                  { id: 'doc_vinculo', label: 'Comprovante de Vínculo Institucional' },
                ].map((doc) => {
                  const status = getDocStatus(doc.id);
                  return (
                    <div key={doc.id} className={`bg-surface-container-lowest p-4 rounded-lg border ${status.label === 'Inconsistência' ? 'border-red-300 bg-red-50/50' : 'border-gray-200'} flex flex-col gap-3`}>
                      <div className="flex justify-between items-start">
                        <label className="font-semibold text-sm text-on-surface">{doc.label}</label>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          name={doc.id}
                          onChange={handleFileChange}
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer w-full"
                        />
                        {files[doc.id] && <Check className="text-green-600 w-5 h-5 flex-shrink-0" />}
                      </div>
                      {status.label === 'Inconsistência' && (
                        <p className="text-xs text-red-600 mt-1">
                          Documento ilegível ou incorreto. Por favor, reenvie.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={currentStep === 0 || loading}
            className="btn-secondary flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          
          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={nextStep}
              className="btn-primary flex items-center gap-2"
            >
              Próxima Etapa <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>Finalizar Cadastro <Check className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
