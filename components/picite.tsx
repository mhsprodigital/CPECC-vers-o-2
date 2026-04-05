'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Check, Upload } from 'lucide-react';
import { saveToLocal, mockUploadFile } from '@/lib/local-storage';
import { formatCPF } from '@/lib/formatters';

export default function Picite({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo_projeto: '',
    nome_estudante: '',
    cpf_estudante: '',
    email_estudante: '',
    curso: '',
    natureza_vinculo: 'Bolsista',
    banco_estudante: '',
    agencia_estudante: '',
    conta_estudante: '',
  });

  const [file, setFile] = useState<File | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cpf_estudante') {
      formattedValue = formatCPF(value);
    }

    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      let plano_trabalho_url = '';
      if (file) {
        plano_trabalho_url = await mockUploadFile(file);
      }

      const projectData = {
        ...formData,
        authorUid: user.uid,
        plano_trabalho_url,
        status: 'Em Análise',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveToLocal('picite', projectData);
      
      alert('Projeto PICITE submetido com sucesso!');
      onBack();
    } catch (error) {
      console.error('Error submitting PICITE:', error);
      alert('Erro ao submeter o projeto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4">
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
            <label className="label-text">Título do Projeto Vinculado</label>
            <input type="text" name="titulo_projeto" value={formData.titulo_projeto} onChange={handleInputChange} className="input-field" placeholder="Ex: Estudo sobre..." required />
          </div>

          <div>
            <label className="label-text">Nome do Estudante</label>
            <input type="text" name="nome_estudante" value={formData.nome_estudante} onChange={handleInputChange} className="input-field" placeholder="Nome completo" required />
          </div>

          <div>
            <label className="label-text">CPF do Estudante</label>
            <input type="text" name="cpf_estudante" value={formData.cpf_estudante} onChange={handleInputChange} className="input-field" placeholder="000.000.000-00" required />
          </div>

          <div>
            <label className="label-text">E-mail do Estudante</label>
            <input type="email" name="email_estudante" value={formData.email_estudante} onChange={handleInputChange} className="input-field" placeholder="email@exemplo.com" required />
          </div>

          <div>
            <label className="label-text">Curso</label>
            <input type="text" name="curso" value={formData.curso} onChange={handleInputChange} className="input-field" placeholder="Ex: Medicina" required />
          </div>

          <div>
            <label className="label-text">Natureza do Vínculo</label>
            <select name="natureza_vinculo" value={formData.natureza_vinculo} onChange={handleInputChange} className="input-field" required>
              <option value="Bolsista">Bolsista</option>
              <option value="Voluntário">Voluntário</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <h3 className="font-bold text-lg mt-4 mb-2">Dados Bancários do Estudante (se bolsista)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label-text">Banco</label>
                <input type="text" name="banco_estudante" value={formData.banco_estudante} onChange={handleInputChange} className="input-field" placeholder="Ex: Banco do Brasil" />
              </div>
              <div>
                <label className="label-text">Agência</label>
                <input type="text" name="agencia_estudante" value={formData.agencia_estudante} onChange={handleInputChange} className="input-field" placeholder="0000-0" />
              </div>
              <div>
                <label className="label-text">Conta</label>
                <input type="text" name="conta_estudante" value={formData.conta_estudante} onChange={handleInputChange} className="input-field" placeholder="00000-0" />
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="label-text mb-2">Plano de Trabalho (Upload)</label>
            <div className="border-2 border-dashed border-outline-variant/50 rounded-xl bg-surface-container-lowest p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative">
              <Upload className="w-10 h-10 text-primary mb-3 opacity-50" />
              <h4 className="font-bold text-on-surface mb-1">Plano de Trabalho</h4>
              <p className="text-xs text-on-surface-variant mb-4">PDF. Max 5MB.</p>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf"
                className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer w-full max-w-[250px]"
                required
              />
              {file && (
                <div className="absolute top-4 right-4 bg-green-100 text-green-600 p-1 rounded-full">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>
          </div>
        </div>

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
      </form>
    </div>
  );
}
