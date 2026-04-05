'use client';

import { useState } from 'react';
import { FileText, Plus, TrendingUp, Landmark, CheckCircle2, AlertCircle, Eye, Download, Edit2, AlertTriangle } from 'lucide-react';

export default function PrestacaoContas() {
  const [despesas] = useState([
    { id: '#4401', descricao: 'Microscópio Óptico Nikon', categoria: 'Equipamentos Laboratoriais', data: '12/03/2024', valor: 15400.00, status: 'Aprovado' },
    { id: '#4388', descricao: 'Passagem Aérea - BSB/SP', categoria: 'Viagens e Diárias - Congresso ABC', data: '08/03/2024', valor: 1250.40, status: 'Em Análise' },
    { id: '#4375', descricao: 'Reagentes Químicos Mod. 2', categoria: 'Material de Consumo', data: '25/02/2024', valor: 4800.00, status: 'Pendente' },
  ]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface mb-2">Gestão de Prestação de Contas</h1>
          <p className="text-on-surface-variant">
            Módulo de monitoramento financeiro e técnico-científico institucional. Acompanhe a execução do seu projeto em tempo real.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2 bg-surface-container-low text-primary border-none">
            <FileText className="w-4 h-4" /> Enviar Relatório Técnico
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nova Prestação
          </button>
        </div>
      </header>

      {/* Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bento-card border-l-4 border-primary">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Orçamento Total</span>
            <div className="w-8 h-8 rounded bg-blue-50 text-primary flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-primary mb-4">R$ 200.000,00</h3>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <CheckCircle2 className="w-3 h-3" /> Aprovado via Edital 04/2023
          </div>
        </div>

        <div className="bento-card border-l-4 border-secondary">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Executado</span>
            <div className="w-8 h-8 rounded bg-teal-50 text-secondary flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-secondary mb-4">R$ 85.000,00</h3>
          <div className="w-full bg-surface-container-low rounded-full h-1.5 mb-2">
            <div className="bg-secondary w-[42.5%] h-1.5 rounded-full"></div>
          </div>
          <div className="text-xs font-bold text-secondary">42.5% do total utilizado</div>
        </div>

        <div className="bento-card border-l-4 border-yellow-600">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Saldo Remanescente</span>
            <div className="w-8 h-8 rounded bg-yellow-50 text-yellow-600 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-yellow-700 mb-4">R$ 115.000,00</h3>
          <div className="flex justify-between items-center text-xs">
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-bold">Disponível</span>
            <span className="text-on-surface-variant">Vencimento: Dez 2025</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-on-surface">Cronograma Técnico-Científico</h2>
            <p className="text-sm text-on-surface-variant">Ciclo semestral de submissão de resultados</p>
          </div>
          <button className="text-primary font-bold text-sm flex items-center gap-2 hover:underline">
            <Plus className="w-4 h-4" /> Solicitar Aditivo de Prazo
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bento-card border-2 border-secondary relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">0-6 Meses</span>
              <div className="w-5 h-5 rounded-full bg-secondary text-white flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3" />
              </div>
            </div>
            <h4 className="font-bold text-on-surface mb-1">Relatório Parcial 01</h4>
            <p className="text-xs text-on-surface-variant mb-4">Entregue em 15/02/2024</p>
            <span className="bg-teal-100 text-teal-800 text-[10px] font-bold uppercase px-2 py-1 rounded">Entregue</span>
          </div>

          <div className="bento-card border-2 border-primary relative overflow-hidden shadow-md">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">6-12 Meses</span>
              <div className="w-5 h-5 rounded-full border-2 border-primary text-primary flex items-center justify-center">
                <span className="text-xs font-bold">...</span>
              </div>
            </div>
            <h4 className="font-bold text-on-surface mb-1">Relatório Parcial 02</h4>
            <p className="text-xs text-on-surface-variant mb-4">Vencimento: 15/08/2024</p>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold uppercase px-2 py-1 rounded">Em Aberto</span>
          </div>

          <div className="bento-card bg-surface-container-lowest opacity-60 border border-dashed border-outline-variant">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">12-18 Meses</span>
            </div>
            <h4 className="font-bold text-on-surface-variant mb-1">Relatório Parcial 03</h4>
            <p className="text-xs text-on-surface-variant mb-4">Programado para Fev/2025</p>
          </div>

          <div className="bento-card bg-surface-container-lowest opacity-60 border border-dashed border-outline-variant">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Conclusão</span>
            </div>
            <h4 className="font-bold text-on-surface-variant mb-1">Relatório Final</h4>
            <p className="text-xs text-on-surface-variant mb-4">Encerramento do Ciclo</p>
          </div>
        </div>
      </section>

      {/* Despesas */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-on-surface">Comprovações e Despesas</h2>
          <div className="relative">
            <input type="text" placeholder="Filtrar despesas..." className="input-field py-1.5 pl-8 text-sm w-64" />
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start gap-3 mb-6">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">
            <strong>ATENÇÃO:</strong> Notas fiscais devem ser emitidas obrigatoriamente no CNPJ da FEPECS <span className="underline font-bold">00.394.700/0001-08</span>. Comprovações fora deste padrão serão sumariamente rejeitadas.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-lowest text-xs uppercase tracking-wider text-on-surface-variant font-bold border-b border-gray-200">
                <tr>
                  <th className="p-4">ID</th>
                  <th className="p-4">Descrição do Gasto</th>
                  <th className="p-4">Data</th>
                  <th className="p-4">Valor</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {despesas.map((d, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="p-4 font-mono text-on-surface-variant">{d.id}</td>
                    <td className="p-4">
                      <p className="font-bold text-on-surface">{d.descricao}</p>
                      <p className="text-xs text-on-surface-variant">{d.categoria}</p>
                    </td>
                    <td className="p-4 text-on-surface-variant">{d.data}</td>
                    <td className="p-4 font-bold text-on-surface">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.valor)}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        d.status === 'Aprovado' ? 'bg-green-100 text-green-800' :
                        d.status === 'Em Análise' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          d.status === 'Aprovado' ? 'bg-green-500' :
                          d.status === 'Em Análise' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}></span>
                        {d.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {d.status === 'Pendente' && <AlertCircle className="w-4 h-4 text-red-500" />}
                        <button className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-blue-50 rounded">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-blue-50 rounded">
                          {d.status === 'Aprovado' ? <Download className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-200 flex justify-between items-center text-sm text-on-surface-variant">
            <span>Mostrando 3 de 24 registros</span>
            <div className="flex gap-1">
              <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50">Anterior</button>
              <button className="px-3 py-1 bg-primary text-white rounded">1</button>
              <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50">Próximo</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
