'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  LogOut, 
  Search,
  Filter,
  MoreVertical,
  Plus,
  Shield,
  Trash2,
  FileSearch,
  DollarSign,
  BookOpen,
  X,
  Check,
  CheckCircle
} from 'lucide-react';
import { getFromLocal, saveToLocal, removeFromLocal } from '@/lib/local-storage';
import { supabase } from '@/lib/supabase';

type AdminTab = 'overview' | 'submissions' | 'publications' | 'accountability' | 'team' | 'researchers';

export default function AdminDashboard() {
  const { adminUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [publications, setPublications] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [researchers, setResearchers] = useState<any[]>([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', role: 'gestor' });
  const [loading, setLoading] = useState(true);
  
  // New states for pending analysis modal
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [rejectionMessage, setRejectionMessage] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch researchers
        const { data: researchersData, error: researchersError } = await supabase
          .from('researchers')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (researchersError) throw researchersError;
        if (researchersData) setResearchers(researchersData);

        // Fetch projects from Supabase
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (projectsError) throw projectsError;

        if (projectsData) {
          setAllProjects(projectsData);
          
          const formattedSubmissions = projectsData
            .filter(p => p.type === 'fomento_pesquisa')
            .map(p => {
              const researcher = researchersData?.find(r => r.id === p.author_id);
              return {
                id: p.id,
                title: p.raw_data?.titulo || 'Sem título',
                type: 'Fomento Pesquisa',
                status: p.status,
                createdAt: p.created_at,
                researcherName: researcher?.nome || 'Desconhecido',
                budget: p.raw_data?.orcamento_json ? {
                  total: JSON.parse(p.raw_data.orcamento_json).reduce((acc: number, item: any) => acc + (item.qtd * item.valor), 0)
                } : { total: 0 }
              };
            });
            
          const formattedPublications = projectsData
            .filter(p => p.type === 'fomento_publicacao')
            .map(p => {
              const researcher = researchersData?.find(r => r.id === p.author_id);
              return {
                id: p.id,
                title: p.raw_data?.titulo || 'Sem título',
                type: 'Fomento Publicação',
                status: p.status,
                createdAt: p.created_at,
                researcherName: researcher?.nome || 'Desconhecido'
              };
            });

          setSubmissions(formattedSubmissions);
          setPublications(formattedPublications);
        }
        
      } catch (error) {
        console.error('Error fetching data from Supabase:', error);
      }
      
      setAdmins(JSON.parse(localStorage.getItem('admins') || '[]'));
      setLoading(false);
    };
    
    loadData();

    // Set up real-time subscriptions
    const projectsSubscription = supabase
      .channel('projects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        loadData();
      })
      .subscribe();

    const researchersSubscription = supabase
      .channel('researchers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'researchers' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(projectsSubscription);
      supabase.removeChannel(researchersSubscription);
    };
  }, []);

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedAdmins = [...admins, { ...newAdmin, id: Date.now().toString() }];
    setAdmins(updatedAdmins);
    localStorage.setItem('admins', JSON.stringify(updatedAdmins));
    setNewAdmin({ username: '', password: '', role: 'gestor' });
    setShowAddAdmin(false);
  };

  const removeAdmin = (id: string) => {
    if (admins.find(a => a.id === id)?.username === 'admin') return; // Prevent deleting master admin
    const updatedAdmins = admins.filter(a => a.id !== id);
    setAdmins(updatedAdmins);
    localStorage.setItem('admins', JSON.stringify(updatedAdmins));
  };

  const updateStatus = async (collection: string, id: string, status: string) => {
    try {
      // Update in Supabase
      const { error } = await supabase
        .from('projects')
        .update({ status })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      if (collection === 'submissions') {
        setSubmissions(prev => prev.map(item => item.id === id ? { ...item, status } : item));
      } else if (collection === 'publications') {
        setPublications(prev => prev.map(item => item.id === id ? { ...item, status } : item));
      }
      
      showToast('Status atualizado com sucesso!', 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Erro ao atualizar status.', 'error');
    }
  };

  const handleApproveDocument = async (id: string, isResearcher: boolean = false) => {
    try {
      if (isResearcher) {
        const { error } = await supabase.from('researchers').update({ status: 'Ativo' }).eq('id', id);
        if (error) throw error;
        setResearchers(prev => prev.map(r => r.id === id ? { ...r, status: 'Ativo' } : r));
      } else {
        const { error } = await supabase.from('projects').update({ status: 'Aprovado' }).eq('id', id);
        if (error) throw error;
        setAllProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'Aprovado' } : p));
        setSubmissions(prev => prev.map(p => p.id === id ? { ...p, status: 'Aprovado' } : p));
        setPublications(prev => prev.map(p => p.id === id ? { ...p, status: 'Aprovado' } : p));
      }
      setSelectedDocument(null);
      showToast('Documento aprovado com sucesso!', 'success');
    } catch (error) {
      console.error('Error approving document:', error);
      showToast('Erro ao aprovar documento.', 'error');
    }
  };

  const handleRejectDocument = async (id: string, message: string, isResearcher: boolean = false) => {
    try {
      if (isResearcher) {
        const researcher = researchers.find(r => r.id === id);
        const updatedRawData = { ...researcher.raw_data, rejection_message: message };
        const { error } = await supabase.from('researchers').update({ 
          status: 'Rejeitado',
          raw_data: updatedRawData
        }).eq('id', id);
        if (error) throw error;
        setResearchers(prev => prev.map(r => r.id === id ? { ...r, status: 'Rejeitado', raw_data: updatedRawData } : r));
      } else {
        const project = allProjects.find(p => p.id === id);
        const updatedRawData = { ...project.raw_data, rejection_message: message };
        const { error } = await supabase.from('projects').update({ 
          status: 'Rejeitado',
          raw_data: updatedRawData
        }).eq('id', id);
        if (error) throw error;
        setAllProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'Rejeitado', raw_data: updatedRawData } : p));
        setSubmissions(prev => prev.map(p => p.id === id ? { ...p, status: 'Rejeitado', raw_data: updatedRawData } : p));
        setPublications(prev => prev.map(p => p.id === id ? { ...p, status: 'Rejeitado', raw_data: updatedRawData } : p));
      }
      setSelectedDocument(null);
      setShowRejectModal(false);
      setRejectionMessage('');
      showToast('Documento rejeitado e mensagem enviada ao pesquisador.', 'success');
    } catch (error) {
      console.error('Error rejecting document:', error);
      showToast('Erro ao rejeitar documento.', 'error');
    }
  };

  const renderDocumentLinks = (doc: any) => {
    const urls: { name: string, url: string }[] = [];
    if (doc.isResearcher && doc.raw_data) {
      if (doc.raw_data.foto_perfil) urls.push({ name: 'Foto de Perfil', url: doc.raw_data.foto_perfil });
      if (doc.raw_data.rg_cpf) urls.push({ name: 'RG/CPF', url: doc.raw_data.rg_cpf });
      if (doc.raw_data.lattes) urls.push({ name: 'Currículo Lattes', url: doc.raw_data.lattes });
      if (doc.raw_data.comprovante_residencia) urls.push({ name: 'Comprovante de Residência', url: doc.raw_data.comprovante_residencia });
      if (doc.raw_data.termo_anuencia) urls.push({ name: 'Termo de Anuência', url: doc.raw_data.termo_anuencia });
      
      try {
        if (doc.raw_data.documentos_json) {
          const docs = JSON.parse(doc.raw_data.documentos_json);
          Object.entries(docs).forEach(([key, value]) => {
            if (value) urls.push({ name: key, url: value as string });
          });
        }
      } catch (e) {}
    } else if (doc.type === 'fomento_pesquisa' && doc.raw_data?.anexos_json) {
      try {
        const anexos = JSON.parse(doc.raw_data.anexos_json);
        Object.entries(anexos).forEach(([key, value]) => {
          if (value) urls.push({ name: key, url: value as string });
        });
      } catch (e) {}
    } else if (doc.type === 'fomento_publicacao' && doc.raw_data?.documentos) {
      const docs = doc.raw_data.documentos;
      if (docs.artigo_url) urls.push({ name: 'Artigo', url: docs.artigo_url });
      if (docs.resumo_url) urls.push({ name: 'Resumo', url: docs.resumo_url });
      if (docs.aceite_url) urls.push({ name: 'Carta de Aceite', url: docs.aceite_url });
    } else if (doc.type === 'picite' && doc.raw_data?.plano_trabalho_url) {
      urls.push({ name: 'Plano de Trabalho', url: doc.raw_data.plano_trabalho_url });
    }

    if (urls.length === 0) return <p className="text-sm text-on-surface-variant">Nenhum arquivo anexado.</p>;

    return (
      <div className="space-y-6">
        {urls.map((u, i) => (
          <div key={i} className="border border-outline-variant rounded-lg overflow-hidden">
            <div className="bg-surface-container-low p-2 border-b border-outline-variant font-bold text-sm">
              {u.name}
            </div>
            <div className="h-96 bg-surface-container-lowest">
              <iframe src={u.url} className="w-full h-full" title={u.name} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPendingModal = () => {
    if (!showPendingModal) return null;
    
    const pendingProjects = allProjects.filter(p => p.status === 'Em Análise' || p.status === 'Pendente');
    const pendingResearchers = researchers.filter(r => r.status === 'Pendente').map(r => ({
      ...r,
      isResearcher: true,
      type: 'researcher'
    }));
    
    const pendingItems = [...pendingProjects, ...pendingResearchers];

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-surface rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <h2 className="text-xl font-bold text-primary">Documentos Aguardando Análise</h2>
            <button onClick={() => { setShowPendingModal(false); setSelectedDocument(null); }} className="text-on-surface-variant hover:text-primary">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex flex-1 overflow-hidden">
            <div className="w-1/3 border-r border-outline-variant overflow-y-auto p-4 space-y-2">
              {pendingItems.length === 0 ? (
                <p className="text-sm text-on-surface-variant text-center py-4">Nenhum documento pendente.</p>
              ) : (
                pendingItems.map(item => (
                  <div 
                    key={item.id} 
                    className={`p-3 rounded-lg cursor-pointer border ${selectedDocument?.id === item.id ? 'border-primary bg-primary/5' : 'border-outline-variant hover:bg-surface-container-low'}`}
                    onClick={() => setSelectedDocument(item)}
                  >
                    <div className="font-bold text-sm text-primary truncate">
                      {item.isResearcher ? `Perfil: ${item.nome}` : item.raw_data?.titulo || 'Documento sem título'}
                    </div>
                    <div className="text-xs text-on-surface-variant mt-1 flex justify-between">
                      <span>{item.isResearcher ? 'Documentos Pessoais' : item.type === 'fomento_pesquisa' ? 'Fomento' : item.type === 'fomento_publicacao' ? 'Publicação' : 'PICITE'}</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="w-2/3 flex flex-col bg-surface-container-lowest">
              {selectedDocument ? (
                <>
                  <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface">
                    <h3 className="font-bold text-primary truncate flex-1 mr-4">
                      {selectedDocument.isResearcher ? `Perfil: ${selectedDocument.nome}` : selectedDocument.raw_data?.titulo || 'Documento'}
                    </h3>
                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={() => handleApproveDocument(selectedDocument.id, selectedDocument.isResearcher)}
                        className="px-3 py-1.5 bg-success text-on-primary text-sm font-bold rounded-lg hover:bg-success/90 flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" /> Aprovar
                      </button>
                      <button 
                        onClick={() => {
                          setShowRejectModal(true);
                        }}
                        className="px-3 py-1.5 bg-error text-on-primary text-sm font-bold rounded-lg hover:bg-error/90 flex items-center gap-1"
                      >
                        <X className="w-4 h-4" /> Rejeitar
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto">
                    <div className="space-y-4">
                      <h4 className="font-bold text-sm text-on-surface">Arquivos Anexados:</h4>
                      {renderDocumentLinks(selectedDocument)}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-on-surface-variant">
                  Selecione um documento para analisar
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
            <div className="bg-surface p-6 rounded-xl max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold text-primary mb-4">Motivo da Rejeição</h3>
              <textarea 
                value={rejectionMessage}
                onChange={(e) => setRejectionMessage(e.target.value)}
                className="input-field w-full h-32 mb-4"
                placeholder="Descreva o motivo da rejeição para o pesquisador..."
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowRejectModal(false)} className="btn-secondary">Cancelar</button>
                <button 
                  onClick={() => handleRejectDocument(selectedDocument.id, rejectionMessage, selectedDocument.isResearcher)}
                  className="btn-primary bg-error hover:bg-error/90"
                  disabled={!rejectionMessage.trim()}
                >
                  Confirmar Rejeição
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="glass-panel p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Projetos</span>
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="text-3xl font-bold text-primary">{allProjects.length}</div>
          <div className="text-xs text-on-surface-variant mt-1">Fomentos e Publicações</div>
        </div>
        <div 
          className="glass-panel p-6 rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors border border-transparent hover:border-secondary"
          onClick={() => setShowPendingModal(true)}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Aguardando Análise</span>
            <Clock className="w-5 h-5 text-secondary" />
          </div>
          <div className="text-3xl font-bold text-secondary">
            {allProjects.filter(p => p.status === 'Em Análise' || p.status === 'Pendente').length + researchers.filter(r => r.status === 'Pendente').length}
          </div>
          <div className="text-xs text-on-surface-variant mt-1">Clique para avaliar</div>
        </div>
        <div className="glass-panel p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Em Andamento</span>
            <CheckCircle className="w-5 h-5 text-success" />
          </div>
          <div className="text-3xl font-bold text-success">
            {allProjects.filter(p => p.status === 'Aprovado' || p.status === 'Em Execução').length}
          </div>
          <div className="text-xs text-on-surface-variant mt-1">Projetos aprovados</div>
        </div>
        <div className="glass-panel p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Pesquisadores</span>
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="text-3xl font-bold text-primary">{researchers.length}</div>
          <div className="text-xs text-on-surface-variant mt-1">Cadastrados</div>
        </div>
        <div className="glass-panel p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Equipe ADM</span>
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div className="text-3xl font-bold text-primary">{admins.length}</div>
          <div className="text-xs text-on-surface-variant mt-1">Gestores ativos</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> Alertas de Admissibilidade
          </h3>
          <div className="space-y-4">
            {allProjects.filter(s => s.status === 'Em Análise' || s.status === 'Pendente').slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                <div>
                  <div className="text-sm font-bold text-primary">{s.raw_data?.titulo || 'Sem título'}</div>
                  <div className="text-xs text-on-surface-variant">Tipo: {s.type === 'fomento_pesquisa' ? 'Fomento' : s.type === 'fomento_publicacao' ? 'Publicação' : 'PICITE'}</div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedDocument(s);
                    setShowPendingModal(true);
                  }}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Avaliar
                </button>
              </div>
            ))}
            {allProjects.filter(s => s.status === 'Em Análise' || s.status === 'Pendente').length === 0 && (
              <div className="text-center py-8 text-on-surface-variant text-sm italic">
                Nenhuma pendência de admissibilidade no momento.
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" /> Auditoria Financeira Recente
          </h3>
          <div className="space-y-4">
            {allProjects.filter(s => s.status === 'Aprovado' || s.status === 'Em Execução').slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                <div>
                  <div className="text-sm font-bold text-primary">{s.raw_data?.titulo || 'Sem título'}</div>
                  <div className="text-xs text-on-surface-variant">
                    Orçamento: R$ {s.raw_data?.orcamento_json ? JSON.parse(s.raw_data.orcamento_json).reduce((acc: number, item: any) => acc + (item.qtd * item.valor), 0).toFixed(2) : '0,00'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-success/10 text-success text-[10px] font-bold rounded uppercase">Em Execução</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {renderPendingModal()}
    </div>
  );

  const renderSubmissions = () => (
    <div className="glass-panel rounded-xl overflow-hidden">
      <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
        <h3 className="text-lg font-bold text-primary flex items-center gap-2">
          <FileSearch className="w-5 h-5" /> Gestão de Fomentos (Admissibilidade)
        </h3>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-on-surface-variant" />
            <input type="text" placeholder="Buscar projeto..." className="input-field py-2 pl-9 text-sm w-64" />
          </div>
          <button className="btn-secondary py-2 flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filtrar
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
              <th className="p-4">Projeto</th>
              <th className="p-4">Pesquisador</th>
              <th className="p-4">Data</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {submissions.map(s => (
              <tr key={s.id} className="hover:bg-surface-container-low transition-colors">
                <td className="p-4">
                  <div className="text-sm font-bold text-primary">{s.title}</div>
                  <div className="text-[10px] text-on-surface-variant uppercase">{s.type || 'Fomento Pesquisa'}</div>
                </td>
                <td className="p-4 text-sm text-on-surface-variant">{s.researcherName || '---'}</td>
                <td className="p-4 text-sm text-on-surface-variant">{new Date(s.createdAt).toLocaleDateString('pt-BR')}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                    s.status === 'Aprovado' ? 'bg-success/10 text-success' :
                    s.status === 'Pendente' ? 'bg-error/10 text-error' :
                    'bg-secondary/10 text-secondary'
                  }`}>
                    {s.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => {
                        const project = allProjects.find(p => p.id === s.id);
                        if (project) {
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            printWindow.document.write(`
                              <html>
                                <head>
                                  <title>Dossiê do Projeto - ${s.title}</title>
                                  <style>
                                    body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; color: #333; }
                                    h1 { color: #1a365d; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                                    h2 { color: #2d3748; margin-top: 30px; }
                                    .section { margin-bottom: 30px; }
                                    .label { font-weight: bold; color: #4a5568; }
                                    .value { margin-bottom: 15px; }
                                    table { w-full; border-collapse: collapse; margin-top: 15px; }
                                    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
                                    th { background-color: #f7fafc; }
                                    @media print {
                                      body { padding: 0; }
                                      button { display: none; }
                                    }
                                  </style>
                                </head>
                                <body>
                                  <div style="text-align: right; margin-bottom: 20px;">
                                    <button onclick="window.print()" style="padding: 10px 20px; background: #3182ce; color: white; border: none; border-radius: 5px; cursor: pointer;">Imprimir Dossiê</button>
                                  </div>
                                  <h1>Dossiê do Projeto</h1>
                                  
                                  <div class="section">
                                    <h2>Informações Gerais</h2>
                                    <div class="value"><span class="label">Título:</span> ${s.title}</div>
                                    <div class="value"><span class="label">Pesquisador Responsável:</span> ${s.researcherName}</div>
                                    <div class="value"><span class="label">Status:</span> ${s.status}</div>
                                    <div class="value"><span class="label">Data de Submissão:</span> ${new Date(s.createdAt).toLocaleDateString('pt-BR')}</div>
                                    <div class="value"><span class="label">Resumo:</span><br/> ${project.raw_data?.resumo || 'N/A'}</div>
                                    <div class="value"><span class="label">Metodologia:</span><br/> ${project.raw_data?.metodologia || 'N/A'}</div>
                                  </div>

                                  <div class="section">
                                    <h2>Orçamento</h2>
                                    <div class="value"><span class="label">Valor Total Solicitado:</span> R$ ${s.budget?.total?.toFixed(2) || '0.00'}</div>
                                  </div>
                                </body>
                              </html>
                            `);
                            printWindow.document.close();
                          }
                        }
                      }}
                      className="p-2 hover:bg-primary/10 text-primary rounded-lg" title="Imprimir Dossiê"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => updateStatus('submissions', s.id, 'Aprovado')}
                      className="p-2 hover:bg-success/10 text-success rounded-lg" title="Aprovar"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => updateStatus('submissions', s.id, 'Pendência')}
                      className="p-2 hover:bg-warning/10 text-warning rounded-lg" title="Solicitar Ajustes"
                    >
                      <AlertCircle className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPublications = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary">Solicitações de Publicação</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-on-surface-variant" />
            <input type="text" placeholder="Buscar publicação..." className="input-field pl-9 py-2 text-sm w-64" />
          </div>
          <button className="btn-secondary py-2 flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filtrar
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
              <th className="p-4">Título do Artigo</th>
              <th className="p-4">Pesquisador Principal</th>
              <th className="p-4">Data da Solicitação</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {publications.map(p => (
              <tr key={p.id} className="hover:bg-surface-container-low transition-colors">
                <td className="p-4">
                  <div className="text-sm font-bold text-primary">{p.title}</div>
                  <div className="text-[10px] text-on-surface-variant uppercase">Fomento para Publicação</div>
                </td>
                <td className="p-4 text-sm text-on-surface-variant">{p.researcherName || '---'}</td>
                <td className="p-4 text-sm text-on-surface-variant">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                    p.status === 'Aprovado' ? 'bg-success/10 text-success' :
                    p.status === 'Pendente' ? 'bg-error/10 text-error' :
                    'bg-secondary/10 text-secondary'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => {
                        const project = allProjects.find(proj => proj.id === p.id);
                        if (project) {
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            printWindow.document.write(`
                              <html>
                                <head>
                                  <title>Dossiê de Publicação - ${p.title}</title>
                                  <style>
                                    body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; color: #333; }
                                    h1 { color: #1a365d; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                                    h2 { color: #2d3748; margin-top: 30px; }
                                    .section { margin-bottom: 30px; }
                                    .label { font-weight: bold; color: #4a5568; }
                                    .value { margin-bottom: 15px; }
                                    @media print {
                                      body { padding: 0; }
                                      button { display: none; }
                                    }
                                  </style>
                                </head>
                                <body>
                                  <div style="text-align: right; margin-bottom: 20px;">
                                    <button onclick="window.print()" style="padding: 10px 20px; background: #3182ce; color: white; border: none; border-radius: 5px; cursor: pointer;">Imprimir Dossiê</button>
                                  </div>
                                  <h1>Dossiê de Publicação</h1>
                                  
                                  <div class="section">
                                    <h2>Informações Gerais</h2>
                                    <div class="value"><span class="label">Título do Artigo:</span> ${p.title}</div>
                                    <div class="value"><span class="label">Pesquisador Responsável:</span> ${p.researcherName}</div>
                                    <div class="value"><span class="label">Status:</span> ${p.status}</div>
                                    <div class="value"><span class="label">Data de Submissão:</span> ${new Date(p.createdAt).toLocaleDateString('pt-BR')}</div>
                                  </div>
                                  
                                  <div class="section">
                                    <h2>Detalhes da Publicação</h2>
                                    <div class="value"><span class="label">Revista/Periódico:</span> ${project.raw_data?.revista || 'N/A'}</div>
                                    <div class="value"><span class="label">Qualis:</span> ${project.raw_data?.qualis || 'N/A'}</div>
                                    <div class="value"><span class="label">Custo Estimado:</span> R$ ${project.raw_data?.custo_estimado || '0,00'}</div>
                                  </div>
                                </body>
                              </html>
                            `);
                            printWindow.document.close();
                          }
                        }
                      }}
                      className="p-2 hover:bg-primary/10 text-primary rounded-lg" title="Imprimir Dossiê"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => updateStatus('publications', p.id, 'Aprovado')}
                      className="p-2 hover:bg-success/10 text-success rounded-lg" title="Aprovar"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => updateStatus('publications', p.id, 'Pendência')}
                      className="p-2 hover:bg-warning/10 text-warning rounded-lg" title="Solicitar Ajustes"
                    >
                      <AlertCircle className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {publications.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                  Nenhuma solicitação de publicação encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAccountability = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary">Auditoria Financeira</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-on-surface-variant" />
            <input type="text" placeholder="Buscar projeto..." className="input-field pl-9 py-2 text-sm w-64" />
          </div>
          <button className="btn-secondary py-2 flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filtrar
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
              <th className="p-4">Projeto / Fomento</th>
              <th className="p-4">Pesquisador</th>
              <th className="p-4">Orçamento Aprovado</th>
              <th className="p-4">Status da Prestação</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {submissions.filter(s => s.status === 'Aprovado' || s.status === 'Em Execução').map(s => (
              <tr key={s.id} className="hover:bg-surface-container-low transition-colors">
                <td className="p-4">
                  <div className="text-sm font-bold text-primary">{s.title}</div>
                  <div className="text-[10px] text-on-surface-variant uppercase">{s.type}</div>
                </td>
                <td className="p-4 text-sm text-on-surface-variant">{s.researcherName || '---'}</td>
                <td className="p-4 text-sm font-bold text-primary">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.budget?.total || 0)}
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-secondary/10 text-secondary">
                    Aguardando Notas
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="text-primary hover:underline text-xs font-bold">
                    Analisar Gastos
                  </button>
                </td>
              </tr>
            ))}
            {submissions.filter(s => s.status === 'Aprovado' || s.status === 'Em Execução').length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                  Nenhum projeto em execução para auditoria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTeam = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-primary flex items-center gap-2">
          <Users className="w-6 h-6" /> Gestão da Equipe CPECC
        </h3>
        <button 
          onClick={() => setShowAddAdmin(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Novo Gestor
        </button>
      </div>

      {showAddAdmin && (
        <div className="glass-panel p-6 rounded-xl animate-in fade-in slide-in-from-top-4">
          <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="label-text">Usuário</label>
              <input 
                type="text" 
                className="input-field" 
                value={newAdmin.username}
                onChange={e => setNewAdmin({...newAdmin, username: e.target.value})}
                required 
              />
            </div>
            <div>
              <label className="label-text">Senha</label>
              <input 
                type="password" 
                className="input-field" 
                value={newAdmin.password}
                onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                required 
              />
            </div>
            <div>
              <label className="label-text">Perfil</label>
              <select 
                className="input-field"
                value={newAdmin.role}
                onChange={e => setNewAdmin({...newAdmin, role: e.target.value})}
              >
                <option value="gestor">Gestor</option>
                <option value="auditor">Auditor</option>
                <option value="master">Master</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1">Salvar</button>
              <button 
                type="button" 
                onClick={() => setShowAddAdmin(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {admins.map(admin => (
          <div key={admin.id} className="glass-panel p-6 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-primary">{admin.username}</div>
                <div className="text-xs text-on-surface-variant uppercase tracking-widest">{admin.role}</div>
              </div>
            </div>
            {admin.username !== 'admin' && (
              <button 
                onClick={() => removeAdmin(admin.id)}
                className="p-2 text-error hover:bg-error/10 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderResearchers = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary">Pesquisadores Cadastrados</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-on-surface-variant" />
            <input type="text" placeholder="Buscar pesquisador..." className="input-field pl-9 py-2 text-sm w-64" />
          </div>
          <button className="btn-secondary flex items-center gap-2 py-2">
            <Filter className="w-4 h-4" /> Filtros
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-lowest border-b border-gray-100 text-on-surface-variant uppercase tracking-wider text-xs">
              <tr>
                <th className="p-4 font-bold">Nome</th>
                <th className="p-4 font-bold">CPF</th>
                <th className="p-4 font-bold">Email</th>
                <th className="p-4 font-bold">Titulação</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {researchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                    Nenhum pesquisador encontrado.
                  </td>
                </tr>
              ) : (
                researchers.map((researcher) => (
                  <tr key={researcher.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-on-surface">{researcher.nome}</td>
                    <td className="p-4 text-on-surface-variant">{researcher.cpf}</td>
                    <td className="p-4 text-on-surface-variant">{researcher.email_inst}</td>
                    <td className="p-4 text-on-surface-variant">{researcher.titulacao}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        researcher.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {researcher.status || 'Pendente'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>Perfil do Pesquisador - ${researcher.nome}</title>
                                    <style>
                                      body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; color: #333; }
                                      h1 { color: #1a365d; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                                      h2 { color: #2d3748; margin-top: 30px; }
                                      .section { margin-bottom: 30px; }
                                      .label { font-weight: bold; color: #4a5568; }
                                      .value { margin-bottom: 15px; }
                                      @media print {
                                        body { padding: 0; }
                                        button { display: none; }
                                      }
                                    </style>
                                  </head>
                                  <body>
                                    <div style="text-align: right; margin-bottom: 20px;">
                                      <button onclick="window.print()" style="padding: 10px 20px; background: #3182ce; color: white; border: none; border-radius: 5px; cursor: pointer;">Imprimir Perfil</button>
                                    </div>
                                    <h1>Perfil do Pesquisador</h1>
                                    
                                    <div class="section">
                                      <h2>Dados Pessoais</h2>
                                      <div class="value"><span class="label">Nome:</span> ${researcher.nome}</div>
                                      <div class="value"><span class="label">CPF:</span> ${researcher.cpf}</div>
                                      <div class="value"><span class="label">Email:</span> ${researcher.email_inst}</div>
                                      <div class="value"><span class="label">Telefone:</span> ${researcher.raw_data?.telefone || 'N/A'}</div>
                                      <div class="value"><span class="label">Titulação:</span> ${researcher.titulacao || 'N/A'}</div>
                                      <div class="value"><span class="label">Lattes:</span> ${researcher.raw_data?.lattes || 'N/A'}</div>
                                    </div>

                                    <div class="section">
                                      <h2>Endereço</h2>
                                      <div class="value"><span class="label">CEP:</span> ${researcher.raw_data?.endereco?.cep || 'N/A'}</div>
                                      <div class="value"><span class="label">Logradouro:</span> ${researcher.raw_data?.endereco?.logradouro || 'N/A'}, ${researcher.raw_data?.endereco?.numero || 'N/A'}</div>
                                      <div class="value"><span class="label">Bairro:</span> ${researcher.raw_data?.endereco?.bairro || 'N/A'}</div>
                                      <div class="value"><span class="label">Cidade/UF:</span> ${researcher.raw_data?.endereco?.cidade || 'N/A'}/${researcher.raw_data?.endereco?.uf || 'N/A'}</div>
                                    </div>
                                    
                                    <div class="section">
                                      <h2>Dados Bancários</h2>
                                      <div class="value"><span class="label">Banco:</span> ${researcher.raw_data?.dadosBancarios?.banco || 'N/A'}</div>
                                      <div class="value"><span class="label">Agência:</span> ${researcher.raw_data?.dadosBancarios?.agencia || 'N/A'}</div>
                                      <div class="value"><span class="label">Conta:</span> ${researcher.raw_data?.dadosBancarios?.conta || 'N/A'}</div>
                                      <div class="value"><span class="label">Tipo:</span> ${researcher.raw_data?.dadosBancarios?.tipoConta || 'N/A'}</div>
                                    </div>
                                  </body>
                                </html>
                              `);
                              printWindow.document.close();
                            }
                          }}
                          className="p-2 hover:bg-primary/10 text-primary rounded-lg" title="Imprimir Perfil"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface flex">
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-[100] px-6 py-3 rounded-xl shadow-lg text-white font-bold animate-in slide-in-from-top-4 ${toastMessage.type === 'success' ? 'bg-success' : 'bg-error'}`}>
          {toastMessage.message}
        </div>
      )}
      {/* Sidebar */}
      <aside className="w-64 bg-surface-container-low border-r border-outline-variant flex flex-col">
        <div className="p-6 border-b border-outline-variant">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Shield className="w-6 h-6" />
            <span className="font-bold text-lg tracking-tight">CPECC ADM</span>
          </div>
          <div className="text-[10px] text-on-surface-variant font-bold uppercase tracking-[0.2em]">
            Portal do Gestor
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'overview' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Visão Geral
          </button>
          <button 
            onClick={() => setActiveTab('submissions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'submissions' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <FileSearch className="w-4 h-4" /> Fomentos
          </button>
          <button 
            onClick={() => setActiveTab('publications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'publications' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Publicações
          </button>
          <button 
            onClick={() => setActiveTab('accountability')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'accountability' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <DollarSign className="w-4 h-4" /> Auditoria
          </button>
          <button 
            onClick={() => setActiveTab('team')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'team' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <Users className="w-4 h-4" /> Equipe
          </button>
          <button 
            onClick={() => setActiveTab('researchers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'researchers' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <Users className="w-4 h-4" /> Pesquisadores
          </button>
        </nav>

        <div className="p-4 border-t border-outline-variant">
          <div className="glass-panel p-4 rounded-xl mb-4">
            <div className="text-xs font-bold text-primary uppercase mb-1">Logado como:</div>
            <div className="text-sm font-bold text-on-surface truncate">{adminUser?.username}</div>
            <div className="text-[10px] text-on-surface-variant uppercase">{adminUser?.role}</div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-error hover:bg-error/10 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-primary">
              {activeTab === 'overview' && 'Painel de Controle'}
              {activeTab === 'submissions' && 'Gestão de Fomentos'}
              {activeTab === 'publications' && 'Solicitações de Publicação'}
              {activeTab === 'accountability' && 'Auditoria Financeira'}
              {activeTab === 'team' && 'Gestão de Equipe'}
              {activeTab === 'researchers' && 'Pesquisadores'}
            </h2>
            <p className="text-sm text-on-surface-variant">
              Bem-vindo ao portal administrativo da CPECC/ESPDF.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs font-bold text-on-surface-variant uppercase">Data Atual</div>
              <div className="text-sm font-bold text-primary">{new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'submissions' && renderSubmissions()}
            {activeTab === 'publications' && renderPublications()}
            {activeTab === 'accountability' && renderAccountability()}
            {activeTab === 'team' && renderTeam()}
            {activeTab === 'researchers' && renderResearchers()}
          </>
        )}
      </main>
    </div>
  );
}
