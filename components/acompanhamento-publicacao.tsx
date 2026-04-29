'use client';

import { useState } from 'react';
import { FileText, CheckCircle2, Clock, AlertCircle, Download, RefreshCw, MessageSquare, Paperclip, Check, ArrowLeft } from 'lucide-react';

export default function AcompanhamentoPublicacao({ project, onBack }: { project?: any, onBack: () => void }) {
  // Map project data or use mock data if none passed
  const data = project ? {
    id: `#PUB-${project.id?.substring(0, 6) || '2024-089'}`,
    titulo: project.titulo,
    status: project.status,
    valor_apc: project.valor_apc || 0,
    moeda: project.moeda || 'USD',
  } : {
    id: '#PUB-2024-089',
    titulo: 'Impactos da Inteligência Artificial na Gestão de Saúde Pública',
    status: 'Em Análise',
    valor_apc: 1250.00,
    moeda: 'USD',
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4">
      <header className="mb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-primary font-bold text-sm mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
        </button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-surface-container-low text-on-surface-variant px-2 py-1 rounded text-xs font-bold font-mono">{data.id}</span>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">{data.status}</span>
            </div>
            <h1 className="text-2xl font-bold text-on-surface">{data.titulo}</h1>
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary flex items-center gap-2 bg-white">
              <Download className="w-4 h-4" /> Exportar Relatório
            </button>
            <button className="btn-primary flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Atualizar Status
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Stepper */}
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 bento-card p-4 border-t-4 border-green-500 bg-green-50/30">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-green-700">Submissão</span>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <h4 className="font-bold text-sm text-green-900">Concluído</h4>
            </div>
            <div className="flex-1 bento-card p-4 border-t-4 border-blue-500 bg-blue-50/30 shadow-md">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-blue-700">Avaliação SIEPES</span>
                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin-slow" />
              </div>
              <h4 className="font-bold text-sm text-blue-900">Em processamento</h4>
            </div>
            <div className="flex-1 bento-card p-4 border-t-4 border-gray-300 opacity-60">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Pagamento APC</span>
                <Clock className="w-4 h-4 text-gray-400" />
              </div>
              <h4 className="font-bold text-sm text-gray-600">Aguardando</h4>
            </div>
            <div className="flex-1 bento-card p-4 border-t-4 border-gray-300 opacity-60">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Registro Final</span>
                <Clock className="w-4 h-4 text-gray-400" />
              </div>
              <h4 className="font-bold text-sm text-gray-600">Pendente</h4>
            </div>
          </div>

          {/* Timeline */}
          <div className="bento-card">
            <h3 className="text-lg font-bold text-on-surface mb-6">Linha do Tempo da Avaliação</h3>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
              
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-green-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <Check className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-sm text-on-surface">Recebimento de Documentação</h4>
                    <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">Aprovado</span>
                  </div>
                  <p className="text-xs text-on-surface-variant">Todos os documentos obrigatórios foram recebidos e validados pelo sistema.</p>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-green-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <Check className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-sm text-on-surface">Análise de Conformidade Ética</h4>
                    <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">Aprovado</span>
                  </div>
                  <p className="text-xs text-on-surface-variant">Projeto aprovado pelo Comitê de Ética em Pesquisa (CEP).</p>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <RefreshCw className="w-4 h-4 animate-spin-slow" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-blue-200 shadow-md ring-1 ring-blue-100">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-sm text-on-surface">Parecer Técnico SIEPES</h4>
                    <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">Em análise</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mb-3">Avaliação do mérito científico e adequação orçamentária.</p>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-white flex items-center justify-center text-[10px] font-bold text-primary">DR</div>
                      <div className="w-6 h-6 rounded-full bg-secondary/20 border-2 border-white flex items-center justify-center text-[10px] font-bold text-secondary">AS</div>
                    </div>
                    <span className="text-xs text-on-surface-variant">Avaliadores designados</span>
                  </div>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-gray-200 text-gray-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-surface-container-lowest p-4 rounded-xl border border-dashed border-gray-300 opacity-60">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-sm text-on-surface-variant">Geração de Guia APC</h4>
                    <span className="text-xs text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded">Pendente</span>
                  </div>
                  <p className="text-xs text-on-surface-variant">Aguardando aprovação técnica para emissão de pagamento.</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Custos Estimados */}
          <div className="bento-card bg-surface-container-lowest border border-gray-200">
            <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Custos Estimados
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Taxa APC Original</span>
                <span className="font-mono">{data.moeda} {Number(data.valor_apc).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Desconto Institucional</span>
                <span className="font-mono">- {data.moeda} 0.00</span>
              </div>
              <div className="pt-3 border-t border-gray-200 flex justify-between font-bold text-lg">
                <span>Total a Pagar</span>
                <span className="font-mono">{data.moeda} {Number(data.valor_apc).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Dúvidas */}
          <div className="bento-card bg-blue-50 border border-blue-100">
            <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Dúvidas sobre o Processo?
            </h3>
            <p className="text-sm text-blue-800 mb-4">
              Nossa equipe está disponível para auxiliar com questões sobre o pagamento de APC.
            </p>
            <button className="w-full py-2 bg-white text-blue-700 font-bold text-sm rounded border border-blue-200 hover:bg-blue-50 transition-colors">
              Falar com Suporte
            </button>
          </div>

          {/* Documentos */}
          <div className="bento-card border border-gray-200">
            <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-primary" /> Documentos Vinculados
            </h3>
            <div className="space-y-3">
              {project?.raw_data?.files && Object.keys(project.raw_data.files).length > 0 ? (
                Object.entries(project.raw_data.files).map(([key, url]) => (
                  <div key={key} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors cursor-pointer border border-transparent hover:border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-red-50 text-red-500 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{key}</p>
                        <p className="text-xs text-on-surface-variant">Documento anexado</p>
                      </div>
                    </div>
                    <a href={url as string} target="_blank" rel="noreferrer" className="text-primary hover:bg-primary/10 p-1.5 rounded">
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))
              ) : (
                <p className="text-sm text-on-surface-variant text-center py-4">Nenhum documento anexado.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
