'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { FileText, Plus, LogOut, User as UserIcon, BookOpen, GraduationCap, Clock, ArrowLeft, AlertCircle, Home, X, Bell } from 'lucide-react';
import FomentoPesquisa from './fomento-pesquisa';
import FomentoPublicacao from './fomento-publicacao';
import ProgressBar from './progress-bar';
import Onboarding from './onboarding';
import AcompanhamentoPublicacao from './acompanhamento-publicacao';
import DossieProjeto from './dossie-projeto';
import Picite from './picite';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type ViewState = 'dashboard' | 'fomento-pesquisa' | 'fomento-publicacao' | 'profile' | 'acompanhamento-publicacao' | 'dossie-projeto' | 'picite';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectToCancel, setProjectToCancel] = useState<string | null>(null);
  const [projectDetailsModal, setProjectDetailsModal] = useState<any | null>(null);

  useEffect(() => {
    if (projectDetailsModal) {
      const updatedProject = projects.find(p => p.id === projectDetailsModal.id);
      if (updatedProject && updatedProject.status !== projectDetailsModal.status) {
        setProjectDetailsModal(updatedProject);
      }
    }
  }, [projects, projectDetailsModal]);
  const [readOnlyProject, setReadOnlyProject] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCancelProject = async () => {
    if (!projectToCancel) return;
    try {
      const docRef = doc(db, 'projects', projectToCancel);
      await updateDoc(docRef, { status: 'Cancelado pelo Pesquisador' });
      setProjects(prev => prev.map(p => p.id === projectToCancel ? { ...p, status: 'Cancelado pelo Pesquisador' } : p));
      showToast('Submissão cancelada com sucesso.', 'success');
    } catch (err) {
      console.error('Error cancelling project:', err);
      showToast('Erro ao cancelar o projeto.', 'error');
    } finally {
      setProjectToCancel(null);
    }
  };
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Set up real-time subscriptions
    const profileRef = doc(db, 'researchers', user.uid);
    const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({ ...data, id: docSnap.id });
      } else {
        setProfile(null);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching profile:', error);
      setLoading(false);
    });

    const projectsQuery = query(collection(db, 'projects'), where('authorUid', '==', user.uid));
    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const formattedProjects = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          ...JSON.parse(data.raw_data || '{}'),
          id: docSnap.id,
          type: data.type === 'fomento_pesquisa' ? 'Fomento à Pesquisa' : data.type === 'fomento_publicacao' ? 'Fomento para Publicação' : 'PICITE',
          status: data.status,
          createdAt: data.createdAt,
          raw_data: JSON.parse(data.raw_data || '{}')
        };
      });
      // Sort by createdAt descending manually since we can't easily do it with where without composite index
      formattedProjects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setProjects(formattedProjects);
    }, (error) => {
      console.error('Error fetching projects:', error);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeProjects();
    };
  }, [user]);

  const [showMessages, setShowMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile || !user) return;

    const messageObj = {
      id: Date.now().toString(),
      from: 'Pesquisador',
      text: newMessage,
      date: new Date().toISOString(),
      read: false
    };

    const updatedMessages = [...(profile.mensagens || []), messageObj];
    const updatedRawData = { ...profile, mensagens: updatedMessages };

    try {
      const docRef = doc(db, 'researchers', user.uid);
      await updateDoc(docRef, updatedRawData);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      showToast('Erro ao enviar mensagem.', 'error');
    }
  };

  const markMessagesAsRead = async () => {
    if (!profile || !profile.mensagens || !user) return;
    
    let hasUnread = false;
    const updatedMessages = profile.mensagens.map((m: any) => {
      if (m.from === 'SIEPES' && !m.read) {
        hasUnread = true;
        return { ...m, read: true };
      }
      return m;
    });

    if (hasUnread) {
      const updatedRawData = { ...profile, mensagens: updatedMessages };
      try {
        const docRef = doc(db, 'researchers', user.uid);
        await updateDoc(docRef, updatedRawData);
      } catch (err) {
        console.error('Error marking messages as read:', err);
      }
    }
  };

  const unreadCount = profile?.mensagens?.filter((m: any) => m.from === 'SIEPES' && !m.read).length || 0;

  useEffect(() => {
    if (showMessages) {
      markMessagesAsRead();
    }
  }, [showMessages]);

  const renderContent = () => {
    switch (currentView) {
      case 'fomento-pesquisa':
        return <FomentoPesquisa onBack={() => { setCurrentView('dashboard'); setReadOnlyProject(false); }} initialData={selectedProject} readOnly={readOnlyProject} />;
      case 'fomento-publicacao':
        return <FomentoPublicacao onBack={() => { setCurrentView('dashboard'); setReadOnlyProject(false); }} initialData={selectedProject} readOnly={readOnlyProject} />;
      case 'profile':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <button onClick={() => setCurrentView('dashboard')} className="flex items-center gap-2 text-primary font-bold text-sm mb-6 hover:underline">
              <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
            </button>
            <Onboarding onComplete={() => setCurrentView('dashboard')} initialData={profile} />
          </div>
        );
      case 'dossie-projeto':
        return <DossieProjeto project={selectedProject} onBack={() => setCurrentView('dashboard')} />;
      case 'acompanhamento-publicacao':
        return <AcompanhamentoPublicacao project={selectedProject} onBack={() => setCurrentView('dashboard')} />;
      case 'picite':
        return <Picite onBack={() => { setCurrentView('dashboard'); setReadOnlyProject(false); }} initialData={selectedProject} readOnly={readOnlyProject} />;
      case 'dashboard':
      default:
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
              <div>
                <h1 className="text-4xl font-bold text-primary mb-2">
                  Olá, {profile?.nome?.split(' ')[0] || 'Pesquisador'}
                </h1>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">
                    {profile?.email_inst}
                  </span>
                  <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                    profile?.status === 'Ativo' ? 'bg-success/20 text-success-dark' : 
                    (profile?.status === 'Rejeitado' || profile?.status === 'Pendência' || profile?.status === 'Pendente') ? 'bg-warning/20 text-warning-dark' : 
                    profile?.status === 'Em Análise' ? 'bg-blue-100 text-blue-800' :
                    'bg-error/20 text-error-dark'
                  }`}>
                    {profile?.status || 'Pendente'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowMessages(true)}
                  className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary hover:bg-surface-container transition-colors relative"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary hover:bg-surface-container transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>
                </button>
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all relative" onClick={() => setCurrentView('profile')}>
                  {profile?.foto_perfil && !profile.foto_perfil.startsWith('https://mock-storage.local') ? (
                    <img src={profile.foto_perfil.replace(/\/file\/d\/(.+?)\/view.*/, '/uc?export=view&id=$1')} alt="Perfil" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="w-6 h-6 text-primary" />
                  )}
                </div>
              </div>
            </header>

            {/* Unread Messages Banner */}
            {unreadCount > 0 && (
              <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
                <Bell className="w-6 h-6 text-error shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-error-dark font-bold text-lg">Você tem novas mensagens do SIEPES</h3>
                  <p className="text-error-dark/80 text-sm mt-1">
                    Existem atualizações ou pendências importantes que exigem sua atenção.
                  </p>
                  <button 
                    onClick={() => setShowMessages(true)}
                    className="mt-3 px-4 py-2 bg-error text-white text-sm font-bold rounded-lg hover:bg-error-dark transition-colors"
                  >
                    Ler Mensagens
                  </button>
                </div>
              </div>
            )}

            {/* Profile Pendencies Banner */}
            {(profile?.status === 'Rejeitado' || profile?.status === 'Pendência') && profile?.rejection_message && (
              <div className="mb-8 p-4 bg-warning/10 border border-warning/30 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
                <AlertCircle className="w-6 h-6 text-warning-dark shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-warning-dark font-bold text-lg">Seu cadastro possui pendências</h3>
                  <p className="text-warning-dark/80 text-sm mt-1">
                    {profile.rejection_message}
                  </p>
                  <button 
                    onClick={() => setCurrentView('profile')} 
                    className="mt-3 px-4 py-2 bg-warning text-warning-dark text-sm font-bold rounded-lg hover:bg-warning/20 transition-colors border border-warning/30"
                  >
                    Corrigir Cadastro
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              <button 
                onClick={() => {
                  setSelectedProject(null);
                  setReadOnlyProject(false);
                  setCurrentView('fomento-pesquisa');
                }}
                className="bento-card flex flex-col items-start text-left group hover:border-primary/30"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-50 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-on-surface mb-2">Fomento à Pesquisa</h3>
                <p className="text-sm text-on-surface-variant">Submissão de projetos para financiamento institucional.</p>
              </button>

              <button 
                onClick={() => {
                  setSelectedProject(null);
                  setReadOnlyProject(false);
                  setCurrentView('fomento-publicacao');
                }}
                className="bento-card flex flex-col items-start text-left group hover:border-primary/30"
              >
                <div className="w-12 h-12 rounded-lg bg-teal-50 text-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-on-surface mb-2">Fomento para Publicação</h3>
                <p className="text-sm text-on-surface-variant">Solicitação de custeio de taxas de publicação (APC).</p>
              </button>

              <button 
                onClick={() => {
                  setSelectedProject(null);
                  setReadOnlyProject(false);
                  setCurrentView('picite');
                }}
                className="bento-card flex flex-col items-start text-left group hover:border-primary/30"
              >
                <div className="w-12 h-12 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-on-surface mb-2">PICITE</h3>
                <p className="text-sm text-on-surface-variant">Cadastro de alunos e projetos de iniciação científica.</p>
              </button>
            </div>

            <section className="mb-12">
              <div className="flex justify-between items-center border-b-2 border-surface-container-low pb-4 mb-6">
                <h3 className="text-xl font-bold text-on-surface">Minhas Submissões Ativas</h3>
                <span className="bg-surface-container-low px-4 py-1.5 rounded-full text-sm font-bold text-on-surface-variant">
                  Total: {projects.filter(p => p.status !== 'Rascunho' && p.status !== 'Cancelado pelo Pesquisador').length}
                </span>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : projects.filter(p => p.status !== 'Rascunho' && p.status !== 'Cancelado pelo Pesquisador').length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-outline-variant rounded-xl">
                  <FileText className="w-12 h-12 text-outline-variant mx-auto mb-4 opacity-50" />
                  <h4 className="text-lg font-bold text-on-surface-variant mb-2">Nenhum projeto ativo</h4>
                  <p className="text-sm text-on-surface-variant">Você ainda não possui projetos submetidos.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.filter(p => p.status !== 'Rascunho' && p.status !== 'Cancelado pelo Pesquisador').map((proj) => (
                    <div 
                      key={proj.id} 
                      onClick={() => setProjectDetailsModal(proj)}
                      className={`bg-white p-6 rounded-xl shadow-sm border-l-4 border-primary flex flex-col justify-between gap-4 transition-shadow cursor-pointer hover:shadow-md hover:border-primary/50`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded bg-surface-container-low flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant bg-surface px-2 py-1 rounded">
                              {proj.type}
                            </span>
                            {(proj.status === 'Em Análise' || proj.status === 'Rascunho') && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProjectToCancel(proj.id);
                                }}
                                className="text-error hover:bg-error/10 p-1.5 rounded-md transition-colors"
                                title="Cancelar Submissão"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                              </button>
                            )}
                          </div>
                          <h4 className="text-lg font-bold text-on-surface mt-1 mb-1 line-clamp-2">
                            {proj.titulo || proj.titulo_projeto}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                            <Clock className="w-3 h-3" />
                            {new Date(proj.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                          {(proj.status === 'Rejeitado' || proj.status === 'Pendência') && proj.rejection_message && (
                            <div className="mt-2 p-2 bg-error/10 border border-error/20 rounded text-xs text-error flex items-start gap-1">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span><strong>Atenção:</strong> {proj.rejection_message}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <ProgressBar status={proj.status} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mb-12">
              <div className="flex justify-between items-center border-b-2 border-surface-container-low pb-4 mb-6">
                <h3 className="text-xl font-bold text-on-surface">Meus Rascunhos</h3>
                <span className="bg-surface-container-low px-4 py-1.5 rounded-full text-sm font-bold text-on-surface-variant">
                  Total: {projects.filter(p => p.status === 'Rascunho').length}
                </span>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : projects.filter(p => p.status === 'Rascunho').length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-outline-variant rounded-xl">
                  <FileText className="w-12 h-12 text-outline-variant mx-auto mb-4 opacity-50" />
                  <h4 className="text-lg font-bold text-on-surface-variant mb-2">Nenhum rascunho</h4>
                  <p className="text-sm text-on-surface-variant">Você não possui projetos em rascunho.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.filter(p => p.status === 'Rascunho').map((proj) => (
                    <div 
                      key={proj.id} 
                      onClick={() => setProjectDetailsModal(proj)}
                      className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-gray-400 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded bg-surface-container-low flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant bg-surface px-2 py-1 rounded">
                            {proj.type}
                          </span>
                          <h4 className="text-lg font-bold text-on-surface mt-1 mb-1 line-clamp-2">
                            {proj.titulo || proj.titulo_projeto}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                            <Clock className="w-3 h-3" />
                            {new Date(proj.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                      <ProgressBar status={proj.status} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-surface">
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-[100] px-6 py-3 rounded-xl shadow-lg text-white font-bold animate-in slide-in-from-top-4 ${toastMessage.type === 'success' ? 'bg-success' : 'bg-error'}`}>
          {toastMessage.message}
        </div>
      )}
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col fixed h-full z-10">
        <div className="p-8">
          <h2 className="text-2xl font-extrabold text-primary tracking-tight">SIEPES</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-1">Portal do Pesquisador</p>
        </div>
        <nav className="flex-1 px-4 flex flex-col gap-2">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              currentView === 'dashboard' ? 'bg-primary/5 text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            <Home className="w-5 h-5" /> Início (Home)
          </button>
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              currentView === 'dashboard' ? 'bg-primary/5 text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            <FileText className="w-5 h-5" /> Meus Projetos
          </button>
          <button 
            onClick={() => {
              setSelectedProject(null);
              setReadOnlyProject(false);
              setCurrentView('fomento-pesquisa');
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              currentView === 'fomento-pesquisa' ? 'bg-primary/5 text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            <Plus className="w-5 h-5" /> Novo Fomento
          </button>
          
          <hr className="my-4 border-gray-200" />
          
          <button 
            onClick={() => setCurrentView('profile')}
            className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
              currentView === 'profile' ? 'bg-primary/5 text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            <UserIcon className="w-5 h-5" /> Perfil do Pesquisador
          </button>
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-auto mb-8"
          >
            <LogOut className="w-5 h-5" /> Sair do Sistema
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-6 md:p-12 max-w-6xl mx-auto w-full">
        {renderContent()}
        {/* Cancel Modal */}
        {projectToCancel && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
            <div className="bg-surface p-6 rounded-xl max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold text-primary mb-4">Cancelar Submissão</h3>
              <p className="text-on-surface-variant mb-6">
                Tem certeza que deseja cancelar esta submissão? Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setProjectToCancel(null)} className="btn-secondary">Voltar</button>
                <button 
                  onClick={handleCancelProject}
                  className="btn-primary bg-error hover:bg-error/90"
                >
                  Confirmar Cancelamento
                </button>
              </div>
            </div>
          </div>
        )}

        {currentView === 'dashboard' && (
          <section className="mb-12 mt-12">
            <div className="flex justify-between items-center border-b-2 border-surface-container-low pb-4 mb-6">
              <h3 className="text-xl font-bold text-on-surface">Projetos Cancelados</h3>
              <span className="bg-surface-container-low px-4 py-1.5 rounded-full text-sm font-bold text-on-surface-variant">
                Total: {projects.filter(p => p.status === 'Cancelado pelo Pesquisador').length}
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : projects.filter(p => p.status === 'Cancelado pelo Pesquisador').length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-outline-variant rounded-xl">
                <FileText className="w-12 h-12 text-outline-variant mx-auto mb-4 opacity-50" />
                <h4 className="text-lg font-bold text-on-surface-variant mb-2">Nenhum projeto cancelado</h4>
                <p className="text-sm text-on-surface-variant">Você não possui projetos cancelados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.filter(p => p.status === 'Cancelado pelo Pesquisador').map((proj) => (
                  <div 
                    key={proj.id} 
                    onClick={() => setProjectDetailsModal(proj)}
                    className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-400 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded bg-red-50 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant bg-surface px-2 py-1 rounded">
                          {proj.type}
                        </span>
                        <h4 className="text-lg font-bold text-on-surface mt-1 mb-1 line-clamp-2">
                          {proj.titulo || proj.titulo_projeto}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                          <Clock className="w-3 h-3" />
                          {new Date(proj.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-4 border-t border-gray-100">
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">Cancelado</span>
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const docRef = doc(db, 'projects', proj.id);
                            await updateDoc(docRef, { status: 'Restauração Solicitada' });
                            setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, status: 'Restauração Solicitada' } : p));
                            showToast('Solicitação de restauração enviada com sucesso.', 'success');
                          } catch (err) {
                            console.error('Error requesting restoration:', err);
                            showToast('Erro ao solicitar restauração.', 'error');
                          }
                        }}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                        Solicitar Restauração
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        {/* Project Details Modal */}
        {projectDetailsModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 animate-in fade-in">
            <div className="bg-surface p-6 rounded-xl max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container-low px-2 py-1 rounded mb-2 inline-block">
                    {projectDetailsModal.type}
                  </span>
                  <h3 className="text-xl font-bold text-on-surface mt-1">
                    {projectDetailsModal.titulo || projectDetailsModal.titulo_projeto || 'Projeto sem título'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-2">
                    <Clock className="w-3 h-3" />
                    Criado em {new Date(projectDetailsModal.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <button 
                  onClick={() => setProjectDetailsModal(null)}
                  className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low p-2 rounded-full transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Status Atual</h4>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      projectDetailsModal.status === 'Aprovado' ? 'bg-green-100 text-green-800' :
                      (projectDetailsModal.status === 'Rejeitado' || projectDetailsModal.status === 'Pendência') ? 'bg-red-100 text-red-800' :
                      projectDetailsModal.status === 'Cancelado pelo Pesquisador' ? 'bg-red-100 text-red-800' :
                      projectDetailsModal.status === 'Rascunho' ? 'bg-gray-100 text-gray-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {projectDetailsModal.status}
                    </span>
                  </div>
                  {(projectDetailsModal.status === 'Rejeitado' || projectDetailsModal.status === 'Pendência') && projectDetailsModal.rejection_message && (
                    <div className="mt-3 p-3 bg-error/10 border border-error/20 rounded text-sm text-error flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <strong>Motivo da {projectDetailsModal.status === 'Pendência' ? 'pendência' : 'rejeição'}:</strong>
                        <p className="mt-1">{projectDetailsModal.rejection_message}</p>
                      </div>
                    </div>
                  )}
                </div>

                {projectDetailsModal.resumo && (
                  <div className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Resumo</h4>
                    <p className="text-sm text-on-surface line-clamp-4">{projectDetailsModal.resumo}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-container-low">
                <button 
                  onClick={() => setProjectDetailsModal(null)}
                  className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
                >
                  Fechar
                </button>
                
                {projectDetailsModal.status === 'Rascunho' ? (
                  <button 
                    onClick={() => {
                      if (projectDetailsModal.type === 'Fomento para Publicação') {
                        setSelectedProject(projectDetailsModal);
                        setCurrentView('fomento-publicacao');
                      } else if (projectDetailsModal.type === 'Fomento à Pesquisa') {
                        setSelectedProject(projectDetailsModal);
                        setCurrentView('fomento-pesquisa');
                      } else if (projectDetailsModal.type === 'PICITE') {
                        setSelectedProject(projectDetailsModal);
                        setCurrentView('picite');
                      }
                      setProjectDetailsModal(null);
                    }}
                    className="px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Continuar Edição
                  </button>
                ) : projectDetailsModal.status !== 'Cancelado pelo Pesquisador' ? (
                  <>
                    <button 
                      onClick={() => {
                        setSelectedProject(projectDetailsModal);
                        setReadOnlyProject(true);
                        if (projectDetailsModal.type === 'Fomento para Publicação') {
                          setCurrentView('fomento-publicacao');
                        } else if (projectDetailsModal.type === 'PICITE') {
                          setCurrentView('picite');
                        } else {
                          setCurrentView('fomento-pesquisa');
                        }
                        setProjectDetailsModal(null);
                      }}
                      className="px-4 py-2 bg-surface-container-low text-primary text-sm font-bold rounded-lg hover:bg-surface-container transition-colors"
                    >
                      Visualizar Dados Submetidos
                    </button>
                    {projectDetailsModal.type === 'Fomento para Publicação' && (
                      <button 
                        onClick={() => {
                          setSelectedProject(projectDetailsModal);
                          setCurrentView('acompanhamento-publicacao');
                          setProjectDetailsModal(null);
                        }}
                        className="px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Acompanhar Publicação
                      </button>
                    )}
                    {(projectDetailsModal.type === 'Fomento à Pesquisa' || projectDetailsModal.type === 'PICITE') && projectDetailsModal.status === 'Aprovado' && (
                      <button 
                        onClick={() => {
                          setSelectedProject(projectDetailsModal);
                          setCurrentView('dossie-projeto');
                          setProjectDetailsModal(null);
                        }}
                        className="px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Ver Dossiê do Projeto
                      </button>
                    )}
                    {(projectDetailsModal.type === 'Fomento à Pesquisa' || projectDetailsModal.type === 'PICITE') && projectDetailsModal.status !== 'Aprovado' && (
                      <div className="px-4 py-2 bg-surface-container-low text-on-surface-variant text-sm font-bold rounded-lg cursor-not-allowed" title="O dossiê só estará disponível após a aprovação do projeto.">
                        Dossiê Indisponível (Aguardando Aprovação)
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}

      </main>
      {showMessages && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                Mensagens e Notificações
              </h2>
              <button onClick={() => setShowMessages(false)} className="text-on-surface-variant hover:text-primary">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-primary/5">
              {(!profile?.mensagens || profile.mensagens.length === 0) ? (
                <div className="text-center text-on-surface-variant py-8">
                  Nenhuma mensagem no momento.
                </div>
              ) : (
                profile.mensagens.map((msg: any) => (
                  <div key={msg.id} className={`flex flex-col ${msg.from === 'Pesquisador' ? 'items-end' : 'items-start'}`}>
                    <div className={`shadow-sm max-w-[80%] p-4 rounded-2xl ${
                      msg.from === 'Pesquisador' 
                        ? 'bg-primary text-on-primary rounded-tr-sm' 
                        : 'bg-white border border-primary/20 text-on-surface rounded-tl-sm'
                    }`}>
                      <div className="text-xs opacity-70 mb-1 font-bold">
                        {msg.from === 'SIEPES' ? 'SIEPES / Admin' : 'Você'}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    </div>
                    <span className="text-[10px] text-on-surface-variant mt-1">
                      {new Date(msg.date).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-outline-variant bg-surface">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem para o SIEPES..."
                  className="input-field flex-1"
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  className="btn-primary flex items-center gap-2"
                >
                  Enviar
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
