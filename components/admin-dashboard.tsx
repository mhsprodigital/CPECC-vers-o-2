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
  CheckCircle,
  Eye,
  ExternalLink
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
  const [selectedResearcher, setSelectedResearcher] = useState<any | null>(null);
  const [rejectionMessage, setRejectionMessage] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [allowCorrection, setAllowCorrection] = useState(true);
  
  // Accountability states
  const [showAccountabilityModal, setShowAccountabilityModal] = useState(false);
  const [selectedAccountabilityProject, setSelectedAccountabilityProject] = useState<any | null>(null);
  const [expenseMessage, setExpenseMessage] = useState('');
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);

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

  const handleUpdateResearcherStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('researchers')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setResearchers(researchers.map(r => r.id === id ? { ...r, status: newStatus } : r));
      if (selectedResearcher && selectedResearcher.id === id) {
        setSelectedResearcher({ ...selectedResearcher, status: newStatus });
      }
      showToast(`Status do pesquisador atualizado para ${newStatus}.`);
    } catch (error) {
      console.error('Error updating researcher status:', error);
      showToast('Erro ao atualizar status do pesquisador.', 'error');
    }
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

  const handleUpdateExpenseStatus = async (projectId: string, expenseId: string, newStatus: string, message: string = '') => {
    try {
      const project = allProjects.find(p => p.id === projectId);
      if (!project || !project.raw_data?.despesas) return;

      const updatedDespesas = project.raw_data.despesas.map((d: any) => 
        d.id === expenseId ? { ...d, status: newStatus, mensagem: message } : d
      );

      const updatedRawData = { ...project.raw_data, despesas: updatedDespesas };

      const { error } = await supabase
        .from('projects')
        .update({ raw_data: updatedRawData })
        .eq('id', projectId);

      if (error) throw error;

      setAllProjects(prev => prev.map(p => p.id === projectId ? { ...p, raw_data: updatedRawData } : p));
      
      // Update selected project if it's open
      if (selectedAccountabilityProject?.id === projectId) {
        setSelectedAccountabilityProject({ ...selectedAccountabilityProject, raw_data: updatedRawData });
      }

      showToast(`Status da despesa atualizado para ${newStatus}.`, 'success');
      setExpenseMessage('');
      setSelectedExpenseId(null);
    } catch (error) {
      console.error('Error updating expense status:', error);
      showToast('Erro ao atualizar status da despesa.', 'error');
    }
  };

  const handleRejectDocument = async (id: string, message: string, isResearcher: boolean = false, allowCorrection: boolean = true) => {
    try {
      const newStatus = allowCorrection ? 'Pendência' : 'Rejeitado';
      
      if (isResearcher) {
        const researcher = researchers.find(r => r.id === id);
        const updatedRawData = { ...researcher.raw_data, rejection_message: message, allow_correction: allowCorrection };
        const { error } = await supabase.from('researchers').update({ 
          status: newStatus,
          raw_data: updatedRawData
        }).eq('id', id);
        if (error) throw error;
        setResearchers(prev => prev.map(r => r.id === id ? { ...r, status: newStatus, raw_data: updatedRawData } : r));
      } else {
        const project = allProjects.find(p => p.id === id);
        const updatedRawData = { ...project.raw_data, rejection_message: message, allow_correction: allowCorrection };
        const { error } = await supabase.from('projects').update({ 
          status: newStatus,
          raw_data: updatedRawData
        }).eq('id', id);
        if (error) throw error;
        setAllProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus, raw_data: updatedRawData } : p));
        setSubmissions(prev => prev.map(p => p.id === id ? { ...p, status: newStatus, raw_data: updatedRawData } : p));
        setPublications(prev => prev.map(p => p.id === id ? { ...p, status: newStatus, raw_data: updatedRawData } : p));
      }
      setSelectedDocument(null);
      setShowRejectModal(false);
      setRejectionMessage('');
      showToast(`Documento atualizado para ${newStatus}.`, 'success');
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
            <div className="bg-surface-container-low p-3 border-b border-outline-variant font-bold text-sm flex justify-between items-center">
              <span>{u.name}</span>
              <a href={u.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-md transition-colors">
                <ExternalLink className="w-4 h-4" /> Abrir em nova guia
              </a>
            </div>
            <div className="p-12 bg-surface-container-lowest flex flex-col items-center justify-center text-center">
              <FileText className="w-16 h-16 text-on-surface-variant/50 mb-4" />
              <h4 className="text-lg font-bold text-on-surface mb-2">Visualização de Documento</h4>
              <p className="text-on-surface-variant max-w-md mb-6">
                Para garantir a visualização correta e em tela cheia, clique no botão abaixo para abrir o documento em uma nova guia.
              </p>
              <a href={u.url} target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-2">
                <ExternalLink className="w-5 h-5" /> Visualizar Documento Completo
              </a>
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
              
              <div className="mb-6">
                <p className="text-sm font-bold text-on-surface mb-2">Ação após rejeição:</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="allowCorrection" 
                      checked={allowCorrection === true} 
                      onChange={() => setAllowCorrection(true)}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-on-surface">Permitir correção (Status: Pendência)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="allowCorrection" 
                      checked={allowCorrection === false} 
                      onChange={() => setAllowCorrection(false)}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-on-surface">Não permitir correção (Encerrar Projeto)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setShowRejectModal(false)} className="btn-secondary">Cancelar</button>
                <button 
                  onClick={() => handleRejectDocument(selectedDocument.id, rejectionMessage, selectedDocument.isResearcher, allowCorrection)}
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
        <div 
          className="glass-panel p-6 rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors border border-transparent hover:border-primary"
          onClick={() => setActiveTab('submissions')}
        >
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
        <div 
          className="glass-panel p-6 rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors border border-transparent hover:border-success"
          onClick={() => setActiveTab('submissions')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Em Andamento</span>
            <CheckCircle className="w-5 h-5 text-success" />
          </div>
          <div className="text-3xl font-bold text-success">
            {allProjects.filter(p => p.status === 'Aprovado' || p.status === 'Em Execução').length}
          </div>
          <div className="text-xs text-on-surface-variant mt-1">Projetos aprovados</div>
        </div>
        <div 
          className="glass-panel p-6 rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors border border-transparent hover:border-primary"
          onClick={() => setActiveTab('researchers')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Pesquisadores</span>
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="text-3xl font-bold text-primary">{researchers.length}</div>
          <div className="text-xs text-on-surface-variant mt-1">Cadastrados</div>
        </div>
        <div 
          className="glass-panel p-6 rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors border border-transparent hover:border-primary"
          onClick={() => setActiveTab('team')}
        >
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
                        const researcher = researchers.find(r => r.id === project?.author_id);
                        if (project && researcher) {
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            let equipeHtml = '';
                            try {
                              if (project.raw_data?.equipe_json) {
                                const equipe = JSON.parse(project.raw_data.equipe_json);
                                if (equipe && equipe.length > 0) {
                                  equipeHtml = `
                                    <div class="section">
                                      <h2>Relatório de Participantes da Pesquisa</h2>
                                      <table>
                                        <thead>
                                          <tr>
                                            <th>Nome</th>
                                            <th>Função</th>
                                            <th>Titulação</th>
                                            <th>Instituição</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          ${equipe.map((m: any) => `
                                            <tr>
                                              <td>${m.nome || 'N/A'}</td>
                                              <td>${m.funcao || 'N/A'}</td>
                                              <td>${m.titulacao || 'N/A'}</td>
                                              <td>${m.instituicao || 'N/A'}</td>
                                            </tr>
                                          `).join('')}
                                        </tbody>
                                      </table>
                                    </div>
                                  `;
                                }
                              }
                            } catch (e) {}

                            printWindow.document.write(`
                              <html>
                                <head>
                                  <title>Dossiê do Projeto - ${s.title}</title>
                                  <style>
                                    body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; color: #333; max-width: 1000px; margin: 0 auto; }
                                    h1 { color: #1a365d; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                                    h2 { color: #2d3748; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
                                    .section { margin-bottom: 30px; background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
                                    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                                    .label { font-weight: bold; color: #4a5568; font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.05em; }
                                    .value { margin-bottom: 15px; }
                                    .value-text { display: block; margin-top: 4px; color: #1a202c; }
                                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                                    th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
                                    th { background-color: #f7fafc; color: #4a5568; font-weight: bold; }
                                    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold; background: #ebf8ff; color: #2b6cb0; }
                                    @media print {
                                      body { padding: 0; }
                                      button { display: none; }
                                      .section { border: none; padding: 0; }
                                    }
                                  </style>
                                </head>
                                <body>
                                  <div style="text-align: right; margin-bottom: 20px;">
                                    <button onclick="window.print()" style="padding: 10px 20px; background: #3182ce; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Imprimir Dossiê</button>
                                  </div>
                                  <h1>Dossiê Completo do Projeto</h1>
                                  
                                  <div class="section">
                                    <h2>Dados do Pesquisador Responsável</h2>
                                    <div class="grid-2">
                                      <div class="value"><span class="label">Nome Completo</span><span class="value-text">${researcher.nome || 'N/A'}</span></div>
                                      <div class="value"><span class="label">CPF</span><span class="value-text">${researcher.cpf || 'N/A'}</span></div>
                                      <div class="value"><span class="label">E-mail</span><span class="value-text">${researcher.email || 'N/A'}</span></div>
                                      <div class="value"><span class="label">Telefone</span><span class="value-text">${researcher.telefone || 'N/A'}</span></div>
                                      <div class="value"><span class="label">Titulação</span><span class="value-text">${researcher.titulacao || 'N/A'}</span></div>
                                      <div class="value"><span class="label">Instituição</span><span class="value-text">${researcher.instituicao || 'N/A'}</span></div>
                                      <div class="value"><span class="label">Cargo</span><span class="value-text">${researcher.cargo || 'N/A'}</span></div>
                                      <div class="value"><span class="label">Endereço</span><span class="value-text">${researcher.raw_data?.logradouro || ''}, ${researcher.raw_data?.numero || ''} - ${researcher.raw_data?.bairro || ''}, ${researcher.raw_data?.cidade || ''}/${researcher.raw_data?.estado || ''} - CEP: ${researcher.raw_data?.cep || ''}</span></div>
                                      <div class="value"><span class="label">Dados Bancários</span><span class="value-text">Banco: ${researcher.raw_data?.banco || 'N/A'} | Ag: ${researcher.raw_data?.agencia || 'N/A'} | Conta: ${researcher.raw_data?.conta || 'N/A'} (${researcher.raw_data?.tipo_conta || 'N/A'})</span></div>
                                    </div>
                                  </div>

                                  <div class="section">
                                    <h2>Informações do Projeto</h2>
                                    <div class="value"><span class="label">Título do Projeto</span><span class="value-text text-xl font-bold">${s.title}</span></div>
                                    <div class="grid-2">
                                      <div class="value"><span class="label">Status Atual</span><span class="value-text"><span class="badge">${s.status}</span></span></div>
                                      <div class="value"><span class="label">Data de Submissão</span><span class="value-text">${new Date(s.createdAt).toLocaleDateString('pt-BR')}</span></div>
                                      <div class="value"><span class="label">Área Temática</span><span class="value-text">${project.raw_data?.area_tematica || 'N/A'}</span></div>
                                      <div class="value"><span class="label">Linha de Pesquisa</span><span class="value-text">${project.raw_data?.linha_pesquisa || 'N/A'}</span></div>
                                    </div>
                                    <div class="value" style="margin-top: 20px;"><span class="label">Resumo da Proposta</span><div class="value-text" style="text-align: justify;">${project.raw_data?.resumo || 'N/A'}</div></div>
                                    <div class="value"><span class="label">Justificativa</span><div class="value-text" style="text-align: justify;">${project.raw_data?.justificativa || 'N/A'}</div></div>
                                    <div class="value"><span class="label">Objetivos</span><div class="value-text" style="text-align: justify;">${project.raw_data?.objetivos || 'N/A'}</div></div>
                                    <div class="value"><span class="label">Metodologia</span><div class="value-text" style="text-align: justify;">${project.raw_data?.metodologia || 'N/A'}</div></div>
                                    <div class="value"><span class="label">Resultados Esperados</span><div class="value-text" style="text-align: justify;">${project.raw_data?.resultados_esperados || 'N/A'}</div></div>
                                  </div>

                                  <div class="section">
                                    <h2>Orçamento Solicitado</h2>
                                    <div class="value"><span class="label">Valor Total</span><span class="value-text" style="font-size: 1.5em; font-weight: bold; color: #2f855a;">R$ ${s.budget?.total?.toFixed(2) || '0.00'}</span></div>
                                  </div>

                                  ${equipeHtml}
                                </body>
                              </html>
                            `);
                            printWindow.document.close();
                          }
                        }
                      }}
                      className="p-2 hover:bg-primary/10 text-primary rounded-lg" title="Imprimir Dossiê Completo"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleApproveDocument(s.id, false)}
                      className="p-2 hover:bg-success/10 text-success rounded-lg" title="Aprovar Projeto"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedDocument(allProjects.find(p => p.id === s.id));
                        setShowRejectModal(true);
                      }}
                      className="p-2 hover:bg-error/10 text-error rounded-lg" title="Rejeitar / Solicitar Ajustes"
                    >
                      <X className="w-4 h-4" />
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
                        const researcher = researchers.find(r => r.id === project?.author_id);
                        if (project && researcher) {
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            let autoresHtml = '';
                            try {
                              if (project.raw_data?.autores_json) {
                                const autores = JSON.parse(project.raw_data.autores_json);
                                if (autores && autores.length > 0) {
                                  autoresHtml = `
                                    <div class="section">
                                      <h2>Relatório de Autores da Publicação</h2>
                                      <table>
                                        <thead>
                                          <tr>
                                            <th>Nome</th>
                                            <th>Instituição</th>
                                            <th>Tipo de Autoria</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          ${autores.map((m: any) => `
                                            <tr>
                                              <td>${m.nome || 'N/A'}</td>
                                              <td>${m.instituicao || 'N/A'}</td>
                                              <td>${m.tipo || 'N/A'}</td>
                                            </tr>
                                          `).join('')}
                                        </tbody>
                                      </table>
                                    </div>
                                  `;
                                }
                              }
                            } catch (e) {}

                            printWindow.document.write(`
                              <html>
                                <head>
                                  <title>Dossiê de Publicação - ${p.title}</title>
                                  <style>
                                    body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; color: #333; max-width: 1000px; margin: 0 auto; }
                                    h1 { color: #1a365d; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
                                    h2 { color: #2d3748; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
                                    .section { margin-bottom: 30px; background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
                                    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                                    .label { font-weight: bold; color: #4a5568; font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.05em; }
                                    .value { margin-bottom: 15px; }
                                    .value-text { display: block; margin-top: 4px; color: #1a202c; }
                                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                                    th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
                                    th { background-color: #f7fafc; color: #4a5568; font-weight: bold; }
                                    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold; background: #ebf8ff; color: #2b6cb0; }
                                    @media print {
                                      body { padding: 0; }
                                      button { display: none; }
                                      .section { border: none; padding: 0; }
                                    }
                                  </style>
                                </head>
                                <body>
                                  <div style="text-align: right; margin-bottom: 20px;">
                                    <button onclick="window.print()" style="padding: 10px 20px; background: #3182ce; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Imprimir Dossiê</button>
                                  </div>
                                  <h1>Dossiê Completo de Publicação</h1>
                                  
                                  <div class="section">
                                    <h2>Dados do Pesquisador Responsável</h2>
                                    <div class="grid-2">
                                      <div class="value"><span class="label">Nome Completo</span><span class="value-text">${researcher.nome || 'N/A'}</span></div>
                                      <div class="value"><span class="label">CPF</span><span class="value-text">${researcher.cpf || 'N/A'}</span></div>
                                      <div class="value"><span class="label">E-mail</span><span class="value-text">${researcher.email || 'N/A'}</span></div>
                                      <div class="value"><span class="label">Telefone</span><span class="value-text">${researcher.telefone || 'N/A'}</span></div>
                                      <div class="value"><span class="label">Titulação</span><span class="value-text">${researcher.titulacao || 'N/A'}</span></div>
                                      <div class="value"><span class="label">Instituição</span><span class="value-text">${researcher.instituicao || 'N/A'}</span></div>
                                      <div class="value"><span class="label">Cargo</span><span class="value-text">${researcher.cargo || 'N/A'}</span></div>
                                      <div class="value"><span class="label">Endereço</span><span class="value-text">${researcher.raw_data?.logradouro || ''}, ${researcher.raw_data?.numero || ''} - ${researcher.raw_data?.bairro || ''}, ${researcher.raw_data?.cidade || ''}/${researcher.raw_data?.estado || ''} - CEP: ${researcher.raw_data?.cep || ''}</span></div>
                                      <div class="value"><span class="label">Dados Bancários</span><span class="value-text">Banco: ${researcher.raw_data?.banco || 'N/A'} | Ag: ${researcher.raw_data?.agencia || 'N/A'} | Conta: ${researcher.raw_data?.conta || 'N/A'} (${researcher.raw_data?.tipo_conta || 'N/A'})</span></div>
                                    </div>
                                  </div>

                                  <div class="section">
                                    <h2>Informações da Publicação</h2>
                                    <div class="value"><span class="label">Título do Artigo</span><span class="value-text text-xl font-bold">${p.title}</span></div>
                                    <div class="grid-2">
                                      <div class="value"><span class="label">Status Atual</span><span class="value-text"><span class="badge">${p.status}</span></span></div>
                                      <div class="value"><span class="label">Data de Submissão</span><span class="value-text">${new Date(p.createdAt).toLocaleDateString('pt-BR')}</span></div>
                                      <div class="value"><span class="label">Periódico/Revista</span><span class="value-text">${project.raw_data?.revista || 'N/A'}</span></div>
                                      <div class="value"><span class="label">Qualis/Fator de Impacto</span><span class="value-text">${project.raw_data?.qualis || 'N/A'}</span></div>
                                    </div>
                                    <div class="value" style="margin-top: 20px;"><span class="label">Resumo do Artigo</span><div class="value-text" style="text-align: justify;">${project.raw_data?.resumo || 'N/A'}</div></div>
                                  </div>

                                  <div class="section">
                                    <h2>Taxa de Publicação</h2>
                                    <div class="value"><span class="label">Valor Solicitado</span><span class="value-text" style="font-size: 1.5em; font-weight: bold; color: #2f855a;">R$ ${project.raw_data?.custo_estimado || '0.00'}</span></div>
                                  </div>

                                  ${autoresHtml}
                                </body>
                              </html>
                            `);
                            printWindow.document.close();
                          }
                        }
                      }}
                      className="p-2 hover:bg-primary/10 text-primary rounded-lg" title="Imprimir Dossiê Completo"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleApproveDocument(p.id, false)}
                      className="p-2 hover:bg-success/10 text-success rounded-lg" title="Aprovar Projeto"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedDocument(allProjects.find(proj => proj.id === p.id));
                        setShowRejectModal(true);
                      }}
                      className="p-2 hover:bg-error/10 text-error rounded-lg" title="Rejeitar / Solicitar Ajustes"
                    >
                      <X className="w-4 h-4" />
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
            {allProjects.filter(s => s.status === 'Aprovado' || s.status === 'Em Execução').map(s => {
              const despesas = s.raw_data?.despesas || [];
              let statusText = 'Aguardando Notas';
              let statusClass = 'bg-secondary/10 text-secondary';
              
              if (despesas.length > 0) {
                const hasPending = despesas.some((d: any) => d.status === 'Em Análise');
                const hasRejected = despesas.some((d: any) => d.status === 'Rejeitado');
                
                if (hasPending) {
                  statusText = 'Aguardando Análise';
                  statusClass = 'bg-warning/10 text-warning';
                } else if (hasRejected) {
                  statusText = 'Com Pendências';
                  statusClass = 'bg-error/10 text-error';
                } else {
                  statusText = 'Prestação Aprovada';
                  statusClass = 'bg-success/10 text-success';
                }
              }

              // Check deadlines
              let alertText = null;
              try {
                if (s.raw_data?.cronograma_json) {
                  const cronograma = JSON.parse(s.raw_data.cronograma_json);
                  if (cronograma.length > 0) {
                    const lastDateStr = cronograma[cronograma.length - 1].termino;
                    if (lastDateStr) {
                      const lastDate = new Date(lastDateStr + '-01T00:00:00');
                      const now = new Date();
                      const diffTime = lastDate.getTime() - now.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      if (diffDays < 0) {
                        alertText = 'Prazo Encerrado';
                      } else if (diffDays <= 30) {
                        alertText = `Vence em ${diffDays} dias`;
                      }
                    }
                  }
                }
              } catch (e) {}

              const researcher = researchers.find(r => r.id === s.author_id);

              return (
                <tr key={s.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="p-4">
                    <div className="text-sm font-bold text-primary flex items-center gap-2">
                      {s.raw_data?.titulo || 'Sem título'}
                      {alertText && (
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${alertText === 'Prazo Encerrado' ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'}`}>
                          <AlertCircle className="w-3 h-3 inline mr-1" />
                          {alertText}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-on-surface-variant uppercase">{s.type === 'fomento_pesquisa' ? 'Fomento Pesquisa' : s.type === 'fomento_publicacao' ? 'Fomento Publicação' : s.type}</div>
                  </td>
                  <td className="p-4 text-sm text-on-surface-variant">{researcher?.nome || '---'}</td>
                  <td className="p-4 text-sm font-bold text-primary">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      s.raw_data?.orcamento_json ? JSON.parse(s.raw_data.orcamento_json).reduce((acc: number, item: any) => acc + (item.qtd * item.valor), 0) : 0
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${statusClass}`}>
                      {statusText}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => {
                        setSelectedAccountabilityProject(s);
                        setShowAccountabilityModal(true);
                      }}
                      className="text-primary hover:underline text-xs font-bold"
                    >
                      Analisar Gastos
                    </button>
                  </td>
                </tr>
              );
            })}
            {allProjects.filter(s => s.status === 'Aprovado' || s.status === 'Em Execução').length === 0 && (
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
                          onClick={() => setSelectedResearcher(researcher)}
                          className="p-2 hover:bg-primary/10 text-primary rounded-lg" title="Ver Perfil"
                        >
                          <Eye className="w-4 h-4" />
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

  const renderAccountabilityModal = () => {
    if (!showAccountabilityModal || !selectedAccountabilityProject) return null;

    const despesas = selectedAccountabilityProject.raw_data?.despesas || [];

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-surface rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-primary">Auditoria Financeira</h2>
              <p className="text-sm text-on-surface-variant">{selectedAccountabilityProject.raw_data?.titulo}</p>
            </div>
            <button onClick={() => { setShowAccountabilityModal(false); setSelectedAccountabilityProject(null); }} className="text-on-surface-variant hover:text-primary">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {despesas.length === 0 ? (
              <div className="text-center text-on-surface-variant py-8">
                Nenhuma despesa lançada para este projeto ainda.
              </div>
            ) : (
              <div className="space-y-6">
                {despesas.map((despesa: any) => (
                  <div key={despesa.id} className="border border-outline-variant rounded-xl p-4 bg-surface-container-lowest">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-primary">{despesa.descricao}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            despesa.status === 'Aprovado' ? 'bg-success/10 text-success' :
                            despesa.status === 'Rejeitado' ? 'bg-error/10 text-error' :
                            'bg-warning/10 text-warning'
                          }`}>
                            {despesa.status}
                          </span>
                        </div>
                        <div className="text-sm text-on-surface-variant flex gap-4">
                          <span><span className="font-bold">Categoria:</span> {despesa.categoria}</span>
                          <span><span className="font-bold">Data:</span> {despesa.data}</span>
                          <span><span className="font-bold">Valor:</span> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(despesa.valor)}</span>
                        </div>
                      </div>
                      {despesa.comprovante_url && (
                        <a 
                          href={despesa.comprovante_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn-secondary flex items-center gap-2 text-sm py-1.5"
                        >
                          <FileText className="w-4 h-4" /> Ver Comprovante
                        </a>
                      )}
                    </div>

                    {despesa.status === 'Em Análise' && (
                      <div className="bg-surface-container-low p-4 rounded-lg mt-4">
                        <h5 className="text-sm font-bold text-on-surface mb-2">Análise da Despesa</h5>
                        <textarea 
                          value={selectedExpenseId === despesa.id ? expenseMessage : ''}
                          onChange={(e) => {
                            setSelectedExpenseId(despesa.id);
                            setExpenseMessage(e.target.value);
                          }}
                          className="input-field w-full h-20 mb-3"
                          placeholder="Adicione uma mensagem ou justificativa (opcional para aprovação, obrigatório para rejeição)..."
                        />
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleUpdateExpenseStatus(selectedAccountabilityProject.id, despesa.id, 'Rejeitado', expenseMessage)}
                            className="btn-primary bg-error hover:bg-error/90 text-sm py-1.5"
                            disabled={selectedExpenseId !== despesa.id || !expenseMessage.trim()}
                          >
                            <X className="w-4 h-4 mr-1" /> Rejeitar Despesa
                          </button>
                          <button 
                            onClick={() => handleUpdateExpenseStatus(selectedAccountabilityProject.id, despesa.id, 'Aprovado', expenseMessage)}
                            className="btn-primary bg-success hover:bg-success/90 text-sm py-1.5"
                          >
                            <Check className="w-4 h-4 mr-1" /> Aprovar Despesa
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {despesa.mensagem && despesa.status !== 'Em Análise' && (
                      <div className={`mt-4 p-3 rounded-lg text-sm ${despesa.status === 'Aprovado' ? 'bg-success/10 text-success-dark' : 'bg-error/10 text-error-dark'}`}>
                        <span className="font-bold">Mensagem do Gestor:</span> {despesa.mensagem}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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

        {/* Researcher Profile Modal */}
        {selectedResearcher && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-on-surface">Perfil do Pesquisador</h3>
                <button onClick={() => setSelectedResearcher(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-bold text-primary mb-2">{selectedResearcher.nome}</h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      selectedResearcher.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selectedResearcher.status || 'Pendente'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {selectedResearcher.status !== 'Ativo' && (
                      <button 
                        onClick={() => handleApproveDocument(selectedResearcher.id, true)}
                        className="btn-primary flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Aprovar Cadastro
                      </button>
                    )}
                    {selectedResearcher.status === 'Ativo' && (
                      <button 
                        onClick={() => handleUpdateResearcherStatus(selectedResearcher.id, 'Pendente')}
                        className="btn-secondary flex items-center gap-2 text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                      >
                        <AlertCircle className="w-4 h-4" /> Suspender Cadastro
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setSelectedDocument({ ...selectedResearcher, isResearcher: true });
                        setShowRejectModal(true);
                      }}
                      className="px-4 py-2 bg-error text-on-primary text-sm font-bold rounded-lg hover:bg-error/90 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" /> Rejeitar Cadastro
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <section className="bento-card">
                      <h3 className="text-lg font-bold text-on-surface mb-4 border-b border-gray-100 pb-2">Dados Pessoais</h3>
                      <div className="space-y-3">
                        <div><span className="text-xs font-bold text-on-surface-variant uppercase">CPF:</span> <p className="font-medium">{selectedResearcher.cpf}</p></div>
                        <div><span className="text-xs font-bold text-on-surface-variant uppercase">Email Institucional:</span> <p className="font-medium">{selectedResearcher.email_inst}</p></div>
                        <div><span className="text-xs font-bold text-on-surface-variant uppercase">Telefone:</span> <p className="font-medium">{selectedResearcher.raw_data?.telefone || 'Não informado'}</p></div>
                        <div><span className="text-xs font-bold text-on-surface-variant uppercase">Titulação:</span> <p className="font-medium">{selectedResearcher.titulacao || 'Não informado'}</p></div>
                        <div><span className="text-xs font-bold text-on-surface-variant uppercase">Link Lattes:</span> <p className="font-medium text-primary break-all">{selectedResearcher.raw_data?.lattes || 'Não informado'}</p></div>
                      </div>
                    </section>

                    <section className="bento-card">
                      <h3 className="text-lg font-bold text-on-surface mb-4 border-b border-gray-100 pb-2">Documentos Anexados</h3>
                      {renderDocumentLinks({ ...selectedResearcher, isResearcher: true })}
                    </section>
                  </div>

                  <div className="space-y-6">
                    <section className="bento-card">
                      <h3 className="text-lg font-bold text-on-surface mb-4 border-b border-gray-100 pb-2">Endereço</h3>
                      <div className="space-y-3">
                        <div><span className="text-xs font-bold text-on-surface-variant uppercase">CEP:</span> <p className="font-medium">{selectedResearcher.raw_data?.cep || 'Não informado'}</p></div>
                        <div><span className="text-xs font-bold text-on-surface-variant uppercase">Logradouro:</span> <p className="font-medium">{selectedResearcher.raw_data?.logradouro || 'Não informado'}, {selectedResearcher.raw_data?.numero || 'S/N'}</p></div>
                        <div><span className="text-xs font-bold text-on-surface-variant uppercase">Complemento:</span> <p className="font-medium">{selectedResearcher.raw_data?.complemento || 'Não informado'}</p></div>
                        <div><span className="text-xs font-bold text-on-surface-variant uppercase">Bairro:</span> <p className="font-medium">{selectedResearcher.raw_data?.bairro || 'Não informado'}</p></div>
                        <div><span className="text-xs font-bold text-on-surface-variant uppercase">Cidade/UF:</span> <p className="font-medium">{selectedResearcher.raw_data?.cidade || 'Não informado'}/{selectedResearcher.raw_data?.uf || 'Não informado'}</p></div>
                      </div>
                    </section>

                    <section className="bento-card">
                      <h3 className="text-lg font-bold text-on-surface mb-4 border-b border-gray-100 pb-2">Dados Bancários</h3>
                      <div className="space-y-3">
                        <div><span className="text-xs font-bold text-on-surface-variant uppercase">Banco:</span> <p className="font-medium">{selectedResearcher.raw_data?.banco || 'Não informado'}</p></div>
                        <div><span className="text-xs font-bold text-on-surface-variant uppercase">Agência:</span> <p className="font-medium">{selectedResearcher.raw_data?.agencia || 'Não informado'}</p></div>
                        <div><span className="text-xs font-bold text-on-surface-variant uppercase">Conta:</span> <p className="font-medium">{selectedResearcher.raw_data?.conta || 'Não informado'}</p></div>
                        <div><span className="text-xs font-bold text-on-surface-variant uppercase">Tipo de Conta:</span> <p className="font-medium">{selectedResearcher.raw_data?.tipo_conta || 'Não informado'}</p></div>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {renderAccountabilityModal()}
      </main>
    </div>
  );
}
