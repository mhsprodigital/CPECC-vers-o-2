'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Check, Upload } from 'lucide-react';
import { saveToLocal } from '@/lib/local-storage';
import { formatCPF } from '@/lib/formatters';
import { doc, getDoc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadToGoogleDrive } from '@/lib/google-drive';

const GOOGLE_DRIVE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwuBZhMOrfMNzjkODqz-JE5Yu_3qTH94l5rP_Kd-UiwOzV8CWgPf3EuXxp4nvmyz92Y0w/exec';

export default function Picite({ onBack, initialData, readOnly }: { onBack: () => void, initialData?: any, readOnly?: boolean }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const getDocStatus = (docName: string) => {
    if (!initialData) return null;
    
    // Check if uploaded based on the doc name
    let hasUrl = false;
    switch(docName) {
      case 'Plano de Trabalho': hasUrl = !!initialData?.raw_data?.plano_trabalho_url; break;
      case 'Seguro Acidentes': hasUrl = !!initialData?.raw_data?.seguro_url; break;
      case 'Termo de Compromisso': hasUrl = !!initialData?.raw_data?.termo_compromisso_url; break;
      case 'Documento Af/PcD': hasUrl = !!initialData?.raw_data?.doc_af_pcd_url; break;
      case 'Comprovante de Renda': hasUrl = !!initialData?.raw_data?.comprovante_renda_url; break;
      case 'Relatório Parcial': hasUrl = !!initialData?.raw_data?.relatorio_parcial_url; break;
      case 'Relatório Final': hasUrl = !!initialData?.raw_data?.relatorio_final_url; break;
    }

    if (!files[docName] && !hasUrl) return null;

    const docStatuses = initialData.raw_data?.document_statuses || {};
    const statusInfo = docStatuses[docName];

    if (statusInfo?.status === 'Rejeitado') {
      return { label: 'Inconsistência', color: 'bg-red-100 text-red-800', message: statusInfo.message, signedUrl: statusInfo.signedUrl };
    } else if (statusInfo?.status === 'Aprovado') {
      return { label: 'Aprovado', color: 'bg-green-100 text-green-800', signedUrl: statusInfo.signedUrl };
    }
    return { label: 'Em Análise', color: 'bg-yellow-100 text-yellow-800' };
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const docRef = doc(db, 'researchers', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setUserProfile(docSnap.data());
      }
    };
    fetchProfile();
  }, [user]);
  
  const [formData, setFormData] = useState({
    titulo_projeto: initialData?.raw_data?.titulo_projeto || '',
    processo_sei: initialData?.raw_data?.processo_sei || '',
    area_prioritaria_sus: initialData?.raw_data?.area_prioritaria_sus || '',
    numero_cep: initialData?.raw_data?.numero_cep || '',
    validade_cep: initialData?.raw_data?.validade_cep || '',

    // Orientador info that might need distinct mapping if not already in user_profile
    endereco_sei: initialData?.raw_data?.endereco_sei || '',

    // Aluno info
    nome_estudante: initialData?.raw_data?.nome_estudante || '',
    cpf_estudante: initialData?.raw_data?.cpf_estudante || '',
    email_estudante: initialData?.raw_data?.email_estudante || '',
    curso: initialData?.raw_data?.curso || 'Medicina (ESCS)',
    natureza_vinculo: initialData?.raw_data?.natureza_vinculo || 'Bolsista', // kept for backwards compatibility but we will use modalidade_bolsa
    modalidade_bolsa: initialData?.raw_data?.modalidade_bolsa || 'PIC (ESCS)',
    banco_estudante: initialData?.raw_data?.banco_estudante || '',
    agencia_estudante: initialData?.raw_data?.agencia_estudante || '',
    conta_estudante: initialData?.raw_data?.conta_estudante || '',
    submetido_sisbe: initialData?.raw_data?.submetido_sisbe || false,
    
    // Substituição info
    justificativa_substituicao: initialData?.raw_data?.justificativa_substituicao || '',
  });

  const [files, setFiles] = useState<{ [key: string]: File | null }>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let formattedValue: any = value;

    if (name === 'cpf_estudante') {
      formattedValue = formatCPF(value);
    } else if (type === 'checkbox') {
      formattedValue = (e.target as HTMLInputElement).checked;
    }

    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  const handleFileChange = (docName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [docName]: e.target.files![0] }));
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;
    setLoading(true);

    try {
      let plano_trabalho_url = initialData?.raw_data?.plano_trabalho_url || '';
      let seguro_url = initialData?.raw_data?.seguro_url || '';
      let termo_compromisso_url = initialData?.raw_data?.termo_compromisso_url || '';
      let doc_af_pcd_url = initialData?.raw_data?.doc_af_pcd_url || '';
      let comprovante_renda_url = initialData?.raw_data?.comprovante_renda_url || '';
      let relatorio_parcial_url = initialData?.raw_data?.relatorio_parcial_url || '';
      let relatorio_final_url = initialData?.raw_data?.relatorio_final_url || '';

      if (files['Plano de Trabalho']) plano_trabalho_url = await uploadToGoogleDrive(files['Plano de Trabalho'], userProfile.nome, userProfile.cpf, GOOGLE_DRIVE_SCRIPT_URL);
      if (files['Seguro Acidentes']) seguro_url = await uploadToGoogleDrive(files['Seguro Acidentes'], userProfile.nome, userProfile.cpf, GOOGLE_DRIVE_SCRIPT_URL);
      if (files['Termo de Compromisso']) termo_compromisso_url = await uploadToGoogleDrive(files['Termo de Compromisso'], userProfile.nome, userProfile.cpf, GOOGLE_DRIVE_SCRIPT_URL);
      if (files['Documento Af/PcD']) doc_af_pcd_url = await uploadToGoogleDrive(files['Documento Af/PcD'], userProfile.nome, userProfile.cpf, GOOGLE_DRIVE_SCRIPT_URL);
      if (files['Comprovante de Renda']) comprovante_renda_url = await uploadToGoogleDrive(files['Comprovante de Renda'], userProfile.nome, userProfile.cpf, GOOGLE_DRIVE_SCRIPT_URL);
      if (files['Relatório Parcial']) relatorio_parcial_url = await uploadToGoogleDrive(files['Relatório Parcial'], userProfile.nome, userProfile.cpf, GOOGLE_DRIVE_SCRIPT_URL);
      if (files['Relatório Final']) relatorio_final_url = await uploadToGoogleDrive(files['Relatório Final'], userProfile.nome, userProfile.cpf, GOOGLE_DRIVE_SCRIPT_URL);

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
      if (files['Plano de Trabalho']) delete documentStatuses['Plano de Trabalho'];
      if (files['Seguro Acidentes']) delete documentStatuses['Seguro Acidentes'];
      if (files['Termo de Compromisso']) delete documentStatuses['Termo de Compromisso'];
      if (files['Documento Af/PcD']) delete documentStatuses['Documento Af/PcD'];
      if (files['Comprovante de Renda']) delete documentStatuses['Comprovante de Renda'];

      const rawData = {
        ...currentRawData,
        ...formData,
        plano_trabalho_url,
        seguro_url,
        termo_compromisso_url,
        doc_af_pcd_url,
        comprovante_renda_url,
        relatorio_parcial_url,
        relatorio_final_url,
        document_statuses: documentStatuses
      };

      const isBolsista = formData.modalidade_bolsa !== 'Participação Voluntária';
      if (isBolsista && (!formData.banco_estudante || !formData.agencia_estudante || !formData.conta_estudante)) {
        showToast('Dados bancários são obrigatórios para bolsistas.', 'error');
        setLoading(false);
        return;
      }

      if (initialData?.id) {
        const docRef = doc(db, 'projects', initialData.id);
        const hasNewFiles = Object.keys(files).length > 0;
        await updateDoc(docRef, {
          status: hasNewFiles ? 'Pendente' : (initialData.status === 'Pendência' ? 'Pendente' : initialData.status),
          raw_data: JSON.stringify(rawData)
        });

        showToast('Projeto PICITE atualizado com sucesso!', 'success');
      } else {
        const newDocRef = doc(collection(db, 'projects'));
        await setDoc(newDocRef, {
          authorUid: user.uid,
          type: 'picite',
          status: 'Pendente',
          raw_data: JSON.stringify(rawData),
          createdAt: new Date().toISOString()
        });

        showToast('Projeto PICITE submetido com sucesso!', 'success');
      }

      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error) {
      console.error('Error submitting PICITE:', error);
      showToast('Erro ao submeter o projeto. Tente novamente.', 'error');
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
        <h1 className="text-4xl font-bold text-on-surface mb-4">PICITE - Iniciação Científica</h1>
        <p className="text-lg text-on-surface-variant">
          Cadastro de alunos e projetos de iniciação científica.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="bento-card space-y-8">
        <h2 className="text-2xl font-bold text-primary border-l-4 border-primary pl-4">Dados do Projeto e Estudante</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <h3 className="font-bold text-lg text-primary border-b border-outline-variant pb-2 mb-4">Gerenciamento do Projeto e Monitoramento Ético</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label-text">Título do Projeto Vinculado</label>
                <input type="text" name="titulo_projeto" value={formData.titulo_projeto} onChange={handleInputChange} className="input-field" placeholder="Ex: Estudo sobre..." required disabled={readOnly} />
              </div>
              <div>
                <label className="label-text">Status Ético (Aprovação CEP)</label>
                <input type="text" name="numero_cep" value={formData.numero_cep} onChange={handleInputChange} className="input-field" placeholder="Número do Parecer" disabled={readOnly} />
              </div>
              <div>
                <label className="label-text">Data de Validade (CEP)</label>
                <input type="date" name="validade_cep" value={formData.validade_cep} onChange={handleInputChange} className="input-field" disabled={readOnly} />
              </div>
              <div>
                <label className="label-text">Área Prioritária do SUS-DF</label>
                <input type="text" name="area_prioritaria_sus" value={formData.area_prioritaria_sus} onChange={handleInputChange} className="input-field" placeholder="Ex: Atenção Primária" disabled={readOnly} />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" id="submetido_sisbe" name="submetido_sisbe" checked={formData.submetido_sisbe} onChange={handleInputChange} disabled={readOnly} className="w-4 h-4 text-primary bg-surface-container border-outline-variant rounded" />
                <label htmlFor="submetido_sisbe" className="text-sm font-bold text-on-surface">Projeto Submetido ao SISBE</label>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 mt-6">
            <h3 className="font-bold text-lg text-primary border-b border-outline-variant pb-2 mb-4">Identificadores Institucionais para SEI</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-text">Processo SEI do Edital</label>
                <input type="text" name="processo_sei" value={formData.processo_sei} onChange={handleInputChange} className="input-field" placeholder="Ex: 00000-00000000/0000-00" disabled={readOnly} />
              </div>
              <div>
                <label className="label-text">Endereço SEI da Lotação (Orientador)</label>
                <input type="text" name="endereco_sei" value={formData.endereco_sei} onChange={handleInputChange} className="input-field" placeholder="Ex: SES/GAB/SVS..." disabled={readOnly} />
              </div>
            </div>
          </div>

          <div className="md:col-span-2 mt-6">
            <h3 className="font-bold text-lg text-primary border-b border-outline-variant pb-2 mb-4">Dados Complementares do Aluno</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label-text">Nome do Estudante</label>
                <input type="text" name="nome_estudante" value={formData.nome_estudante} onChange={handleInputChange} className="input-field" placeholder="Nome completo" required disabled={readOnly} />
              </div>
              <div>
                <label className="label-text">CPF do Estudante</label>
                <input type="text" name="cpf_estudante" value={formData.cpf_estudante} onChange={handleInputChange} className="input-field" placeholder="000.000.000-00" required disabled={readOnly} />
              </div>
              <div>
                <label className="label-text">E-mail do Estudante</label>
                <input type="email" name="email_estudante" value={formData.email_estudante} onChange={handleInputChange} className="input-field" placeholder="email@exemplo.com" required disabled={readOnly} />
              </div>
              <div>
                <label className="label-text">Curso e Instituição</label>
                <select name="curso" value={formData.curso} onChange={handleInputChange} className="input-field" required disabled={readOnly}>
                  <option value="Medicina (ESCS)">Medicina (ESCS)</option>
                  <option value="Enfermagem (ESCS)">Enfermagem (ESCS)</option>
                  <option value="Escolas Técnicas de Saúde (SES-DF)">Escolas Técnicas de Saúde (SES-DF)</option>
                </select>
              </div>
              <div>
                <label className="label-text">Modalidade de Bolsa</label>
                <select name="modalidade_bolsa" value={formData.modalidade_bolsa} onChange={handleInputChange} className="input-field" required disabled={readOnly}>
                  <option value="PIC (ESCS)">PIC (ESCS)</option>
                  <option value="PIC-Af (Ações Afirmativas)">PIC-Af (Ações Afirmativas)</option>
                  <option value="PIBIC (CNPq)">PIBIC (CNPq)</option>
                  <option value="PIBIC-Af">PIBIC-Af</option>
                  <option value="Participação Voluntária">Participação Voluntária</option>
                </select>
              </div>
            </div>
          </div>

          {formData.modalidade_bolsa !== 'Participação Voluntária' && (
            <div className="md:col-span-2">
              <h3 className="font-bold text-sm mt-4 mb-2">Dados Bancários do Estudante (Obrigatório)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label-text">Banco</label>
                  <input type="text" name="banco_estudante" value={formData.banco_estudante} onChange={handleInputChange} className="input-field" placeholder="Ex: Banco do Brasil" required disabled={readOnly} />
                </div>
                <div>
                  <label className="label-text">Agência</label>
                  <input type="text" name="agencia_estudante" value={formData.agencia_estudante} onChange={handleInputChange} className="input-field" placeholder="0000-0" required disabled={readOnly} />
                </div>
                <div>
                  <label className="label-text">Conta</label>
                  <input type="text" name="conta_estudante" value={formData.conta_estudante} onChange={handleInputChange} className="input-field" placeholder="00000-0" required disabled={readOnly} />
                </div>
              </div>
            </div>
          )}

          <div className="md:col-span-2">
            <h3 className="font-bold text-lg text-primary border-b border-outline-variant pb-2 mb-4 mt-6">Substituição do Bolsista</h3>
            <label className="label-text">Justificativa de Substituição</label>
            <textarea 
              name="justificativa_substituicao" 
              value={formData.justificativa_substituicao} 
              onChange={handleInputChange} 
              className="input-field w-full min-h-[100px] py-2" 
              placeholder="Descreva o motivo caso seja uma substituição ou desistência ao longo do ciclo..." 
              disabled={readOnly} 
            />
          </div>

          <div className="md:col-span-2 mt-8">
            <h3 className="font-bold text-lg text-primary border-b border-outline-variant pb-2 mb-4">Documentação e Relatórios</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Document 1: Plano de Trabalho */}
              <div className={`border border-outline-variant rounded-xl bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center transition-colors relative ${readOnly ? 'opacity-70' : 'hover:border-primary/50'}`}>
                <Upload className="w-8 h-8 text-primary mb-3 opacity-50" />
                <h4 className="font-bold text-on-surface mb-1">Plano de Trabalho</h4>
                <p className="text-[10px] text-on-surface-variant mb-4">Obrigatório.</p>
                {(() => {
                  const status = getDocStatus('Plano de Trabalho');
                  if (status) return (
                    <div className="w-full flex items-center flex-col mt-auto text-center">
                      <div className={`mb-2 px-2 py-0.5 rounded text-[10px] uppercase font-bold ${status.color}`}>{status.label}</div>
                      {status.message && <div className="text-[10px] text-red-600 bg-red-100 p-1.5 flex-1 rounded mb-2 w-full text-left line-clamp-2" title={status.message}>{status.message}</div>}
                    </div>
                  );
                  return null;
                })()}
                {!readOnly && (
                  <input
                    type="file"
                    accept=".pdf,.png,.jpeg,.jpg"
                    onChange={(e) => handleFileChange('Plano de Trabalho', e)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                )}
                {files['Plano de Trabalho'] && <p className="text-xs text-primary font-bold mt-2 truncate w-full">{files['Plano de Trabalho']?.name}</p>}
                {!files['Plano de Trabalho'] && initialData?.raw_data?.plano_trabalho_url && <a href={initialData.raw_data.plano_trabalho_url} target="_blank" rel="noreferrer" className="text-xs text-secondary hover:underline mt-2 z-10 w-full truncate">Arquivo Atual</a>}
              </div>

              {/* Document 2: Seguro Acidentes */}
              <div className={`border border-outline-variant rounded-xl bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center transition-colors relative ${readOnly ? 'opacity-70' : 'hover:border-primary/50'}`}>
                <Upload className="w-8 h-8 text-primary mb-3 opacity-50" />
                <h4 className="font-bold text-on-surface mb-1">Apólice de Seguro</h4>
                <p className="text-[10px] text-on-surface-variant mb-4">Obrigatório. Acidentes Pessoais.</p>
                {(() => {
                  const status = getDocStatus('Seguro Acidentes');
                  if (status) return (
                    <div className="w-full flex items-center flex-col mt-auto text-center">
                      <div className={`mb-2 px-2 py-0.5 rounded text-[10px] uppercase font-bold ${status.color}`}>{status.label}</div>
                      {status.message && <div className="text-[10px] text-red-600 bg-red-100 p-1.5 flex-1 rounded mb-2 w-full text-left line-clamp-2" title={status.message}>{status.message}</div>}
                    </div>
                  );
                  return null;
                })()}
                {!readOnly && (
                  <input
                    type="file"
                    accept=".pdf,.png,.jpeg,.jpg"
                    onChange={(e) => handleFileChange('Seguro Acidentes', e)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                )}
                {files['Seguro Acidentes'] && <p className="text-xs text-primary font-bold mt-2 truncate w-full">{files['Seguro Acidentes']?.name}</p>}
                {!files['Seguro Acidentes'] && initialData?.raw_data?.seguro_url && <a href={initialData.raw_data.seguro_url} target="_blank" rel="noreferrer" className="text-xs text-secondary hover:underline mt-2 z-10 w-full truncate">Arquivo Atual</a>}
              </div>

              {/* Document 3: Termo de Compromisso */}
              <div className={`border border-outline-variant rounded-xl bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center transition-colors relative ${readOnly ? 'opacity-70' : 'hover:border-primary/50'}`}>
                <Upload className="w-8 h-8 text-primary mb-3 opacity-50" />
                <h4 className="font-bold text-on-surface mb-1">Termo de Compromisso</h4>
                <p className="text-[10px] text-on-surface-variant mb-4">Assinado orientador e aluno.</p>
                {(() => {
                  const status = getDocStatus('Termo de Compromisso');
                  if (status) return (
                    <div className="w-full flex items-center flex-col mt-auto text-center">
                      <div className={`mb-2 px-2 py-0.5 rounded text-[10px] uppercase font-bold ${status.color}`}>{status.label}</div>
                      {status.message && <div className="text-[10px] text-red-600 bg-red-100 p-1.5 flex-1 rounded mb-2 w-full text-left line-clamp-2" title={status.message}>{status.message}</div>}
                    </div>
                  );
                  return null;
                })()}
                {!readOnly && (
                  <input
                    type="file"
                    accept=".pdf,.png,.jpeg,.jpg"
                    onChange={(e) => handleFileChange('Termo de Compromisso', e)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                )}
                {files['Termo de Compromisso'] && <p className="text-xs text-primary font-bold mt-2 truncate w-full">{files['Termo de Compromisso']?.name}</p>}
                {!files['Termo de Compromisso'] && initialData?.raw_data?.termo_compromisso_url && <a href={initialData.raw_data.termo_compromisso_url} target="_blank" rel="noreferrer" className="text-xs text-secondary hover:underline mt-2 z-10 w-full truncate">Arquivo Atual</a>}
              </div>
              
              {/* Conditional Docs for Ações Afirmativas / PcD */}
              {formData.modalidade_bolsa.includes('Af') && (
                <div className={`border border-outline-variant rounded-xl bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center transition-colors relative ${readOnly ? 'opacity-70' : 'hover:border-primary/50'}`}>
                  <Upload className="w-8 h-8 text-primary mb-3 opacity-50" />
                  <h4 className="font-bold text-on-surface mb-1">Documentações Afirmativas</h4>
                  <p className="text-[10px] text-on-surface-variant mb-4">Autodeclaração / Laudo PcD / Renda</p>
                  {(() => {
                    const status = getDocStatus('Documento Af/PcD');
                    if (status) return (
                      <div className="w-full flex items-center flex-col mt-auto text-center">
                        <div className={`mb-2 px-2 py-0.5 rounded text-[10px] uppercase font-bold ${status.color}`}>{status.label}</div>
                      </div>
                    );
                    return null;
                  })()}
                  {!readOnly && (
                    <input
                      type="file"
                      accept=".pdf,.png,.jpeg,.jpg"
                      onChange={(e) => handleFileChange('Documento Af/PcD', e)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  )}
                  {files['Documento Af/PcD'] && <p className="text-xs text-primary font-bold mt-2 truncate w-full">{files['Documento Af/PcD']?.name}</p>}
                  {!files['Documento Af/PcD'] && initialData?.raw_data?.doc_af_pcd_url && <a href={initialData.raw_data.doc_af_pcd_url} target="_blank" rel="noreferrer" className="text-xs text-secondary hover:underline mt-2 z-10 w-full truncate">Arquivo Atual</a>}
                </div>
              )}

              {/* Relatórios */}
              {initialData?.status === 'Em Execução' && (
                <>
                  <div className={`border border-outline-variant rounded-xl bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center transition-colors relative ${readOnly ? 'opacity-70' : 'hover:border-primary/50'}`}>
                    <Upload className="w-8 h-8 text-primary mb-3 opacity-50" />
                    <h4 className="font-bold text-on-surface mb-1">Relatório Parcial</h4>
                    <p className="text-[10px] text-on-surface-variant mb-4">Dez/Abril</p>
                    {!readOnly && (
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileChange('Relatório Parcial', e)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    )}
                    {files['Relatório Parcial'] && <p className="text-xs text-primary font-bold mt-2 truncate w-full">{files['Relatório Parcial']?.name}</p>}
                    {!files['Relatório Parcial'] && initialData?.raw_data?.relatorio_parcial_url && <a href={initialData.raw_data.relatorio_parcial_url} target="_blank" rel="noreferrer" className="text-xs text-secondary hover:underline mt-2 z-10 w-full truncate">Arquivo Atual</a>}
                  </div>
                  
                  <div className={`border border-outline-variant rounded-xl bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center transition-colors relative ${readOnly ? 'opacity-70' : 'hover:border-primary/50'}`}>
                    <Upload className="w-8 h-8 text-primary mb-3 opacity-50" />
                    <h4 className="font-bold text-on-surface mb-1">Relatório Final</h4>
                    <p className="text-[10px] text-on-surface-variant mb-4">No fechamento do projeto</p>
                    {!readOnly && (
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileChange('Relatório Final', e)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    )}
                    {files['Relatório Final'] && <p className="text-xs text-primary font-bold mt-2 truncate w-full">{files['Relatório Final']?.name}</p>}
                    {!files['Relatório Final'] && initialData?.raw_data?.relatorio_final_url && <a href={initialData.raw_data.relatorio_final_url} target="_blank" rel="noreferrer" className="text-xs text-secondary hover:underline mt-2 z-10 w-full truncate">Arquivo Atual</a>}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {!readOnly && (
          <div className="flex justify-end pt-6 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>Submeter PICITE <Check className="w-4 h-4" /></>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
