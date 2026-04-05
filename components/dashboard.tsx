'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { FileText, Plus, LogOut, User as UserIcon, BookOpen, GraduationCap, Clock, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import FomentoPesquisa from './fomento-pesquisa';
import FomentoPublicacao from './fomento-publicacao';
import ProgressBar from './progress-bar';
import Onboarding from './onboarding';
import AcompanhamentoPublicacao from './acompanhamento-publicacao';
import DossieProjeto from './dossie-projeto';
import { getFromLocal, getOneFromLocal, seedMockData } from '@/lib/local-storage';

type ViewState = 'dashboard' | 'fomento-pesquisa' | 'fomento-publicacao' | 'profile' | 'acompanhamento-publicacao' | 'dossie-projeto';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        // Seed mock data
        seedMockData(user.uid);

        // Fetch profile
        const profileData = getOneFromLocal('researchers', user.uid);
        if (profileData) {
          setProfile(profileData);
        }

        // Fetch projects (Fomento Pesquisa)
        const fpDocs = getFromLocal('fomento_pesquisa', 'authorUid', user.uid);
        const fpData = fpDocs.map((d: any) => ({ type: 'Fomento à Pesquisa', ...d }));

        // Fetch projects (Fomento Publicacao)
        const fpubDocs = getFromLocal('fomento_publicacao', 'authorUid', user.uid);
        const fpubData = fpubDocs.map((d: any) => ({ type: 'Fomento para Publicação', ...d }));

        setProjects([...fpData, ...fpubData]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, currentView]); // Refetch when view changes back to dashboard

  const renderContent = () => {
    switch (currentView) {
      case 'fomento-pesquisa':
        return <FomentoPesquisa onBack={() => setCurrentView('dashboard')} initialData={selectedProject} />;
      case 'fomento-publicacao':
        return <FomentoPublicacao onBack={() => setCurrentView('dashboard')} initialData={selectedProject} />;
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
                    profile?.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {profile?.status || 'Pendente'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary hover:bg-surface-container transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
                </button>
                <button className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary hover:bg-surface-container transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>
                </button>
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all relative" onClick={() => setCurrentView('profile')}>
                  {profile?.foto_perfil ? (
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
                  Total: {projects.filter(p => p.status !== 'Rascunho').length}
                </span>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : projects.filter(p => p.status !== 'Rascunho').length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-outline-variant rounded-xl">
                  <FileText className="w-12 h-12 text-outline-variant mx-auto mb-4 opacity-50" />
                  <h4 className="text-lg font-bold text-on-surface-variant mb-2">Nenhum projeto ativo</h4>
                  <p className="text-sm text-on-surface-variant">Você ainda não possui projetos submetidos.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.filter(p => p.status !== 'Rascunho').map((proj) => (
                    <div 
                      key={proj.id} 
                      onClick={() => {
                        if (proj.type === 'Fomento para Publicação') {
                          setSelectedProject(proj);
                          setCurrentView('acompanhamento-publicacao');
                        } else if (proj.type === 'Fomento à Pesquisa') {
                          setSelectedProject(proj);
                          setCurrentView('dossie-projeto');
                        }
                      }}
                      className={`bg-white p-6 rounded-xl shadow-sm border-l-4 border-primary flex flex-col justify-between gap-4 transition-shadow cursor-pointer hover:shadow-md hover:border-primary/50`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded bg-surface-container-low flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
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

            <section>
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
                      onClick={() => {
                        if (proj.type === 'Fomento para Publicação') {
                          setSelectedProject(proj);
                          setCurrentView('fomento-publicacao');
                        } else if (proj.type === 'Fomento à Pesquisa') {
                          setSelectedProject(proj);
                          setCurrentView('fomento-pesquisa');
                        }
                      }}
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
      </main>
    </div>
  );
}
