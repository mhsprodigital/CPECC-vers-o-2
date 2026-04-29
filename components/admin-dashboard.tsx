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
  ExternalLink,
  Download,
  MessageSquare
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getFromLocal, saveToLocal, removeFromLocal } from '@/lib/local-storage';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc, deleteDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type AdminTab = 'overview' | 'submissions' | 'publications' | 'picite' | 'messages' | 'accountability' | 'team' | 'researchers';

const GOOGLE_DRIVE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwuBZhMOrfMNzjkODqz-JE5Yu_3qTH94l5rP_Kd-UiwOzV8CWgPf3EuXxp4nvmyz92Y0w/exec';

export default function AdminDashboard() {
  const { adminUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [publications, setPublications] = useState<any[]>([]);
  const [picites, setPicites] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [researchers, setResearchers] = useState<any[]>([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: '', nome: '', cargo: '', matricula: '', role: 'gestor' });
  const [loading, setLoading] = useState(true);
  
  // New states for pending analysis modal
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showProjectDashboardModal, setShowProjectDashboardModal] = useState(false);
  const [selectedDashboardProject, setSelectedDashboardProject] = useState<any | null>(null);
  const [adminNewMessage, setAdminNewMessage] = useState('');

  const handleSendAdminMessage = async (researcherId: string) => {
    if (!adminNewMessage.trim()) return;
    
    const researcher = researchers.find(r => r.id === researcherId);
    if (!researcher) return;

    const messageObj = {
      id: Date.now().toString(),
      from: 'SIEPES',
      text: adminNewMessage,
      date: new Date().toISOString(),
      read: false
    };

    const updatedMessages = [...(researcher.mensagens || []), messageObj];
    const { raw_data, ...researcherWithoutRaw } = researcher;
    const updatedRawData = { ...researcherWithoutRaw, mensagens: updatedMessages };

    try {
      const docRef = doc(db, 'researchers', researcherId);
      await updateDoc(docRef, updatedRawData);
      setResearchers(prev => prev.map(r => r.id === researcherId ? { ...r, ...updatedRawData } : r));
      if (selectedResearcher?.id === researcherId) {
        setSelectedResearcher((prev: any) => ({ ...prev, ...updatedRawData }));
      }
      setAdminNewMessage('');
      showToast('Mensagem enviada com sucesso.', 'success');
    } catch (err) {
      console.error('Error sending message:', err);
      showToast('Erro ao enviar mensagem.', 'error');
    }
  };
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [selectedResearcher, setSelectedResearcher] = useState<any | null>(null);
  const [rejectionMessage, setRejectionMessage] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showIndividualDocRejectModal, setShowIndividualDocRejectModal] = useState(false);
  const [docToRejectInfo, setDocToRejectInfo] = useState<{doc: any, name: string, url: string} | null>(null);
  const [allowCorrection, setAllowCorrection] = useState(true);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);

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
        const researchersQuery = query(collection(db, 'researchers'));
        const unsubscribeResearchers = onSnapshot(researchersQuery, (snapshot) => {
          const researchersData = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              ...data,
              raw_data: data // Point raw_data to root so old code works!
            };
          });
          setResearchers(researchersData);
          
          // Fetch projects
          const projectsQuery = query(collection(db, 'projects'));
          const unsubscribeProjects = onSnapshot(projectsQuery, (projSnapshot) => {
            const projectsData = projSnapshot.docs.map(docSnap => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                ...data,
                raw_data: typeof data.raw_data === 'string' ? JSON.parse(data.raw_data || '{}') : (data.raw_data || {})
              };
            });
            setAllProjects(projectsData);
            
            const formattedSubmissions = projectsData
              .filter((p: any) => p.type === 'fomento_pesquisa')
              .map((p: any) => {
                const researcher = researchersData?.find((r: any) => r.id === p.authorUid);
                const rawData = typeof p.raw_data === 'string' ? JSON.parse(p.raw_data || '{}') : (p.raw_data || {});
                return {
                  id: p.id,
                  title: rawData.titulo || 'Sem título',
                  type: 'Fomento Pesquisa',
                  status: p.status,
                  createdAt: p.createdAt,
                  researcherName: (researcher as any)?.nome || 'Desconhecido',
                  budget: rawData.orcamento_json ? {
                    total: JSON.parse(rawData.orcamento_json).reduce((acc: number, item: any) => acc + (item.qtd * item.valor), 0)
                  } : { total: 0 }
                };
              });
              
            const formattedPublications = projectsData
              .filter((p: any) => p.type === 'fomento_publicacao')
              .map((p: any) => {
                const researcher = researchersData?.find((r: any) => r.id === p.authorUid);
                const rawData = typeof p.raw_data === 'string' ? JSON.parse(p.raw_data || '{}') : (p.raw_data || {});
                return {
                  id: p.id,
                  title: rawData.titulo || 'Sem título',
                  type: 'Fomento Publicação',
                  status: p.status,
                  createdAt: p.createdAt,
                  researcherName: (researcher as any)?.nome || 'Desconhecido'
                };
              });

            const formattedPicites = projectsData
              .filter((p: any) => p.type === 'picite')
              .map((p: any) => {
                const researcher = researchersData?.find((r: any) => r.id === p.authorUid);
                const rawData = typeof p.raw_data === 'string' ? JSON.parse(p.raw_data || '{}') : (p.raw_data || {});
                return {
                  id: p.id,
                  title: rawData.titulo_projeto || rawData.titulo || 'Sem título',
                  type: 'PICITE',
                  status: p.status,
                  createdAt: p.createdAt,
                  researcherName: (researcher as any)?.nome || 'Desconhecido'
                };
              });

            setSubmissions(formattedSubmissions);
            setPublications(formattedPublications);
            setPicites(formattedPicites);
            setLoading(false);
          }, (error) => {
            console.error('Error fetching projects:', error);
            setLoading(false);
          });
          
          return () => unsubscribeProjects();
        }, (error) => {
          console.error('Error fetching researchers:', error);
          setLoading(false);
        });
        
        // Load admins from Firestore
        const adminDocRef = doc(db, 'system_config', 'admins');
        getDoc(adminDocRef).then((docSnap) => {
          if (docSnap.exists() && docSnap.data().admins) {
            setAdmins(docSnap.data().admins);
          } else {
            // Fallback to local storage or default
            const localAdmins = JSON.parse(localStorage.getItem('admins') || '[]');
            if (localAdmins.length > 0) {
              setAdmins(localAdmins);
            } else {
              setAdmins([{ username: 'admin', role: 'Diretoria', nome: 'Administrador Geral', cargo: 'Diretor', matricula: '000000' }]);
            }
          }
        });

        return () => unsubscribeResearchers();
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedAdmins = [...admins, { ...newAdmin, id: Date.now().toString() }];
    setAdmins(updatedAdmins);
    
    try {
      const docRef = doc(db, 'system_config', 'admins');
      const emails = updatedAdmins.map(a => a.email).filter(Boolean);
      await setDoc(docRef, { admins: updatedAdmins, emails }, { merge: true });
      
      localStorage.setItem('admins', JSON.stringify(updatedAdmins));
      setNewAdmin({ email: '', nome: '', cargo: '', matricula: '', role: 'gestor' });
      setShowAddAdmin(false);
      showToast('Gestor adicionado com sucesso!', 'success');
    } catch (error) {
      console.error('Error saving team:', error);
      showToast('Erro ao salvar equipe no banco de dados.', 'error');
    }
  };

  const removeAdmin = async (id: string) => {
    const adminToRemove = admins.find(a => a.id === id);
    if (adminToRemove?.role === 'admin' || adminToRemove?.email === 'mhs.pro.digital@gmail.com') return; // Prevent deleting master admin
    
    const updatedAdmins = admins.filter(a => a.id !== id);
    setAdmins(updatedAdmins);
    
    try {
      const docRef = doc(db, 'system_config', 'admins');
      const emails = updatedAdmins.map(a => a.email).filter(Boolean);
      await setDoc(docRef, { admins: updatedAdmins, emails }, { merge: true });
      
      localStorage.setItem('admins', JSON.stringify(updatedAdmins));
      showToast('Colaborador removido.', 'success');
    } catch (error) {
      console.error('Error removing team member:', error);
      showToast('Erro ao remover colaborador do banco de dados.', 'error');
    }
  };

  const handleUpdateResearcherStatus = async (id: string, newStatus: string) => {
    try {
      const docRef = doc(db, 'researchers', id);
      await updateDoc(docRef, { status: newStatus });

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

  const generateFullDossier = (projectId: string) => {
    const project = allProjects.find(p => p.id === projectId);
    const researcher = researchers.find(r => r.id === project?.author_id);
    
    if (!project || !researcher) {
      showToast('Erro ao carregar dados para o dossiê.', 'error');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let equipeHtml = '<p class="text-sm text-on-surface-variant italic">Nenhum membro da equipe cadastrado.</p>';
    let cronogramaHtml = '<p class="text-sm text-on-surface-variant italic">Nenhum cronograma cadastrado.</p>';
    let orcamentoHtml = '<p class="text-sm text-on-surface-variant italic">Nenhum orçamento cadastrado.</p>';
    let autoresHtml = '';

    try {
      if (project.raw_data?.equipe_json) {
        const equipe = JSON.parse(project.raw_data.equipe_json);
        if (equipe && equipe.length > 0) {
          equipeHtml = `
            <table>
              <thead>
                <tr><th>Nome</th><th>Função</th><th>Titulação</th><th>Instituição</th></tr>
              </thead>
              <tbody>
                ${equipe.map((m: any) => `<tr><td>${m.nome || 'N/A'}</td><td>${m.funcao || 'N/A'}</td><td>${m.titulacao || 'N/A'}</td><td>${m.instituicao || 'N/A'}</td></tr>`).join('')}
              </tbody>
            </table>
          `;
        }
      }
      
      if (project.raw_data?.cronograma_json) {
        const cronograma = JSON.parse(project.raw_data.cronograma_json);
        if (cronograma && cronograma.length > 0) {
          cronogramaHtml = `
            <table>
              <thead>
                <tr><th>Atividade</th><th>Início</th><th>Fim</th></tr>
              </thead>
              <tbody>
                ${cronograma.map((c: any) => `<tr><td>${c.atividade || 'N/A'}</td><td>${c.inicio || 'N/A'}</td><td>${c.termino || 'N/A'}</td></tr>`).join('')}
              </tbody>
            </table>
          `;
        }
      }

      if (project.raw_data?.orcamento_json) {
        const orcamento = JSON.parse(project.raw_data.orcamento_json);
        if (orcamento && orcamento.length > 0) {
          orcamentoHtml = `
            <table>
              <thead>
                <tr><th>Item</th><th>Categoria</th><th>Qtd</th><th>Valor Unit.</th><th>Total</th></tr>
              </thead>
              <tbody>
                ${orcamento.map((o: any) => `<tr><td>${o.item || 'N/A'}</td><td>${o.categoria || 'N/A'}</td><td>${o.qtd || 1}</td><td>R$ ${o.valor?.toFixed(2) || '0,00'}</td><td>R$ ${(o.qtd * o.valor)?.toFixed(2) || '0,00'}</td></tr>`).join('')}
              </tbody>
              <tfoot>
                <tr style="font-weight: bold; background: #f1f5f9;">
                  <td colspan="4" style="text-align: right;">VALOR TOTAL SOLICITADO:</td>
                  <td>R$ ${orcamento.reduce((acc: number, item: any) => acc + (item.qtd * item.valor), 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          `;
        }
      }

      if (project.type === 'fomento_publicacao' && project.raw_data?.autores_json) {
        const autores = JSON.parse(project.raw_data.autores_json);
        if (autores && autores.length > 0) {
          autoresHtml = `
            <div class="section">
              <h2>Relatório de Autores da Publicação</h2>
              <table>
                <thead>
                  <tr><th>Nome</th><th>Instituição</th><th>Tipo de Autoria</th></tr>
                </thead>
                <tbody>
                  ${autores.map((m: any) => `<tr><td>${m.nome || 'N/A'}</td><td>${m.instituicao || 'N/A'}</td><td>${m.tipo || 'N/A'}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>
          `;
        }
      }
    } catch (e) {
      console.error('Error parsing project data for dossier:', e);
    }

    const docStatuses = project.raw_data?.document_statuses || {};
    let docsHtml = '<p class="text-sm text-on-surface-variant italic">Nenhum status de documento registrado.</p>';
    if (Object.keys(docStatuses).length > 0) {
      docsHtml = `
        <table>
          <thead>
            <tr><th>Documento</th><th>Status</th><th>Data da Análise</th><th>Assinatura Digital</th></tr>
          </thead>
          <tbody>
            ${Object.entries(docStatuses).map(([name, info]: [string, any]) => `
              <tr>
                <td>${name}</td>
                <td><span class="badge" style="background: ${info.status === 'Aprovado' ? '#dcfce7' : '#fee2e2'}; color: ${info.status === 'Aprovado' ? '#166534' : '#991b1b'};">${info.status}</span></td>
                <td>${info.date ? new Date(info.date).toLocaleString('pt-BR') : 'N/A'}</td>
                <td>${info.signature ? `<span style="font-size: 0.8em; color: #0369a1;">ID: ${info.signature.id}<br>Hash: ${info.signature.hash}</span>` : 'Pendente'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Dossiê Técnico-Científico - ${project.raw_data?.titulo || 'Projeto'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@700;800&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; line-height: 1.6; color: #1a202c; max-width: 1100px; margin: 0 auto; background: #f8fafc; }
            h1 { font-family: 'Manrope', sans-serif; color: #003e6f; border-bottom: 4px solid #003e6f; padding-bottom: 12px; margin-bottom: 30px; text-align: center; font-size: 2.2em; }
            h2 { font-family: 'Manrope', sans-serif; color: #006970; margin-top: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; font-size: 1.5em; }
            h3 { font-family: 'Manrope', sans-serif; color: #4a5568; font-size: 1.2em; margin-top: 25px; border-left: 5px solid #006970; padding-left: 12px; background: #f1f5f9; padding-top: 8px; padding-bottom: 8px; }
            .section { margin-bottom: 35px; background: #fff; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
            .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
            .label { font-weight: 700; color: #718096; font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }
            .value { margin-bottom: 18px; }
            .value-text { display: block; color: #1a202c; font-weight: 500; font-size: 0.95em; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.9em; background: white; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
            th { background-color: #f8fafc; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 0.8em; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 0.75em; font-weight: 700; }
            .footer { margin-top: 60px; text-align: center; font-size: 0.85em; color: #94a3b8; border-top: 2px solid #e2e8f0; padding-top: 25px; }
            .header-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; background: #003e6f; color: white; padding: 20px; border-radius: 12px; }
            .logo-placeholder { font-family: 'Manrope', sans-serif; font-weight: 800; font-size: 1.5em; }
            @media print {
              body { padding: 0; background: white; }
              button { display: none; }
              .section { border: 1px solid #eee; box-shadow: none; break-inside: avoid; }
              .header-info { background: #f1f5f9; color: #003e6f; border: 1px solid #003e6f; }
            }
          </style>
        </head>
        <body>
          <div style="text-align: right; margin-bottom: 20px;">
            <button onclick="window.print()" style="padding: 12px 28px; background: #003e6f; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 700; box-shadow: 0 10px 15px -3px rgba(0, 62, 111, 0.3); transition: all 0.2s;">Imprimir Dossiê Completo</button>
          </div>
          
          <div class="header-info">
            <div class="logo-placeholder">SIEPES / ESPDF</div>
            <div style="text-align: right;">
              <div style="font-weight: 700;">Dossiê Técnico-Científico</div>
              <div style="font-size: 0.8em; opacity: 0.9;">ID do Projeto: ${project.id}</div>
            </div>
          </div>

          <h1>Relatório Consolidado de Submissão</h1>
          
          <div class="section">
            <h2>1. Identificação do Projeto</h2>
            <div class="grid-2">
              <div class="value" style="grid-column: span 2;"><span class="label">Título do Projeto</span><span class="value-text" style="font-size: 1.3em; font-weight: 800; color: #003e6f; line-height: 1.2;">${project.raw_data?.titulo || 'N/A'}</span></div>
              <div class="value"><span class="label">Status Atual</span><span class="badge" style="background: #e0f2fe; color: #0369a1;">${project.status}</span></div>
              <div class="value"><span class="label">Tipo de Fomento</span><span class="value-text" style="font-weight: 700;">${project.type === 'fomento_pesquisa' ? 'Fomento à Pesquisa' : project.type === 'fomento_publicacao' ? 'Fomento para Publicação' : 'PICITE'}</span></div>
              <div class="value"><span class="label">Data de Submissão</span><span class="value-text">${new Date(project.created_at).toLocaleString('pt-BR')}</span></div>
              <div class="value"><span class="label">Área de Conhecimento</span><span class="value-text">${project.raw_data?.area_tematica || 'N/A'}</span></div>
            </div>
            
            <h3>Resumo da Proposta</h3>
            <div class="value-text" style="text-align: justify; white-space: pre-wrap; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">${project.raw_data?.resumo || 'N/A'}</div>
            
            <h3>Metodologia e Objetivos</h3>
            <div class="value-text" style="text-align: justify; white-space: pre-wrap; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">${project.raw_data?.metodologia || 'N/A'}</div>
          </div>

          ${project.type === 'fomento_publicacao' ? `
            <div class="section">
              <h2>2. Detalhes da Publicação</h2>
              <div class="grid-3">
                <div class="value"><span class="label">Revista Científica</span><span class="value-text">${project.raw_data?.revista || 'N/A'}</span></div>
                <div class="value"><span class="label">Qualis</span><span class="value-text">${project.raw_data?.qualis || 'N/A'}</span></div>
                <div class="value"><span class="label">Fator de Impacto</span><span class="value-text">${project.raw_data?.impacto || 'N/A'}</span></div>
                <div class="value"><span class="label">Valor da APC</span><span class="value-text" style="color: #166534; font-weight: 700;">${project.raw_data?.valor_apc || 'N/A'}</span></div>
              </div>
              ${autoresHtml}
            </div>
          ` : ''}

          <div class="section">
            <h2>3. Planejamento e Recursos</h2>
            <h3>Cronograma de Execução</h3>
            ${cronogramaHtml}
            
            <h3>Orçamento e Justificativa de Gastos</h3>
            ${orcamentoHtml}
          </div>

          <div class="section">
            <h2>4. Equipe de Pesquisa</h2>
            ${equipeHtml}
          </div>

          <div class="section">
            <h2>5. Pesquisador Responsável (Proponente)</h2>
            <div class="grid-3">
              <div class="value"><span class="label">Nome Completo</span><span class="value-text" style="font-weight: 700;">${researcher.nome || 'N/A'}</span></div>
              <div class="value"><span class="label">CPF</span><span class="value-text">${researcher.cpf || 'N/A'}</span></div>
              <div class="value"><span class="label">RG</span><span class="value-text">${researcher.raw_data?.rg || 'N/A'}</span></div>
              <div class="value"><span class="label">Data de Nascimento</span><span class="value-text">${researcher.raw_data?.nascimento ? new Date(researcher.raw_data.nascimento).toLocaleDateString('pt-BR') : 'N/A'}</span></div>
              <div class="value"><span class="label">PIS/PASEP</span><span class="value-text">${researcher.raw_data?.pis_pasep || 'N/A'}</span></div>
              <div class="value"><span class="label">E-mail Institucional</span><span class="value-text">${researcher.email_inst || 'N/A'}</span></div>
              <div class="value"><span class="label">E-mail Pessoal</span><span class="value-text">${researcher.raw_data?.email_pess || 'N/A'}</span></div>
              <div class="value"><span class="label">Telefone</span><span class="value-text">${researcher.raw_data?.telefone || 'N/A'}</span></div>
              <div class="value"><span class="label">WhatsApp</span><span class="value-text">${researcher.raw_data?.whatsapp || 'N/A'}</span></div>
              <div class="value"><span class="label">Titulação</span><span class="value-text">${researcher.titulacao || 'N/A'}</span></div>
              <div class="value"><span class="label">Graduação</span><span class="value-text">${researcher.raw_data?.graduacao || 'N/A'}</span></div>
              <div class="value"><span class="label">Área (CNPq)</span><span class="value-text">${researcher.raw_data?.area || 'N/A'}</span></div>
              <div class="value"><span class="label">Vínculo</span><span class="value-text">${researcher.raw_data?.vinculo || 'N/A'}</span></div>
              <div class="value"><span class="label">Matrícula</span><span class="value-text">${researcher.raw_data?.matricula || 'N/A'}</span></div>
              <div class="value"><span class="label">Carga Horária</span><span class="value-text">${researcher.raw_data?.carga_horaria || '0'}h/sem</span></div>
              <div class="value"><span class="label">Regional</span><span class="value-text">${researcher.raw_data?.regional || 'N/A'}</span></div>
              <div class="value"><span class="label">Lotação</span><span class="value-text">${researcher.raw_data?.lotacao || 'N/A'}</span></div>
              <div class="value"><span class="label">Setor</span><span class="value-text">${researcher.raw_data?.setor_lotacao || 'N/A'}</span></div>
              <div class="value"><span class="label">Processo SEI</span><span class="value-text">${researcher.raw_data?.endereco_sei || 'N/A'}</span></div>
              <div class="value"><span class="label">Lattes</span><span class="value-text">${researcher.lattes || 'N/A'}</span></div>
              <div class="value"><span class="label">ORCID</span><span class="value-text">${researcher.raw_data?.orcid || 'N/A'}</span></div>
            </div>
            
            <h3>Dados Sociodemográficos</h3>
            <div class="grid-3">
              <div class="value"><span class="label">Gênero</span><span class="value-text">${researcher.raw_data?.genero || 'N/A'}</span></div>
              <div class="value"><span class="label">Raça/Cor</span><span class="value-text">${researcher.raw_data?.raca || 'N/A'}</span></div>
              <div class="value"><span class="label">Ensino Médio</span><span class="value-text">${researcher.raw_data?.ensino_medio || 'N/A'}</span></div>
              <div class="value"><span class="label">Beneficiário Social</span><span class="value-text">${researcher.raw_data?.beneficiario || 'Não'}</span></div>
              <div class="value"><span class="label">PNE</span><span class="value-text">${researcher.raw_data?.pcd || 'Não'}</span></div>
              <div class="value"><span class="label">Detalhe PNE</span><span class="value-text">${researcher.raw_data?.pcd_detalhe || 'N/A'}</span></div>
            </div>

            <h3>Endereço de Contato</h3>
            <div class="value-text" style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
              ${researcher.raw_data?.logradouro || ''}, ${researcher.raw_data?.numero || ''} ${researcher.raw_data?.complemento ? `- ${researcher.raw_data.complemento}` : ''}<br>
              ${researcher.raw_data?.bairro || ''} - ${researcher.raw_data?.cidade || ''}/${researcher.raw_data?.uf || ''} - CEP: ${researcher.raw_data?.cep || ''}
            </div>
            
            <h3>Informações Bancárias para Fomento</h3>
            <div class="value-text" style="background: #f0fdf4; padding: 12px; border-radius: 8px; border: 1px solid #bbf7d0; color: #166534; font-weight: 600;">
              Banco: ${researcher.raw_data?.banco || 'N/A'} | Agência: ${researcher.raw_data?.agencia || 'N/A'} | Conta: ${researcher.raw_data?.conta || 'N/A'} (${researcher.raw_data?.tipo_conta || 'N/A'})
            </div>
          </div>

          <div class="section">
            <h2>6. Auditoria de Documentos e Assinaturas</h2>
            ${docsHtml}
          </div>

          <div class="footer">
            Este dossiê é um documento oficial gerado pelo Sistema Integrado de Inovação, Ensino, Pesquisa e Extensão (SIEPES).<br>
            Autenticado em: ${new Date().toLocaleString('pt-BR')} por ${adminUser?.nome || 'Gestor SIEPES'}.<br>
            <strong>Fundação de Ensino e Pesquisa em Ciências da Saúde - FEPECS | CNPJ: 00.394.700/0001-08</strong>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const updateStatus = async (collectionName: string, id: string, status: string) => {
    try {
      // Update in Firestore
      const docRef = doc(db, 'projects', id);
      await updateDoc(docRef, { status });
        
      // Update local state
      if (collectionName === 'submissions') {
        setSubmissions(prev => prev.map(item => item.id === id ? { ...item, status } : item));
      } else if (collectionName === 'publications') {
        setPublications(prev => prev.map(item => item.id === id ? { ...item, status } : item));
      }
      
      showToast('Status atualizado com sucesso!', 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Erro ao atualizar status.', 'error');
    }
  };

  const triggerDeleteProject = (id: string) => {
    setProjectToDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDeleteId) return;
    try {
      await deleteDoc(doc(db, 'projects', projectToDeleteId));
      setAllProjects(prev => prev.filter(p => p.id !== projectToDeleteId));
      setSubmissions(prev => prev.filter(p => p.id !== projectToDeleteId));
      setPublications(prev => prev.filter(p => p.id !== projectToDeleteId));
      setPicites(prev => prev.filter(p => p.id !== projectToDeleteId));
      showToast('Projeto deletado com sucesso!', 'success');
      setShowDeleteModal(false);
      setProjectToDeleteId(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      showToast('Erro ao deletar projeto. Verifique suas permissões.', 'error');
    }
  };

  const handleApproveDocument = async (id: string, isResearcher: boolean = false) => {
    try {
      if (isResearcher) {
        const docRef = doc(db, 'researchers', id);
        await updateDoc(docRef, { status: 'Ativo' });
        setResearchers(prev => prev.map(r => r.id === id ? { ...r, status: 'Ativo' } : r));
        
        if (selectedResearcher?.id === id) {
          setSelectedResearcher((prev: any) => ({ ...prev, status: 'Ativo' }));
        }
      } else {
        const docRef = doc(db, 'projects', id);
        await updateDoc(docRef, { status: 'Aprovado' });
        setAllProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'Aprovado' } : p));
        setSubmissions(prev => prev.map(p => p.id === id ? { ...p, status: 'Aprovado' } : p));
        setPublications(prev => prev.map(p => p.id === id ? { ...p, status: 'Aprovado' } : p));
        setPicites(prev => prev.map(p => p.id === id ? { ...p, status: 'Aprovado' } : p));
        
        if (selectedAccountabilityProject?.id === id) {
          setSelectedAccountabilityProject((prev: any) => ({ ...prev, status: 'Aprovado' }));
        }
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

      const docRef = doc(db, 'projects', projectId);
      await updateDoc(docRef, { raw_data: JSON.stringify(updatedRawData) });

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

  const handleExportData = () => {
    try {
      showToast('Gerando planilha...', 'success');
      
      // 1. Researchers Sheet
      const researchersData = researchers.map(r => {
        const raw = r.raw_data || {};
        const docs = raw.documentos_json ? JSON.parse(raw.documentos_json) : {};
        
        return {
          'ID': r.id,
          'Nome Completo': r.nome,
          'CPF': r.cpf,
          'Data de Nascimento': raw.nascimento || '',
          'RG': raw.rg || '',
          'PIS/PASEP/NIT/NIS': raw.pis_pasep || '',
          'E-mail Institucional': r.email_inst,
          'E-mail Pessoal': raw.email_pess || '',
          'Telefone para contato': raw.telefone || '',
          'WhatsApp': raw.whatsapp || '',
          'CEP': raw.cep || '',
          'Logradouro': raw.logradouro || '',
          'Número': raw.numero || '',
          'Complemento': raw.complemento || '',
          'Bairro': raw.bairro || '',
          'Cidade': raw.cidade || '',
          'UF': raw.uf || '',
          'Vínculo Empregatício': raw.vinculo || '',
          'Matrícula': raw.matricula || '',
          'Carga Horária para Pesquisa (h/sem)': raw.carga_horaria || '',
          'Regional de Saúde': raw.regional || '',
          'Lotação/Unidade': raw.lotacao || '',
          'Tipo de Unidade de Saúde': raw.tipo_unidade_saude || '',
          'Setor Específico de Lotação': raw.setor_lotacao || '',
          'Endereço SEI (processo Oficial)': raw.endereco_sei || '',
          'CEP da Instituição': raw.cep_inst || '',
          'Endereço da Instituição': raw.endereco_inst || '',
          'Graduação': raw.graduacao || '',
          'Maior Titulação': r.titulacao || '',
          'Área de Conhecimento (CNPq)': raw.area || '',
          'Histórico de Formação': raw.historico_formacao_json ? JSON.parse(raw.historico_formacao_json).map((h:any) => `${h.instituicao} - ${h.titulo} (${h.nivel}) - ${h.conclusao}`).join(' | ') : '',
          'Link do Currículo Lattes': raw.lattes || '',
          'ORCID ID': raw.orcid || '',
          'ORCID Link': raw.orcid_link || '',
          'Gênero': raw.genero || '',
          'Raça/cor': raw.raca || '',
          'Instituição de conclusão do Ensino Médio': raw.ensino_medio || '',
          'Beneficiário do Governo': raw.beneficiario || '',
          'É portador de necessidades especiais': raw.pcd || '',
          'Qual necessidade especial': raw.pcd_detalhe || '',
          'Banco': raw.banco || '',
          'Agência': raw.agencia || '',
          'Conta': raw.conta || '',
          'Tipo de Conta': raw.tipo_conta || '',
          'Status': r.status,
          'Data de Cadastro': r.created_at,
          'Doc: Foto de Perfil': raw.foto_perfil || '',
          'Doc: RG/CPF': raw.rg_cpf || '',
          'Doc: Comprovante de Residência': raw.comprovante_residencia || '',
          'Doc: Termo de Anuência': raw.termo_anuencia || '',
          'Doc: Registro Geral (RG)': docs['doc_rg'] || '',
          'Doc: Cadastro de pessoa Física (CPF)': docs['doc_cpf'] || '',
          'Doc: Registro Civil': docs['doc_civil'] || '',
          'Doc: Título de Eleitor': docs['doc_eleitor'] || '',
          'Doc: Certificado de Reservista Militar': docs['doc_militar'] || '',
          'Doc: Cartão de Vacinação': docs['doc_vacina'] || '',
          'Doc: Diploma de Graduação': docs['doc_diploma'] || '',
          'Doc: Histórico escolar': docs['doc_hist_escolar'] || '',
          'Doc: Estrangeiros (RNM/Passaporte)': docs['doc_estrangeiro'] || '',
          'Doc: Comprovante de Proficiência em Inglês': docs['doc_ingles'] || '',
          'Doc: Comprovante de Vínculo Institucional': docs['doc_vinculo'] || ''
        };
      });

      // 2. Projects Sheet
      const projectsData = allProjects.map(p => {
        const raw = p.raw_data || {};
        return {
          'ID': p.id,
          'Título': raw.titulo || '',
          'Tipo': p.type,
          'Status': p.status,
          'Autor ID': p.author_id,
          'Data de Submissão': p.created_at,
          'Resumo': raw.resumo || '',
          'Metodologia': raw.metodologia || '',
          'Objetivos': raw.objetivos || '',
          'Justificativa': raw.justificativa || '',
          'Valor Total': raw.orcamento_json ? JSON.parse(raw.orcamento_json).reduce((acc: number, item: any) => acc + (item.qtd * item.valor), 0) : 0,
          'Cronograma': raw.cronograma_json ? JSON.parse(raw.cronograma_json).map((c:any) => `${c.atividade} (${c.inicio} a ${c.termino})`).join(' | ') : '',
          'Equipe': raw.equipe_json ? JSON.parse(raw.equipe_json).map((e:any) => `${e.nome} - ${e.funcao}`).join(' | ') : '',
          'Doc: Projeto Completo': raw.projeto_completo_url || '',
          'Doc: Currículo Lattes': raw.curriculo_lattes_url || '',
          'Doc: Termo de Compromisso': raw.termo_compromisso_url || '',
          'Doc: Declaração de Anuência': raw.declaracao_anuencia_url || '',
          'Doc: Plano de Trabalho': raw.plano_trabalho_url || ''
        };
      });

      // Create Workbook
      const wb = XLSX.utils.book_new();
      
      const wsResearchers = XLSX.utils.json_to_sheet(researchersData);
      XLSX.utils.book_append_sheet(wb, wsResearchers, "Pesquisadores");
      
      const wsProjects = XLSX.utils.json_to_sheet(projectsData);
      XLSX.utils.book_append_sheet(wb, wsProjects, "Projetos e Fomentos");

      // Export
      XLSX.writeFile(wb, `SIEPES_Base_Dados_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      showToast('Planilha baixada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      showToast('Erro ao gerar planilha.', 'error');
    }
  };

  const handleExportCSV = () => {
    try {
      showToast('Gerando CSV...', 'success');
      
      const researchersData = researchers.map(r => {
        const raw = r.raw_data || {};
        return {
          'ID': r.id,
          'Nome': r.nome,
          'CPF': r.cpf,
          'Email': r.email_inst,
          'Status': r.status
        };
      });

      const projectsData = allProjects.map(p => {
        const raw = p.raw_data || {};
        return {
          'ID': p.id,
          'Titulo': raw.titulo || '',
          'Tipo': p.type,
          'Status': p.status,
          'Data': p.created_at
        };
      });

      const exportToCSVFile = (data: any[], filename: string) => {
        const ws = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' }); // Add BOM for excel
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      exportToCSVFile(researchersData, `SIEPES_Pesquisadores_${new Date().toISOString().split('T')[0]}.csv`);
      exportToCSVFile(projectsData, `SIEPES_Projetos_${new Date().toISOString().split('T')[0]}.csv`);
      
      showToast('Arquivos CSV baixados com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      showToast('Erro ao gerar CSV.', 'error');
    }
  };

  const handleRejectDocument = async (id: string, message: string, isResearcher: boolean = false, allowCorrection: boolean = true) => {
    try {
      const newStatus = allowCorrection ? 'Pendência' : 'Rejeitado';
      
      const messageObj = {
        id: Date.now().toString(),
        from: 'SIEPES',
        text: `Aviso de Rejeição/Pendência: ${message}`,
        date: new Date().toISOString(),
        read: false
      };

      if (isResearcher) {
        const researcher = researchers.find(r => r.id === id);
        if (!researcher) throw new Error('Researcher not found');
        
        const updatedMessages = [...(researcher.mensagens || []), messageObj];
        const { raw_data, ...researcherWithoutRaw } = researcher;
        const updatedRawData = { ...researcherWithoutRaw, rejection_message: message, allow_correction: allowCorrection, mensagens: updatedMessages };
        
        const docRef = doc(db, 'researchers', id);
        await updateDoc(docRef, { 
          status: newStatus,
          ...updatedRawData
        });
        setResearchers(prev => prev.map(r => r.id === id ? { ...r, status: newStatus, ...updatedRawData } : r));
        
        if (selectedResearcher?.id === id) {
          setSelectedResearcher((prev: any) => ({ ...prev, status: newStatus, ...updatedRawData }));
        }
      } else {
        const project = allProjects.find(p => p.id === id);
        if (!project) throw new Error('Project not found');

        // Add message to researcher
        const researcher = researchers.find(r => r.id === project.authorUid);
        if (researcher) {
          const updatedMessages = [...(researcher.mensagens || []), messageObj];
          const { raw_data, ...researcherWithoutRaw } = researcher;
          const updatedResearcherRawData = { ...researcherWithoutRaw, mensagens: updatedMessages };
          const researcherDocRef = doc(db, 'researchers', researcher.id);
          await updateDoc(researcherDocRef, updatedResearcherRawData);
          setResearchers(prev => prev.map(r => r.id === researcher.id ? { ...r, ...updatedResearcherRawData } : r));
        }

        const rawData = JSON.parse(project.raw_data || '{}');
        const updatedRawData = { ...rawData, rejection_message: message, allow_correction: allowCorrection };
        const projectDocRef = doc(db, 'projects', id);
        await updateDoc(projectDocRef, { 
          status: newStatus,
          raw_data: JSON.stringify(updatedRawData)
        });
        setAllProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus, raw_data: JSON.stringify(updatedRawData) } : p));
        setSubmissions(prev => prev.map(p => p.id === id ? { ...p, status: newStatus, raw_data: JSON.stringify(updatedRawData) } : p));
        setPublications(prev => prev.map(p => p.id === id ? { ...p, status: newStatus, raw_data: JSON.stringify(updatedRawData) } : p));
        setPicites(prev => prev.map(p => p.id === id ? { ...p, status: newStatus, raw_data: JSON.stringify(updatedRawData) } : p));
        
        if (selectedAccountabilityProject?.id === id) {
          setSelectedAccountabilityProject((prev: any) => ({ ...prev, status: newStatus, raw_data: updatedRawData }));
        }
      }
      setSelectedDocument(null);
      setShowRejectModal(false);
      setRejectionMessage('');
      showToast(`Documento atualizado para ${newStatus} e notificação enviada.`, 'success');
    } catch (error) {
      console.error('Error rejecting document:', error);
      showToast('Erro ao rejeitar documento.', 'error');
    }
  };

  const [signingDoc, setSigningDoc] = useState<string | null>(null);

  const handleDocumentStatusUpdate = async (docObj: any, docName: string, docUrl: string, newStatus: 'Aprovado' | 'Rejeitado', message: string = '', shouldSign: boolean = true) => {
    try {
      setSigningDoc(docName);
      
      let signatureData = null;
      let finalDocUrl = docUrl;

      // Check if it's a link that shouldn't be signed (like Lattes)
      const isSignable = docName !== 'lattes' && (docUrl.includes('drive.google.com') || docUrl.endsWith('.pdf') || docUrl.endsWith('.png') || docUrl.endsWith('.jpg') || docUrl.endsWith('.jpeg'));

      // If approved, sign the PDF
      if (newStatus === 'Aprovado' && adminUser && isSignable && shouldSign) {
        showToast(`Assinando digitalmente: ${docName}...`, 'success');
        try {
          const currentAdmin = admins.find(a => a.email === adminUser.email) || { nome: adminUser.nome, cargo: 'Gestor(a) SIEPES' };
          const signerName = currentAdmin.nome;
          const signerRole = currentAdmin.cargo;

          const res = await fetch('/api/sign-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileUrl: docUrl,
              signerName: signerName,
              signerRole: signerRole,
              documentName: docName
            })
          });
          
          const data = await res.json();
          if (data.success) {
            signatureData = data.signatureData;
            
            // Upload the signed base64 back to Google Drive
            showToast(`Enviando versão assinada para o Google Drive...`, 'success');
            try {
              const uploadRes = await fetch(GOOGLE_DRIVE_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                  fileName: `[ASSINADO] ${docName} - ${docObj.nome || docObj.title}.pdf`,
                  mimeType: 'application/pdf',
                  fileData: data.base64,
                  researcherName: docObj.nome || 'Admin',
                  researcherCpf: docObj.cpf || '000.000.000-00'
                })
              });
              
              const uploadData = await uploadRes.json();
              if (uploadData.success) {
                finalDocUrl = uploadData.url;
                showToast(`Documento assinado e atualizado no Drive!`, 'success');
              } else {
                console.error('Failed to upload signed PDF:', uploadData.error);
                showToast(`Aviso: PDF assinado, mas não foi possível atualizar no Drive. Usando link original.`, 'error');
              }
            } catch (uploadErr) {
              console.error('Error uploading signed PDF:', uploadErr);
              showToast(`Aviso: Erro ao enviar PDF assinado para o Drive.`, 'error');
            }
          } else {
            console.error('Failed to sign PDF:', data.error);
            showToast(`Aviso: Não foi possível assinar o PDF (${data.error}). O status será atualizado mesmo assim.`, 'error');
          }
        } catch (e) {
          console.error('Error calling sign-pdf API:', e);
          showToast('Aviso: Erro ao tentar assinar o PDF. O status será atualizado.', 'error');
        }
      }

      const currentStatuses = docObj.raw_data?.document_statuses || {};
      const updatedStatuses = {
        ...currentStatuses,
        [docName]: { 
          status: newStatus, 
          message, 
          signature: signatureData, 
          date: new Date().toISOString(),
          signedUrl: finalDocUrl !== docUrl ? finalDocUrl : null
        }
      };

      // Also update the URL in the documents_json if it changed
      const updatedRawData = { ...docObj.raw_data, document_statuses: updatedStatuses };
      
      if (finalDocUrl !== docUrl) {
        if (docObj.isResearcher) {
          if (docObj.raw_data.documentos_json) {
            try {
              const docs = JSON.parse(docObj.raw_data.documentos_json);
              if (docs[docName]) {
                docs[docName] = finalDocUrl;
                updatedRawData.documentos_json = JSON.stringify(docs);
              }
            } catch (e) {}
          }
          // Always check fixed fields for researchers
          if (docName === 'foto_perfil') updatedRawData.foto_perfil = finalDocUrl;
          else if (docName === 'rg_cpf') updatedRawData.rg_cpf = finalDocUrl;
          else if (docName === 'lattes') updatedRawData.lattes = finalDocUrl;
          else if (docName === 'comprovante_residencia') updatedRawData.comprovante_residencia = finalDocUrl;
          else if (docName === 'termo_anuencia') updatedRawData.termo_anuencia = finalDocUrl;
        } else if (docObj.type === 'fomento_pesquisa' && docObj.raw_data?.anexos_json) {
          try {
            const anexos = JSON.parse(docObj.raw_data.anexos_json);
            if (anexos[docName]) {
              anexos[docName] = finalDocUrl;
              updatedRawData.anexos_json = JSON.stringify(anexos);
            }
          } catch (e) {}
        } else if (docObj.type === 'fomento_publicacao' && docObj.raw_data?.documentos) {
          const docs = { ...docObj.raw_data.documentos };
          if (docName === 'Artigo') docs.artigo_url = finalDocUrl;
          else if (docName === 'Resumo') docs.resumo_url = finalDocUrl;
          else if (docName === 'Carta de Aceite') docs.aceite_url = finalDocUrl;
          updatedRawData.documentos = docs;
        } else if (docObj.type === 'picite' && docName === 'Plano de Trabalho') {
          updatedRawData.plano_trabalho_url = finalDocUrl;
        }
      }

      if (docObj.isResearcher) {
        // If status is Pendente, change to Em Análise
        let newResearcherStatus = docObj.status === 'Pendente' ? 'Em Análise' : docObj.status;
        
        const { raw_data: __ignored, ...cleanedRawData } = updatedRawData;

        if (newStatus === 'Rejeitado') {
          newResearcherStatus = 'Pendência';
          const messageObj = {
            id: Date.now().toString(),
            from: 'SIEPES',
            text: `Aviso de Rejeição no documento "${docName}": ${message}`,
            date: new Date().toISOString(),
            read: false
          };
          cleanedRawData.mensagens = [...(docObj.mensagens || []), messageObj];
          cleanedRawData.rejection_message = `Documento "${docName}" rejeitado: ${message}`;
          cleanedRawData.allow_correction = true;
        }

        const docRef = doc(db, 'researchers', docObj.id);
        await updateDoc(docRef, { 
          ...cleanedRawData,
          status: newResearcherStatus
        });
        setResearchers(prev => prev.map(r => r.id === docObj.id ? { ...r, ...cleanedRawData, status: newResearcherStatus, raw_data: cleanedRawData } : r));
        
        // Update selectedResearcher if it's the one being edited
        if (selectedResearcher?.id === docObj.id) {
          setSelectedResearcher((prev: any) => ({ ...prev, ...cleanedRawData, status: newResearcherStatus, raw_data: cleanedRawData }));
        }
      } else {
        // If status is Pendente, change to Em Análise for projects too
        let newProjectStatus = docObj.status === 'Pendente' ? 'Em Análise' : docObj.status;

        if (newStatus === 'Rejeitado') {
          newProjectStatus = 'Pendência';
          const messageObj = {
            id: Date.now().toString(),
            from: 'SIEPES',
            text: `Aviso de Rejeição no documento "${docName}" do projeto "${updatedRawData?.titulo || updatedRawData?.titulo_projeto}": ${message}`,
            date: new Date().toISOString(),
            read: false
          };
          
          updatedRawData.rejection_message = `Documento "${docName}" rejeitado: ${message}`;
          updatedRawData.allow_correction = true;
          
          const researcher = researchers.find(r => r.id === docObj.authorUid);
          if (researcher) {
            const updatedMessages = [...(researcher.mensagens || []), messageObj];
            const updatedResearcherRawData = { ...researcher, mensagens: updatedMessages };
            const researcherDocRef = doc(db, 'researchers', researcher.id);
            await updateDoc(researcherDocRef, updatedResearcherRawData);
            setResearchers(prev => prev.map(r => r.id === researcher.id ? { ...r, ...updatedResearcherRawData } : r));
          }
        }

        const projectDocRef = doc(db, 'projects', docObj.id);
        await updateDoc(projectDocRef, { 
          raw_data: JSON.stringify(updatedRawData),
          status: newProjectStatus
        });
        
        setAllProjects(prev => prev.map(p => p.id === docObj.id ? { ...p, raw_data: updatedRawData, status: newProjectStatus } : p));
        setSubmissions(prev => prev.map(p => p.id === docObj.id ? { ...p, raw_data: updatedRawData, status: newProjectStatus } : p));
        setPublications(prev => prev.map(p => p.id === docObj.id ? { ...p, raw_data: updatedRawData, status: newProjectStatus } : p));
        setPicites(prev => prev.map(p => p.id === docObj.id ? { ...p, raw_data: updatedRawData, status: newProjectStatus } : p));
        
        // Update selectedAccountabilityProject if it's the one being edited
        if (selectedAccountabilityProject?.id === docObj.id) {
          setSelectedAccountabilityProject((prev: any) => ({ ...prev, raw_data: updatedRawData, status: newProjectStatus }));
        }
      }

      // Update selected document state
      setSelectedDocument({ ...docObj, raw_data: updatedRawData, status: docObj.status === 'Pendente' ? 'Em Análise' : docObj.status });
      
      showToast(`Status do documento atualizado para ${newStatus}.`, 'success');
    } catch (error) {
      console.error('Error updating document status:', error);
      showToast('Erro ao atualizar status do documento.', 'error');
    } finally {
      setSigningDoc(null);
    }
  };

  const renderDocumentLinks = (doc: any) => {
    const urls: { name: string, label: string, url: string }[] = [];
    if (doc.isResearcher && doc.raw_data) {
      if (doc.raw_data.foto_perfil) urls.push({ name: 'foto_perfil', label: 'Foto de Perfil', url: doc.raw_data.foto_perfil });
      if (doc.raw_data.rg_cpf) urls.push({ name: 'rg_cpf', label: 'RG/CPF', url: doc.raw_data.rg_cpf });
      if (doc.raw_data.lattes) urls.push({ name: 'lattes', label: 'Currículo Lattes', url: doc.raw_data.lattes });
      if (doc.raw_data.comprovante_residencia) urls.push({ name: 'comprovante_residencia', label: 'Comprovante de Residência', url: doc.raw_data.comprovante_residencia });
      if (doc.raw_data.termo_anuencia) urls.push({ name: 'termo_anuencia', label: 'Termo de Anuência', url: doc.raw_data.termo_anuencia });
      
      try {
        if (doc.raw_data.documentos_json) {
          const docs = JSON.parse(doc.raw_data.documentos_json);
          const labels: Record<string, string> = {
            'doc_rg': 'Registro Geral (RG)',
            'doc_cpf': 'Cadastro de pessoa Física (CPF)',
            'doc_civil': 'Registro Civil',
            'doc_eleitor': 'Título de Eleitor',
            'doc_militar': 'Certificado de Reservista Militar',
            'doc_residencia': 'Comprovante de Residência',
            'doc_vacina': 'Cartão de Vacinação',
            'doc_diploma': 'Diploma de Graduação',
            'doc_hist_escolar': 'Histórico escolar',
            'doc_estrangeiro': 'Estrangeiros (RNM/Passaporte)',
            'doc_ingles': 'Comprovante de Proficiência em Inglês',
            'doc_vinculo': 'Comprovante de Vínculo Institucional'
          };
          Object.entries(docs).forEach(([key, value]) => {
            if (value) urls.push({ name: key, label: labels[key] || key, url: value as string });
          });
        }
      } catch (e) {}
    } else if (doc.type === 'fomento_pesquisa' && doc.raw_data?.anexos_json) {
      try {
        const anexos = JSON.parse(doc.raw_data.anexos_json);
        const labels: Record<string, string> = {
          'projeto_completo': 'Projeto Completo',
          'planos_trabalho': 'Planos de Trabalho Individuais',
          'aprovacao_cep': 'Aprovação do CEP/CONEP'
        };
        Object.entries(anexos).forEach(([key, value]) => {
          if (value) urls.push({ name: key, label: labels[key] || key, url: value as string });
        });
      } catch (e) {}
    } else if (doc.type === 'fomento_publicacao' && doc.raw_data?.documentos) {
      const docs = doc.raw_data.documentos;
      if (docs.artigo_url) urls.push({ name: 'Artigo', label: 'Artigo', url: docs.artigo_url });
      if (docs.resumo_url) urls.push({ name: 'Resumo', label: 'Resumo', url: docs.resumo_url });
      if (docs.aceite_url) urls.push({ name: 'Carta de Aceite', label: 'Carta de Aceite', url: docs.aceite_url });
    } else if (doc.type === 'picite' && doc.raw_data?.plano_trabalho_url) {
      urls.push({ name: 'Plano de Trabalho', label: 'Plano de Trabalho', url: doc.raw_data.plano_trabalho_url });
    }

    if (urls.length === 0) return <p className="text-sm text-on-surface-variant">Nenhum arquivo anexado.</p>;

    const docStatuses = doc.raw_data?.document_statuses || {};

    return (
      <div className="space-y-6">
        {urls.map((u, i) => {
          const statusInfo = docStatuses[u.name];
          const isApproved = statusInfo?.status === 'Aprovado';
          const isRejected = statusInfo?.status === 'Rejeitado';
          const isSigning = signingDoc === u.name;
          const isSignable = u.name !== 'lattes' && (u.url.includes('drive.google.com') || u.url.endsWith('.pdf') || u.url.match(/\.(jpeg|jpg|png)$/i));

          return (
            <div key={i} className={`border rounded-lg overflow-hidden ${isApproved ? 'border-success/30' : isRejected ? 'border-error/30' : 'border-outline-variant'}`}>
              <div className={`p-3 border-b font-bold text-sm flex justify-between items-center ${isApproved ? 'bg-success/5 border-success/20' : isRejected ? 'bg-error/5 border-error/20' : 'bg-surface-container-low border-outline-variant'}`}>
                <div className="flex items-center gap-2">
                  <span>{u.label}</span>
                  {isApproved && <span className="px-2 py-0.5 rounded text-[10px] uppercase bg-success/10 text-success">Aprovado</span>}
                  {isRejected && <span className="px-2 py-0.5 rounded text-[10px] uppercase bg-error/10 text-error">Rejeitado</span>}
                </div>
                <div className="flex items-center gap-2">
                  <a href={u.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-md transition-colors text-xs">
                    <ExternalLink className="w-3 h-3" /> Abrir
                  </a>
                </div>
              </div>
              
              <div className="p-6 bg-surface-container-lowest flex flex-col items-center justify-center text-center">
                <FileText className={`w-12 h-12 mb-3 ${isApproved ? 'text-success/50' : isRejected ? 'text-error/50' : 'text-on-surface-variant/50'}`} />
                
                {statusInfo?.signature && (
                  <div className="mb-4 p-3 bg-success/5 border border-success/20 rounded-lg text-left w-full max-w-md">
                    <div className="flex items-center gap-2 text-success font-bold text-xs mb-1">
                      <Shield className="w-4 h-4" /> Assinatura Digital SIEPES
                    </div>
                    <div className="text-[10px] text-on-surface-variant space-y-1">
                      <p><span className="font-bold">Assinado por:</span> {statusInfo.signature.signerName}</p>
                      <p><span className="font-bold">Data/Hora:</span> {statusInfo.signature.timestamp}</p>
                      <p><span className="font-bold">ID:</span> {statusInfo.signature.id}</p>
                      <p><span className="font-bold">Hash:</span> {statusInfo.signature.hash}</p>
                    </div>
                  </div>
                )}

                {isRejected && statusInfo?.message && (
                  <div className="mb-4 p-3 bg-error/5 border border-error/20 rounded-lg text-left w-full max-w-md text-sm text-error-dark">
                    <span className="font-bold">Motivo da Rejeição:</span> {statusInfo.message}
                  </div>
                )}

                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={() => {
                      setDocToRejectInfo({ doc, name: u.name, url: u.url });
                      setRejectionMessage('');
                      setShowIndividualDocRejectModal(true);
                    }}
                    disabled={isSigning}
                    className="px-3 py-1.5 bg-error/10 text-error hover:bg-error/20 rounded text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <X className="w-3 h-3" /> Rejeitar
                  </button>
                  {isSignable && (
                    <button 
                      onClick={() => handleDocumentStatusUpdate(doc, u.name, u.url, 'Aprovado', '', false)}
                      disabled={isSigning || isApproved}
                      className="px-3 py-1.5 bg-success/10 text-success hover:bg-success/20 rounded text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      {isSigning ? <Clock className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} 
                      {isSigning ? 'Processando...' : 'Só Aprovar'}
                    </button>
                  )}
                  <button 
                    onClick={() => handleDocumentStatusUpdate(doc, u.name, u.url, 'Aprovado', '', true)}
                    disabled={isSigning || isApproved}
                    className="px-3 py-1.5 bg-success/10 text-success hover:bg-success/20 rounded text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    {isSigning ? <Clock className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} 
                    {isSigning ? 'Processando...' : (isSignable ? 'Aprovar e Assinar' : 'Aprovar')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderProjectDashboardModal = () => {
    if (!showProjectDashboardModal || !selectedDashboardProject) return null;

    const project = selectedDashboardProject;
    const isApprovedOrExecuting = project.status === 'Aprovado' || project.status === 'Em Execução';
    const researcher = researchers.find(r => r.id === project.authorUid);

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
        <div className="bg-surface rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
            <div>
              <h2 className="text-xl font-bold text-primary">Dashboard Administrativo do Projeto</h2>
              <p className="text-sm text-on-surface-variant font-bold">{project.raw_data?.titulo || 'Projeto sem título'}</p>
            </div>
            <button onClick={() => { setShowProjectDashboardModal(false); setSelectedDashboardProject(null); }} className="text-on-surface-variant hover:text-primary p-2">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bento-card">
                <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4 border-b pb-2">Informações Gerais</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-on-surface-variant block">Pesquisador Responsável</span>
                    <span className="text-sm font-bold">{researcher?.nome || 'Desconhecido'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-on-surface-variant block">Status Atual</span>
                    <span className={`inline-block px-2 py-1 mt-1 rounded text-[10px] font-bold uppercase cursor-pointer hover:opacity-80 transition-opacity ${
                      project.status === 'Aprovado' ? 'bg-success/10 text-success' :
                      project.status === 'Em Execução' ? 'bg-primary/10 text-primary' :
                      project.status === 'Em Análise' ? 'bg-yellow-100 text-yellow-800' :
                      project.status === 'Rascunho' ? 'bg-gray-100 text-gray-800' :
                      'bg-error/10 text-error'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-on-surface-variant block">Data de Criação</span>
                    <span className="text-sm">{new Date(project.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {project.type && (
                    <div>
                      <span className="text-xs text-on-surface-variant block">Tipo de Fomento</span>
                      <span className="text-sm capitalize">{project.type.replace('_', ' ')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bento-card">
                <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4 border-b pb-2">Prazos e Relatórios</h3>
                {isApprovedOrExecuting ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-blue-800 block">Relatório Parcial</span>
                        <span className="text-xs text-blue-600 block mt-1">
                          {project.type === 'picite' 
                            ? 'Obrigatório o envio de acordo com o edital do PICITE para renovação da bolsa (geralmente após 6 meses de vigência).' 
                            : 'Deve ser enviado em até 6 meses após a assinatura ou liberação do recurso, conforme plano de trabalho.'}
                        </span>
                      </div>
                    </div>
                    {project.type === 'picite' ? (
                      <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-yellow-800 block">Frequência/Mensal</span>
                          <span className="text-xs text-yellow-600 block mt-1">
                            Acompanhamento de frequência e relatórios mensais para liberação das bolsas PICITE.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-purple-50 border border-purple-100 p-3 rounded-lg flex items-start gap-3">
                        <FileText className="w-5 h-5 text-purple-600 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-purple-800 block">Relatório Final</span>
                          <span className="text-xs text-purple-600 block mt-1">
                            Envio da prestação de contas integral e relatório científico no fechamento do projeto.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-on-surface-variant bg-surface-container-low p-4 rounded-lg text-center">
                    Os prazos e exigências serão estabelecidos após a aprovação e assinatura do projeto.
                  </div>
                )}
              </div>
            </div>

            <div className="bento-card">
              <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4 border-b pb-2">Documentos Submetidos</h3>
              <div className="bg-surface-container-low rounded-lg p-4">
                {renderDocumentLinks(project)}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-outline-variant">
               <button 
                 onClick={() => {
                   setSelectedDocument(project);
                   setShowProjectDashboardModal(false);
                   setShowPendingModal(true);
                 }}
                 className="btn-secondary"
               >
                 Análise Detalhada
               </button>
               {project.type !== 'picite' && (
                 <button 
                   onClick={() => {
                     setSelectedAccountabilityProject(project);
                     setShowProjectDashboardModal(false);
                     setShowAccountabilityModal(true);
                   }}
                   className="btn-primary flex items-center gap-2"
                   disabled={!isApprovedOrExecuting}
                 >
                   <DollarSign className="w-4 h-4" /> Ver Auditoria Financeira
                 </button>
               )}
            </div>
          </div>
        </div>
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
    
    let pendingItems = [...pendingProjects, ...pendingResearchers];
    
    // Ensure selected document is in the list even if it is no longer pending
    if (selectedDocument && !pendingItems.find(i => i.id === selectedDocument.id)) {
      pendingItems = [selectedDocument, ...pendingItems];
    }

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
                        onClick={() => {
                          const docStatuses = selectedDocument.raw_data?.document_statuses || {};
                          const urls: { name: string, label: string, url: string }[] = [];
                          
                          if (selectedDocument.isResearcher && selectedDocument.raw_data) {
                            if (selectedDocument.raw_data.foto_perfil) urls.push({ name: 'foto_perfil', label: 'Foto de Perfil', url: selectedDocument.raw_data.foto_perfil });
                            if (selectedDocument.raw_data.rg_cpf) urls.push({ name: 'rg_cpf', label: 'RG/CPF', url: selectedDocument.raw_data.rg_cpf });
                            if (selectedDocument.raw_data.lattes) urls.push({ name: 'lattes', label: 'Currículo Lattes', url: selectedDocument.raw_data.lattes });
                            if (selectedDocument.raw_data.comprovante_residencia) urls.push({ name: 'comprovante_residencia', label: 'Comprovante de Residência', url: selectedDocument.raw_data.comprovante_residencia });
                            if (selectedDocument.raw_data.termo_anuencia) urls.push({ name: 'termo_anuencia', label: 'Termo de Anuência', url: selectedDocument.raw_data.termo_anuencia });
                            try {
                              if (selectedDocument.raw_data.documentos_json) {
                                const docs = JSON.parse(selectedDocument.raw_data.documentos_json);
                                const labels: Record<string, string> = {
                                  'doc_rg': 'Registro Geral (RG)',
                                  'doc_cpf': 'Cadastro de pessoa Física (CPF)',
                                  'doc_civil': 'Registro Civil',
                                  'doc_eleitor': 'Título de Eleitor',
                                  'doc_militar': 'Certificado de Reservista Militar',
                                  'doc_residencia': 'Comprovante de Residência',
                                  'doc_vacina': 'Cartão de Vacinação',
                                  'doc_diploma': 'Diploma de Graduação',
                                  'doc_hist_escolar': 'Histórico escolar',
                                  'doc_estrangeiro': 'Estrangeiros (RNM/Passaporte)',
                                  'doc_ingles': 'Comprovante de Proficiência em Inglês',
                                  'doc_vinculo': 'Comprovante de Vínculo Institucional'
                                };
                                Object.entries(docs).forEach(([key, value]) => {
                                  if (value) urls.push({ name: key, label: labels[key] || key, url: value as string });
                                });
                              }
                            } catch (e) {}
                          } else if (selectedDocument.type === 'fomento_pesquisa' && selectedDocument.raw_data?.anexos_json) {
                            try {
                              const anexos = JSON.parse(selectedDocument.raw_data.anexos_json);
                              const labels: Record<string, string> = {
                                'projeto_completo': 'Projeto Completo',
                                'planos_trabalho': 'Planos de Trabalho Individuais',
                                'aprovacao_cep': 'Aprovação do CEP/CONEP'
                              };
                              Object.entries(anexos).forEach(([key, value]) => {
                                if (value) urls.push({ name: key, label: labels[key] || key, url: value as string });
                              });
                            } catch (e) {}
                          } else if (selectedDocument.type === 'fomento_publicacao' && selectedDocument.raw_data?.documentos) {
                            const docs = selectedDocument.raw_data.documentos;
                            if (docs.artigo_url) urls.push({ name: 'Artigo', label: 'Artigo', url: docs.artigo_url });
                            if (docs.resumo_url) urls.push({ name: 'Resumo', label: 'Resumo', url: docs.resumo_url });
                            if (docs.aceite_url) urls.push({ name: 'Carta de Aceite', label: 'Carta de Aceite', url: docs.aceite_url });
                          } else if (selectedDocument.type === 'picite' && selectedDocument.raw_data?.plano_trabalho_url) {
                            urls.push({ name: 'Plano de Trabalho', label: 'Plano de Trabalho', url: selectedDocument.raw_data.plano_trabalho_url });
                          }

                          const allAnalyzed = urls.every(u => docStatuses[u.name]?.status);
                          if (!allAnalyzed && urls.length > 0) {
                            showToast('Analise todos os documentos antes de concluir.', 'error');
                            return;
                          }

                          const hasRejections = urls.some(u => docStatuses[u.name]?.status === 'Rejeitado');
                          
                          if (hasRejections) {
                            // Collect rejection messages
                            const rejectionMessages = urls
                              .filter(u => docStatuses[u.name]?.status === 'Rejeitado')
                              .map(u => `${u.label}: ${docStatuses[u.name]?.message}`)
                              .join('\n');
                            
                            setRejectionMessage(`Os seguintes documentos foram rejeitados:\n${rejectionMessages}`);
                            setShowRejectModal(true);
                          } else {
                            handleApproveDocument(selectedDocument.id, selectedDocument.isResearcher);
                          }
                        }}
                        className="px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:bg-primary/90 flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Concluir Análise
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto">
                    <div className="space-y-4">
                      {selectedDocument.type === 'fomento_pesquisa' && selectedDocument.raw_data && (
                        <div className="bg-surface-container-low p-4 rounded-lg mb-6 shadow-sm border border-outline-variant">
                          <h4 className="font-bold text-sm text-primary mb-3 uppercase tracking-wider">Conteúdo do Projeto</h4>
                          
                          <div className="grid gap-4">
                            {selectedDocument.raw_data.resumo && (
                              <div>
                                <h5 className="font-bold text-xs text-on-surface-variant flex items-center gap-1">
                                  Resumo
                                </h5>
                                <div className="text-sm bg-surface p-3 mt-1 rounded border border-outline-variant/50 text-justify text-on-surface leading-relaxed max-h-40 overflow-y-auto">
                                  {selectedDocument.raw_data.resumo}
                                </div>
                              </div>
                            )}
                            
                            {selectedDocument.raw_data.metodologia && (
                              <div>
                                <h5 className="font-bold text-xs text-on-surface-variant flex items-center gap-1">
                                  Metodologia
                                </h5>
                                <div className="text-sm bg-surface p-3 mt-1 rounded border border-outline-variant/50 text-justify text-on-surface leading-relaxed max-h-40 overflow-y-auto">
                                  {selectedDocument.raw_data.metodologia}
                                </div>
                              </div>
                            )}

                            {selectedDocument.raw_data.objetivos && (
                              <div>
                                <h5 className="font-bold text-xs text-on-surface-variant flex items-center gap-1">
                                  Objetivos
                                </h5>
                                <div className="text-sm bg-surface p-3 mt-1 rounded border border-outline-variant/50 text-justify text-on-surface leading-relaxed max-h-40 overflow-y-auto">
                                  {selectedDocument.raw_data.objetivos}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
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
                <div className="flex gap-2 items-center">
                  <span className="px-2 py-1 bg-success/10 text-success text-[10px] font-bold rounded uppercase">Em Execução</span>
                  <button 
                    onClick={() => triggerDeleteProject(s.id)}
                    className="p-1 hover:bg-red-500/10 text-red-500 rounded-lg shrink-0" title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
                      onClick={() => {
                        const project = allProjects.find(proj => proj.id === s.id);
                        if (project) {
                          setSelectedDashboardProject(project);
                          setShowProjectDashboardModal(true);
                        }
                      }}
                      className="p-2 hover:bg-secondary/10 text-secondary rounded-lg" title="Painel do Projeto"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        const project = allProjects.find(p => p.id === s.id);
                        const researcher = researchers.find(r => r.id === project?.author_id);
                        if (project && researcher) {
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            let equipeHtml = 'Nenhum membro da equipe cadastrado.';
                            let cronogramaHtml = 'Nenhum cronograma cadastrado.';
                            let orcamentoHtml = 'Nenhum orçamento cadastrado.';
                            
                            try {
                              if (project.raw_data?.equipe_json) {
                                const equipe = JSON.parse(project.raw_data.equipe_json);
                                if (equipe && equipe.length > 0) {
                                  equipeHtml = `
                                    <table>
                                      <thead>
                                        <tr><th>Nome</th><th>Função</th><th>Titulação</th><th>Instituição</th></tr>
                                      </thead>
                                      <tbody>
                                        ${equipe.map((m: any) => `<tr><td>${m.nome || 'N/A'}</td><td>${m.funcao || 'N/A'}</td><td>${m.titulacao || 'N/A'}</td><td>${m.instituicao || 'N/A'}</td></tr>`).join('')}
                                      </tbody>
                                    </table>
                                  `;
                                }
                              }
                              
                              if (project.raw_data?.cronograma_json) {
                                const cronograma = JSON.parse(project.raw_data.cronograma_json);
                                if (cronograma && cronograma.length > 0) {
                                  cronogramaHtml = `
                                    <table>
                                      <thead>
                                        <tr><th>Atividade</th><th>Início</th><th>Fim</th></tr>
                                      </thead>
                                      <tbody>
                                        ${cronograma.map((c: any) => `<tr><td>${c.atividade || 'N/A'}</td><td>${c.inicio || 'N/A'}</td><td>${c.fim || 'N/A'}</td></tr>`).join('')}
                                      </tbody>
                                    </table>
                                  `;
                                }
                              }

                              if (project.raw_data?.orcamento_json) {
                                const orcamento = JSON.parse(project.raw_data.orcamento_json);
                                if (orcamento && orcamento.length > 0) {
                                  orcamentoHtml = `
                                    <table>
                                      <thead>
                                        <tr><th>Item</th><th>Categoria</th><th>Valor</th><th>Justificativa</th></tr>
                                      </thead>
                                      <tbody>
                                        ${orcamento.map((o: any) => `<tr><td>${o.item || 'N/A'}</td><td>${o.categoria || 'N/A'}</td><td>R$ ${o.valor || '0,00'}</td><td>${o.justificativa || 'N/A'}</td></tr>`).join('')}
                                      </tbody>
                                    </table>
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
                    <button 
                      onClick={() => triggerDeleteProject(s.id)}
                      className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg" title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
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

  const [selectedChatResearcherId, setSelectedChatResearcherId] = useState<string | null>(null);

  const renderMessages = () => {
    const researchersWithMessages = researchers.filter(r => r.mensagens && r.mensagens.length > 0)
      .sort((a, b) => {
        const lastA = new Date(a.mensagens[a.mensagens.length - 1].date).getTime();
        const lastB = new Date(b.mensagens[b.mensagens.length - 1].date).getTime();
        return lastB - lastA;
      });

    const selectedResearcherChat = researchers.find(r => r.id === selectedChatResearcherId);

    return (
      <div className="space-y-6 animate-in fade-in h-[calc(100vh-120px)] flex flex-col">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-primary">Comunicação (Mensagens)</h2>
        </div>
        
        <div className="glass-panel rounded-xl flex-1 flex overflow-hidden">
          {/* Sidebar de conversas */}
          <div className="w-1/3 border-r border-outline-variant flex flex-col bg-surface-container-lowest">
            <div className="p-4 border-b border-outline-variant bg-surface-container-low">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-on-surface-variant" />
                <input type="text" placeholder="Buscar pesquisador..." className="input-field pl-9 py-2 text-sm w-full" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {researchersWithMessages.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant text-sm">
                  Nenhuma mensagem recebida ainda.
                </div>
              ) : (
                researchersWithMessages.map(r => {
                  const lastMessage = r.mensagens[r.mensagens.length - 1];
                  const unreadCount = r.mensagens.filter((m: any) => m.from === 'Pesquisador' && !m.read).length;
                  return (
                    <div 
                      key={r.id} 
                      onClick={() => setSelectedChatResearcherId(r.id)}
                      className={`p-4 border-b border-outline-variant cursor-pointer transition-colors ${
                        selectedChatResearcherId === r.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-bold text-sm text-primary truncate pr-2">{r.nome || 'Desconhecido'}</div>
                        <div className="text-[10px] text-on-surface-variant whitespace-nowrap">
                          {new Date(lastMessage.date).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-on-surface-variant truncate pr-2">
                          <span className="font-bold">{lastMessage.from === 'SIEPES' ? 'Você: ' : ''}</span>
                          {lastMessage.text}
                        </div>
                        {unreadCount > 0 && (
                          <div className="bg-primary text-on-primary text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                            {unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Área de Chat */}
          <div className="flex-1 flex flex-col bg-surface-container-lowest">
            {selectedResearcherChat ? (
              <>
                <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-primary">{selectedResearcherChat.nome || 'Pesquisador'}</h3>
                    <p className="text-xs text-on-surface-variant">{selectedResearcherChat.email}</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedResearcherChat.mensagens?.map((msg: any) => (
                    <div key={msg.id} className={`flex ${msg.from === 'SIEPES' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-3 rounded-xl shadow-sm ${
                        msg.from === 'SIEPES' ? 'bg-primary text-on-primary rounded-tr-none' : 'bg-surface-container rounded-tl-none border border-outline-variant text-on-surface'
                      }`}>
                        <div className="text-sm">{msg.text}</div>
                        <div className={`text-[10px] mt-1 text-right ${msg.from === 'SIEPES' ? 'text-primary-container/80' : 'text-on-surface-variant'}`}>
                          {new Date(msg.date).toLocaleString('pt-BR')}
                          {msg.from === 'SIEPES' && <Check className="w-3 h-3 inline ml-1 opacity-70" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-outline-variant bg-surface-container-low">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={adminNewMessage}
                      onChange={(e) => setAdminNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSendAdminMessage(selectedResearcherChat.id);
                        }
                      }}
                      placeholder="Digite sua resposta..." 
                      className="input-field flex-1"
                    />
                    <button 
                      onClick={() => handleSendAdminMessage(selectedResearcherChat.id)}
                      className="btn-primary py-2 px-6"
                      disabled={!adminNewMessage.trim()}
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant opacity-50">
                <MessageSquare className="w-16 h-16 mb-4" />
                <p>Selecione um pesquisador para abrir o painel de mensagens.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPicite = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary">Projetos PICITE</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-on-surface-variant" />
            <input type="text" placeholder="Buscar PICITE..." className="input-field pl-9 py-2 text-sm w-64" />
          </div>
          <button className="btn-secondary py-2 flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filtrar
          </button>
        </div>
      </div>
      <div className="glass-panel overflow-x-auto rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
              <th className="p-4 rounded-tl-xl">Projeto</th>
              <th className="p-4">Pesquisador</th>
              <th className="p-4">Data</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right rounded-tr-xl">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {picites.map(p => (
              <tr key={p.id} className="hover:bg-surface-container-low transition-colors">
                <td className="p-4">
                  <div className="text-sm font-bold text-primary">{p.title}</div>
                  <div className="text-[10px] text-on-surface-variant uppercase">{p.type}</div>
                </td>
                <td className="p-4 text-sm text-on-surface-variant">{p.researcherName || '---'}</td>
                <td className="p-4 text-sm text-on-surface-variant">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                    p.status === 'Aprovado' ? 'bg-success/10 text-success' :
                    p.status === 'Em Execução' ? 'bg-primary/10 text-primary' :
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
                          setSelectedDashboardProject(project);
                          setShowProjectDashboardModal(true);
                        }
                      }}
                      className="p-2 hover:bg-secondary/10 text-secondary rounded-lg" title="Painel do Projeto"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => triggerDeleteProject(p.id)}
                      className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg" title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
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
                          setSelectedDashboardProject(project);
                          setShowProjectDashboardModal(true);
                        }
                      }}
                      className="p-2 hover:bg-secondary/10 text-secondary rounded-lg" title="Painel do Projeto"
                    >
                      <Search className="w-4 h-4" />
                    </button>
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
                    <button 
                      onClick={() => triggerDeleteProject(p.id)}
                      className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg" title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
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
        {allProjects.filter(s => s.raw_data?.despesas?.length > 0 || s.status === 'Aprovado' || s.status === 'Em Execução').map(s => {
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
          <Users className="w-6 h-6" /> Gestão da Equipe SIEPES
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
          <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="label-text">Nome Completo</label>
              <input 
                type="text" 
                className="input-field" 
                value={newAdmin.nome}
                onChange={e => setNewAdmin({...newAdmin, nome: e.target.value})}
                required 
              />
            </div>
            <div>
              <label className="label-text">Cargo</label>
              <input 
                type="text" 
                className="input-field" 
                value={newAdmin.cargo}
                onChange={e => setNewAdmin({...newAdmin, cargo: e.target.value})}
                required 
              />
            </div>
            <div>
              <label className="label-text">Matrícula</label>
              <input 
                type="text" 
                className="input-field" 
                value={newAdmin.matricula}
                onChange={e => setNewAdmin({...newAdmin, matricula: e.target.value})}
                required 
              />
            </div>
            <div>
              <label className="label-text">E-mail (Login Google)</label>
              <input 
                type="email" 
                className="input-field" 
                value={newAdmin.email}
                onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                required 
              />
            </div>
            <div className="hidden">
              <input 
                type="hidden" 
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
            <div className="md:col-span-3 flex justify-end gap-2 mt-2">
              <button 
                type="button" 
                onClick={() => setShowAddAdmin(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary px-8">Salvar</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {admins.map(admin => (
          <div key={admin.id} className="glass-panel p-6 rounded-xl relative">
            {admin.role !== 'admin' && (
              <button 
                onClick={() => removeAdmin(admin.id)}
                className="absolute top-4 right-4 text-on-surface-variant hover:text-error transition-colors"
                title="Remover Gestor"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-primary text-lg">{admin.nome || admin.email}</div>
                <div className="text-xs text-on-surface-variant uppercase tracking-widest">{admin.role}</div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-outline-variant/30 pb-1">
                <span className="text-on-surface-variant">E-mail:</span>
                <span className="font-medium truncate ml-2" title={admin.email}>{admin.email}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/30 pb-1">
                <span className="text-on-surface-variant">Cargo:</span>
                <span className="font-medium">{admin.cargo || 'Não informado'}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-on-surface-variant">Matrícula:</span>
                <span className="font-medium">{admin.matricula || 'Não informada'}</span>
              </div>
            </div>
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
                            const latestProject = allProjects.filter(p => p.author_id === researcher.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                            if (latestProject) {
                              generateFullDossier(latestProject.id);
                            } else {
                              showToast('Este pesquisador ainda não possui projetos submetidos.', 'error');
                            }
                          }}
                          className="p-2 hover:bg-primary/10 text-primary rounded-lg" title="Imprimir Dossiê Completo"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
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
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 p-6">
            <h2 className="text-xl font-bold text-on-surface mb-2 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-error" /> Configurar Exclusão
            </h2>
            <p className="text-on-surface-variant mb-6">
              Tem certeza que deseja deletar este projeto? Esta ação não pode ser desfeita. Todos os dados serão perdidos permanente.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setProjectToDeleteId(null);
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteProject}
                className="px-6 py-2 bg-error text-white font-bold rounded-xl hover:bg-error/90 transition-colors"
              >
                Deletar Permanente
              </button>
            </div>
          </div>
        </div>
      )}

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
            <span className="font-bold text-lg tracking-tight">SIEPES ADM</span>
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
            onClick={() => setActiveTab('picite')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'picite' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <FileText className="w-4 h-4" /> PICITE
          </button>
          <button 
            onClick={() => setActiveTab('messages')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'messages' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Mensagens
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
            onClick={handleExportData}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-primary hover:bg-primary/10 transition-all border border-primary/20 mb-2"
          >
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
          <button 
            onClick={handleExportCSV}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-secondary hover:bg-secondary/10 transition-all border border-secondary/20 mb-2"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
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
              {activeTab === 'picite' && 'Projetos PICITE'}
              {activeTab === 'messages' && 'Comunicação'}
              {activeTab === 'accountability' && 'Auditoria Financeira'}
              {activeTab === 'team' && 'Gestão de Equipe'}
              {activeTab === 'researchers' && 'Pesquisadores'}
            </h2>
            <p className="text-sm text-on-surface-variant">
              Bem-vindo ao portal administrativo do SIEPES.
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
            {activeTab === 'picite' && renderPicite()}
            {activeTab === 'messages' && renderMessages()}
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
                    <button 
                      onClick={() => {
                        const researcher = selectedResearcher;
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>Dossiê do Pesquisador - ${researcher.nome}</title>
                                <style>
                                  body { font-family: 'Inter', Arial, sans-serif; padding: 40px; line-height: 1.6; color: #1a202c; max-width: 1000px; margin: 0 auto; background: #f8fafc; }
                                  h1 { color: #003e6f; border-bottom: 3px solid #003e6f; padding-bottom: 10px; margin-bottom: 30px; text-align: center; }
                                  h2 { color: #006970; margin-top: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; font-size: 1.4em; }
                                  .section { margin-bottom: 30px; background: #fff; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; }
                                  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
                                  .label { font-weight: bold; color: #718096; font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px; }
                                  .value { margin-bottom: 15px; }
                                  .value-text { display: block; color: #1a202c; font-weight: 500; }
                                  .footer { margin-top: 50px; text-align: center; font-size: 0.8em; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                                  @media print {
                                    body { padding: 0; background: white; }
                                    button { display: none; }
                                  }
                                </style>
                              </head>
                              <body>
                                <div style="text-align: right; margin-bottom: 20px;">
                                  <button onclick="window.print()" style="padding: 12px 24px; background: #003e6f; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Imprimir Dossiê</button>
                                </div>
                                <h1>Dossiê do Pesquisador</h1>
                                
                                <div class="section">
                                  <h2>1. Dados Pessoais e Contato</h2>
                                  <div class="grid-3">
                                    <div class="value"><span class="label">Nome Completo</span><span class="value-text">${researcher.nome || 'N/A'}</span></div>
                                    <div class="value"><span class="label">CPF</span><span class="value-text">${researcher.cpf || 'N/A'}</span></div>
                                    <div class="value"><span class="label">RG</span><span class="value-text">${researcher.raw_data?.rg || 'N/A'}</span></div>
                                    <div class="value"><span class="label">E-mail Institucional</span><span class="value-text">${researcher.email_inst || 'N/A'}</span></div>
                                    <div class="value"><span class="label">E-mail Pessoal</span><span class="value-text">${researcher.raw_data?.email_pess || 'N/A'}</span></div>
                                    <div class="value"><span class="label">Telefone</span><span class="value-text">${researcher.raw_data?.telefone || 'N/A'}</span></div>
                                    <div class="value"><span class="label">Data de Nascimento</span><span class="value-text">${researcher.raw_data?.nascimento || 'N/A'}</span></div>
                                  </div>
                                </div>

                                <div class="section">
                                  <h2>2. Dados Institucionais e Acadêmicos</h2>
                                  <div class="grid-3">
                                    <div class="value"><span class="label">Titulação</span><span class="value-text">${researcher.raw_data?.titulacao || 'N/A'}</span></div>
                                    <div class="value"><span class="label">Vínculo</span><span class="value-text">${researcher.raw_data?.vinculo || 'N/A'}</span></div>
                                    <div class="value"><span class="label">Lotação</span><span class="value-text">${researcher.raw_data?.lotacao || 'N/A'}</span></div>
                                    <div class="value"><span class="label">Regional</span><span class="value-text">${researcher.raw_data?.regional || 'N/A'}</span></div>
                                    <div class="value"><span class="label">Matrícula</span><span class="value-text">${researcher.raw_data?.matricula || 'N/A'}</span></div>
                                    <div class="value"><span class="label">Carga Horária</span><span class="value-text">${researcher.raw_data?.carga_horaria || 'N/A'}</span></div>
                                    <div class="value"><span class="label">Área (CNPq)</span><span class="value-text">${researcher.raw_data?.area || 'N/A'}</span></div>
                                    <div class="value"><span class="label">ORCID</span><span class="value-text">${researcher.raw_data?.orcid || 'N/A'}</span></div>
                                  </div>
                                </div>

                                <div class="section">
                                  <h2>3. Características Sociodemográficas</h2>
                                  <div class="grid-3">
                                    <div class="value"><span class="label">Gênero</span><span class="value-text">${researcher.raw_data?.genero || 'N/A'}</span></div>
                                    <div class="value"><span class="label">Raça/Cor</span><span class="value-text">${researcher.raw_data?.raca || 'N/A'}</span></div>
                                    <div class="value"><span class="label">PCD</span><span class="value-text">${researcher.raw_data?.pcd || 'Não'}</span></div>
                                    <div class="value"><span class="label">Ensino Médio</span><span class="value-text">${researcher.raw_data?.ensino_medio || 'N/A'}</span></div>
                                    <div class="value"><span class="label">Beneficiário Social</span><span class="value-text">${researcher.raw_data?.beneficiario || 'Não'}</span></div>
                                  </div>
                                </div>

                                <div class="section">
                                  <h2>4. Endereço e Dados Bancários</h2>
                                  <div class="value-text">${researcher.raw_data?.logradouro || ''}, ${researcher.raw_data?.numero || ''} - ${researcher.raw_data?.bairro || ''}, ${researcher.raw_data?.cidade || ''}/${researcher.raw_data?.uf || ''} - CEP: ${researcher.raw_data?.cep || ''}</div>
                                  <div class="value-text" style="margin-top: 10px;">Banco: ${researcher.raw_data?.banco || 'N/A'} | Agência: ${researcher.raw_data?.agencia || 'N/A'} | Conta: ${researcher.raw_data?.conta || 'N/A'} (${researcher.raw_data?.tipo_conta || 'N/A'})</div>
                                </div>

                                <div class="footer">
                                  Documento gerado automaticamente pelo Portal SIEPES em ${new Date().toLocaleString('pt-BR')}.
                                </div>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                        }
                      }}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" /> Gerar Dossiê
                    </button>
                    {selectedResearcher.status === 'Ativo' ? (
                      <button 
                        onClick={() => handleUpdateResearcherStatus(selectedResearcher.id, 'Pendente')}
                        className="btn-secondary flex items-center gap-2 text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                      >
                        <AlertCircle className="w-4 h-4" /> Suspender Cadastro
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          const docStatuses = selectedResearcher.raw_data?.document_statuses || {};
                          const urls: { name: string, label: string, url: string }[] = [];
                          
                          if (selectedResearcher.raw_data) {
                            if (selectedResearcher.raw_data.foto_perfil) urls.push({ name: 'foto_perfil', label: 'Foto de Perfil', url: selectedResearcher.raw_data.foto_perfil });
                            if (selectedResearcher.raw_data.rg_cpf) urls.push({ name: 'rg_cpf', label: 'RG/CPF', url: selectedResearcher.raw_data.rg_cpf });
                            if (selectedResearcher.raw_data.lattes) urls.push({ name: 'lattes', label: 'Currículo Lattes', url: selectedResearcher.raw_data.lattes });
                            if (selectedResearcher.raw_data.comprovante_residencia) urls.push({ name: 'comprovante_residencia', label: 'Comprovante de Residência', url: selectedResearcher.raw_data.comprovante_residencia });
                            if (selectedResearcher.raw_data.termo_anuencia) urls.push({ name: 'termo_anuencia', label: 'Termo de Anuência', url: selectedResearcher.raw_data.termo_anuencia });
                            try {
                              if (selectedResearcher.raw_data.documentos_json) {
                                const docs = JSON.parse(selectedResearcher.raw_data.documentos_json);
                                const labels: Record<string, string> = {
                                  'doc_rg': 'Registro Geral (RG)',
                                  'doc_cpf': 'Cadastro de pessoa Física (CPF)',
                                  'doc_civil': 'Registro Civil',
                                  'doc_eleitor': 'Título de Eleitor',
                                  'doc_militar': 'Certificado de Reservista Militar',
                                  'doc_residencia': 'Comprovante de Residência',
                                  'doc_vacina': 'Cartão de Vacinação',
                                  'doc_diploma': 'Diploma de Graduação',
                                  'doc_hist_escolar': 'Histórico escolar',
                                  'doc_estrangeiro': 'Estrangeiros (RNM/Passaporte)',
                                  'doc_ingles': 'Comprovante de Proficiência em Inglês',
                                  'doc_vinculo': 'Comprovante de Vínculo Institucional'
                                };
                                Object.entries(docs).forEach(([key, value]) => {
                                  if (value) urls.push({ name: key, label: labels[key] || key, url: value as string });
                                });
                              }
                            } catch (e) {}
                          }

                          const allAnalyzed = urls.every(u => docStatuses[u.name]?.status);
                          if (!allAnalyzed && urls.length > 0) {
                            showToast('Analise todos os documentos antes de concluir.', 'error');
                            return;
                          }

                          const hasRejections = urls.some(u => docStatuses[u.name]?.status === 'Rejeitado');
                          
                          if (hasRejections) {
                            const rejectionMessages = urls
                              .filter(u => docStatuses[u.name]?.status === 'Rejeitado')
                              .map(u => `${u.label}: ${docStatuses[u.name]?.message}`)
                              .join('\n');
                            
                            setRejectionMessage(`Os seguintes documentos foram rejeitados:\n${rejectionMessages}`);
                            setSelectedDocument({ ...selectedResearcher, isResearcher: true });
                            setShowRejectModal(true);
                          } else {
                            handleApproveDocument(selectedResearcher.id, true);
                          }
                        }}
                        className="px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:bg-primary/90 flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Concluir Análise
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <section className="bento-card">
                      <h3 className="text-lg font-bold text-on-surface mb-4 border-b border-gray-100 pb-2">Dados Pessoais</h3>
                      <div className="space-y-3">
                        <div><span className="text-xs font-bold text-on-surface-variant uppercase">CPF:</span> <p className="font-medium">{selectedResearcher.cpf}</p></div>
                        <div><span className="text-xs font-bold text-on-surface-variant uppercase">RG:</span> <p className="font-medium">{selectedResearcher.raw_data?.rg || 'Não informado'}</p></div>
                        <div><span className="text-xs font-bold text-on-surface-variant uppercase">PIS/PASEP/NIT/NIS:</span> <p className="font-medium">{selectedResearcher.raw_data?.pis_pasep || 'Não informado'}</p></div>
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

                    <section className="bento-card flex flex-col h-full">
                      <h3 className="text-lg font-bold text-on-surface mb-4 border-b border-gray-100 pb-2">Mensagens</h3>
                      <div className="space-y-4 flex-1 overflow-y-auto pr-2 mb-4 min-h-[200px] max-h-[400px]">
                        {selectedResearcher.mensagens?.length > 0 ? (
                          selectedResearcher.mensagens.map((msg: any) => (
                            <div key={msg.id} className={`p-3 rounded-lg text-sm ${msg.from === 'SIEPES' ? 'bg-primary/10 ml-4 border border-primary/20' : 'bg-surface-container mr-4 border border-outline-variant'}`}>
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-xs">{msg.from === 'SIEPES' ? 'Gestor (Você)' : 'Pesquisador'}</span>
                                <span className="text-[10px] text-on-surface-variant">{new Date(msg.date).toLocaleString('pt-BR')}</span>
                              </div>
                              <p className="text-on-surface whitespace-pre-wrap">{msg.text}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-on-surface-variant text-center py-4">Nenhuma mensagem trocada.</p>
                        )}
                      </div>
                      <div className="flex gap-2 mt-auto">
                        <input 
                          type="text" 
                          value={adminNewMessage}
                          onChange={(e) => setAdminNewMessage(e.target.value)}
                          placeholder="Digite uma mensagem..."
                          className="input-field flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendAdminMessage(selectedResearcher.id);
                          }}
                        />
                        <button 
                          onClick={() => handleSendAdminMessage(selectedResearcher.id)}
                          disabled={!adminNewMessage.trim()}
                          className="px-4 py-2 bg-primary text-on-primary rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50"
                        >
                          Enviar
                        </button>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedDocument && (
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

        {/* Individual Document Reject Modal */}
        {showIndividualDocRejectModal && docToRejectInfo && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
            <div className="bg-surface p-6 rounded-xl max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold text-primary mb-2">Rejeitar Documento</h3>
              <p className="text-sm text-on-surface-variant mb-4">Documento: <span className="font-bold">{docToRejectInfo.name}</span></p>
              
              <label className="label-text mb-2 block">Motivo da Rejeição</label>
              <textarea 
                value={rejectionMessage}
                onChange={(e) => setRejectionMessage(e.target.value)}
                className="input-field w-full h-32 mb-6"
                placeholder="Descreva o motivo da inconsistência ou rejeição..."
                autoFocus
              />
              
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowIndividualDocRejectModal(false);
                    setDocToRejectInfo(null);
                    setRejectionMessage('');
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (!rejectionMessage.trim()) {
                      showToast('Por favor, informe o motivo da rejeição.', 'error');
                      return;
                    }
                    handleDocumentStatusUpdate(
                      docToRejectInfo.doc, 
                      docToRejectInfo.name, 
                      docToRejectInfo.url, 
                      'Rejeitado', 
                      rejectionMessage
                    );
                    setShowIndividualDocRejectModal(false);
                    setDocToRejectInfo(null);
                    setRejectionMessage('');
                  }}
                  className="btn-primary bg-error hover:bg-error-dark flex-1"
                >
                  Confirmar Rejeição
                </button>
              </div>
            </div>
          </div>
        )}

        {renderProjectDashboardModal()}
        {renderPendingModal()}
        {renderAccountabilityModal()}
      </main>
    </div>
  );
}
