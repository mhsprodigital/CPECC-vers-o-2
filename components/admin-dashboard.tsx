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
  BookOpen
} from 'lucide-react';
import { getFromLocal, saveToLocal, removeFromLocal } from '@/lib/local-storage';

type AdminTab = 'overview' | 'submissions' | 'publications' | 'accountability' | 'team';

export default function AdminDashboard() {
  const { adminUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [publications, setPublications] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', role: 'gestor' });

  useEffect(() => {
    const loadData = () => {
      setSubmissions(getFromLocal('submissions'));
      setPublications(getFromLocal('publications'));
      setAdmins(JSON.parse(localStorage.getItem('admins') || '[]'));
    };
    
    loadData();
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

  const updateStatus = (collection: string, id: string, status: string) => {
    const items = getFromLocal(collection);
    const updatedItems = items.map((item: any) => 
      item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item
    );
    saveToLocal(collection, updatedItems);
    if (collection === 'submissions') setSubmissions(updatedItems);
    if (collection === 'publications') setPublications(updatedItems);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Submissões</span>
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="text-3xl font-bold text-primary">{submissions.length}</div>
          <div className="text-xs text-on-surface-variant mt-1">Projetos em fomento</div>
        </div>
        <div className="glass-panel p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Aguardando Análise</span>
            <Clock className="w-5 h-5 text-secondary" />
          </div>
          <div className="text-3xl font-bold text-secondary">
            {submissions.filter(s => s.status === 'Em Análise' || s.status === 'Pendente').length}
          </div>
          <div className="text-xs text-on-surface-variant mt-1">Novos documentos</div>
        </div>
        <div className="glass-panel p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Publicações (APC)</span>
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="text-3xl font-bold text-primary">{publications.length}</div>
          <div className="text-xs text-on-surface-variant mt-1">Solicitações de custeio</div>
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
            {submissions.filter(s => s.status === 'Pendente').slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                <div>
                  <div className="text-sm font-bold text-primary">{s.title}</div>
                  <div className="text-xs text-on-surface-variant">Pesquisador: {s.researcherName || 'N/A'}</div>
                </div>
                <button 
                  onClick={() => setActiveTab('submissions')}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Avaliar
                </button>
              </div>
            ))}
            {submissions.filter(s => s.status === 'Pendente').length === 0 && (
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
            {submissions.filter(s => s.status === 'Aprovado').slice(0, 5).map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                <div>
                  <div className="text-sm font-bold text-primary">{s.title}</div>
                  <div className="text-xs text-on-surface-variant">Orçamento: R$ {s.budget?.total || '0,00'}</div>
                </div>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-success/10 text-success text-[10px] font-bold rounded uppercase">Em Execução</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
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
                    <button className="p-2 hover:bg-primary/10 text-primary rounded-lg">
                      <MoreVertical className="w-4 h-4" />
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

  return (
    <div className="min-h-screen bg-surface flex">
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

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'submissions' && renderSubmissions()}
        {activeTab === 'team' && renderTeam()}
        {(activeTab === 'publications' || activeTab === 'accountability') && (
          <div className="glass-panel p-12 rounded-xl text-center">
            <Clock className="w-12 h-12 text-secondary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-primary mb-2">Módulo em Desenvolvimento</h3>
            <p className="text-on-surface-variant max-w-md mx-auto">
              Esta funcionalidade está sendo implementada para permitir a gestão completa do ciclo de vida das pesquisas.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
