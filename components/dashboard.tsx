'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { FileText, Plus, LogOut, User as UserIcon, BookOpen, GraduationCap, Clock, ArrowLeft, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import FomentoPesquisa from './fomento-pesquisa';
import FomentoPublicacao from './fomento-publicacao';
import ProgressBar from './progress-bar';
import Onboarding from './onboarding';
import AcompanhamentoPublicacao from './acompanhamento-publicacao';
import DossieProjeto from './dossie-projeto';
import { getFromLocal, getOneFromLocal, seedMockData } from '@/lib/local-storage';
import { supabase } from '@/lib/supabase';

type ViewState = 'dashboard' | 'fomento-pesquisa' | 'fomento-publicacao' | 'profile' | 'acompanhamento-publicacao' | 'dossie-projeto';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectToCancel, setProjectToCancel] = useState<string | null>(null);
  const [projectDetailsModal, setProjectDetailsModal] = useState<any | null>(null);
  const [readOnlyProject, setReadOnlyProject] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCancelProject = async () => {
    if (!projectToCancel) return;
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'Cancelado pelo Pesquisador' })
        .eq('id', projectToCancel);
      if (error) throw error;
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
    const fetchData = async () => {
      if (!user) return;
      try {
        // Fetch profile from Supabase
        const { data: profileData, error: profileError } = await supabase
          .from('researchers')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        } else if (profileData) {
          // Merge raw_data with top level fields for compatibility
          setProfile({ ...profileData, ...profileData.raw_data });
        }

        // Fetch projects from Supabase
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false });

        if (projectsError) {
          console.error('Error fetching projects:', projectsError);
        } else if (projectsData) {
          const formattedProjects = projectsData.map(p => ({
            id: p.id,
            type: p.type === 'fomento_pesquisa' ? 'Fomento à Pesquisa' : p.type === 'fomento_publicacao' ? 'Fomento para Publicação' : 'PICITE',
            status: p.status,
            createdAt: p.created_at,
            raw_data: p.raw_data,
            ...p.raw_data
          }));
          setProjects(formattedProjects);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (!user) return;

    // Set up real-time subscriptions
    const projectsSubscription = supabase
      .channel('researcher-projects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `author_id=eq.${user.id}` }, () => {
        fetchData();
      })
      .subscribe();

    const profileSubscription = supabase
      .channel('researcher-profile-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'researchers', filter: `id=eq.${user.id}` }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(projectsSubscription);
      supabase.removeChannel(profileSubscription);
    };
  }, [user, currentView]); // Refetch when view changes back to dashboard

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
                    profile?.status === 'Ativo' ? 'bg-green-100 text-green-800' : profile?.status === 'Rejeitado' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {profile?.status || 'Pendente'}
                  </span>
                </div>
                {profile?.status === 'Rejeitado' && profile?.rejection_message && (
                  <div className="mt-3 p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error flex items-start gap-2 max-w-md">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <strong>Atenção:</strong> Seu perfil ou documentos foram rejeitados.
                      <p className="mt-1">{profile.rejection_message}</p>
                      <button onClick={() => setCurrentView('profile')} className="mt-2 underline font-bold">Atualizar Perfil</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <button className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary hover:bg-surface-container transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
                </button>
                <button className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary hover:bg-surface-container transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>
                </button>
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all relative" onClick={() => setCurrentView('profile')}>
                  {profile?.foto_perfil && !profile.foto_perfil.startsWith('https://mock-storage.local') ? (
                    <Image src={profile.foto_perfil} alt="Perfil" fill className="object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="w-6 h-6 text-primary" />
                  )}
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              <button 
                onClick={() => {
                  setSelectedProject(null);
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
                          {proj.status === 'Rejeitado' && proj.rejection_message && (
                            <div className="mt-2 p-2 bg-error/10 border border-error/20 rounded text-xs text-error flex items-start gap-1">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span><strong>Motivo da rejeição:</strong> {proj.rejection_message}</span>
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
          <h2 className="text-2xl font-extrabold text-primary tracking-tight">CPECC</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-1">Portal do Pesquisador</p>
        </div>
        <nav className="flex-1 px-4 flex flex-col gap-2">
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
                            const { error } = await supabase
                              .from('projects')
                              .update({ status: 'Restauração Solicitada' })
                              .eq('id', proj.id);
                            if (error) throw error;
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
                      projectDetailsModal.status === 'Rejeitado' ? 'bg-red-100 text-red-800' :
                      projectDetailsModal.status === 'Cancelado pelo Pesquisador' ? 'bg-red-100 text-red-800' :
                      projectDetailsModal.status === 'Rascunho' ? 'bg-gray-100 text-gray-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {projectDetailsModal.status}
                    </span>
                  </div>
                  {projectDetailsModal.status === 'Rejeitado' && projectDetailsModal.rejection_message && (
                    <div className="mt-3 p-3 bg-error/10 border border-error/20 rounded text-sm text-error flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <strong>Motivo da rejeição:</strong>
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
                        setCurrentView('fomento-pesquisa'); // Assuming PICITE uses the same form or needs a different one
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
    </div>
  );
}
