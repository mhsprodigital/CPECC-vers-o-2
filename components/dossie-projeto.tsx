'use client';

import { useState } from 'react';
import { ArrowLeft, FileText, Plus, TrendingUp, Landmark, CheckCircle2, AlertCircle, Eye, Download, Edit2, AlertTriangle, X, MessageSquare, Check, Upload } from 'lucide-react';

export default function DossieProjeto({ project, onBack }: { project?: any, onBack: () => void }) {
  const data = project || {
    id: '#PESQ-2024-001',
    titulo: 'Estudo Clínico sobre Novos Biomarcadores',
    status: 'Aprovado',
    createdAt: new Date().toISOString(),
    orcamento_total: 200000,
  };

  const [despesas, setDespesas] = useState([
    { id: '#4401', descricao: 'Microscópio Óptico Nikon', categoria: 'Equipamentos Laboratoriais', data: '12/03/2024', valor: 15400.00, status: 'Aprovado', mensagem: 'Comprovação validada com sucesso.' },
    { id: '#4388', descricao: 'Passagem Aérea - BSB/SP', categoria: 'Viagens e Diárias', data: '08/03/2024', valor: 1250.40, status: 'Em Análise', mensagem: 'Aguardando verificação do bilhete de embarque.' },
    { id: '#4375', descricao: 'Reagentes Químicos Mod. 2', categoria: 'Material de Consumo', data: '25/02/2024', valor: 4800.00, status: 'Pendente', mensagem: 'Nota fiscal ilegível. Por favor, reenvie o documento com o CNPJ da FEPECS visível.' },
  ]);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  
  const [newExpense, setNewExpense] = useState({
    descricao: '',
    categoria: 'Material de Consumo',
    data: '',
    valor: '',
  });

  const totalExecutado = despesas.reduce((acc, curr) => acc + curr.valor, 0);
  const orcamentoTotal = data.orcamento_total || 200000;
  const saldoRemanescente = orcamentoTotal - totalExecutado;
  const percentualExecutado = (totalExecutado / orcamentoTotal) * 100;

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const expense = {
      id: `#${Math.floor(1000 + Math.random() * 9000)}`,
      descricao: newExpense.descricao,
      categoria: newExpense.categoria,
      data: newExpense.data || new Date().toLocaleDateString('pt-BR'),
      valor: parseFloat(newExpense.valor),
      status: 'Em Análise',
      mensagem: 'Comprovação enviada para análise técnica.',
    };
    setDespesas([expense, ...despesas]);
    setIsExpenseModalOpen(false);
    setNewExpense({ descricao: '', categoria: 'Material de Consumo', data: '', valor: '' });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 pb-12">
      <header className="mb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-primary font-bold text-sm mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
        </button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-surface-container-low text-on-surface-variant px-2 py-1 rounded text-xs font-bold font-mono">
                {data.id || `#PESQ-${new Date(data.createdAt).getFullYear()}-001`}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                data.status === 'Aprovado' ? 'bg-green-100 text-green-800' :
                data.status === 'Em Análise' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {data.status}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-on-surface">{data.titulo || data.titulo_projeto}</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setIsReportModalOpen(true)} className="btn-secondary flex items-center gap-2 bg-surface-container-low text-primary border-none">
              <FileText className="w-4 h-4" /> Enviar Relatório
            </button>
            <button onClick={() => setIsExpenseModalOpen(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nova Prestação
            </button>
          </div>
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
          <h3 className="text-3xl font-extrabold text-primary mb-4">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamentoTotal)}
          </h3>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <CheckCircle2 className="w-3 h-3" /> Aprovado via Edital Institucional
          </div>
        </div>

        <div className="bento-card border-l-4 border-secondary">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Executado</span>
            <div className="w-8 h-8 rounded bg-teal-50 text-secondary flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-secondary mb-4">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExecutado)}
          </h3>
          <div className="w-full bg-surface-container-low rounded-full h-1.5 mb-2">
            <div className="bg-secondary h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(percentualExecutado, 100)}%` }}></div>
          </div>
          <div className="text-xs font-bold text-secondary">{percentualExecutado.toFixed(1)}% do total utilizado</div>
        </div>

        <div className="bento-card border-l-4 border-yellow-600">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Saldo Remanescente</span>
            <div className="w-8 h-8 rounded bg-yellow-50 text-yellow-600 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-yellow-700 mb-4">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoRemanescente)}
          </h3>
          <div className="flex justify-between items-center text-xs">
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-bold">Disponível</span>
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
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
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
                        d.status === 'Em Análise' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          d.status === 'Aprovado' ? 'bg-green-500' :
                          d.status === 'Em Análise' ? 'bg-blue-500' :
                          'bg-red-500'
                        }`}></span>
                        {d.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {d.status === 'Pendente' && (
                          <button onClick={() => setSelectedExpense(d)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Ver Pendência">
                            <AlertCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => setSelectedExpense(d)} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-blue-50 rounded" title="Visualizar Detalhes">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {despesas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                      Nenhuma despesa cadastrada para este projeto.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Modal Nova Prestação */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-on-surface">Nova Prestação de Contas</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div>
                <label className="label-text">Descrição do Gasto</label>
                <input type="text" required value={newExpense.descricao} onChange={e => setNewExpense({...newExpense, descricao: e.target.value})} className="input-field" placeholder="Ex: Compra de reagentes..." />
              </div>
              <div>
                <label className="label-text">Categoria</label>
                <select required value={newExpense.categoria} onChange={e => setNewExpense({...newExpense, categoria: e.target.value})} className="input-field">
                  <option value="Material de Consumo">Material de Consumo</option>
                  <option value="Equipamentos Laboratoriais">Equipamentos Laboratoriais</option>
                  <option value="Viagens e Diárias">Viagens e Diárias</option>
                  <option value="Serviços de Terceiros">Serviços de Terceiros</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Data da Nota</label>
                  <input type="date" required value={newExpense.data} onChange={e => setNewExpense({...newExpense, data: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="label-text">Valor (R$)</label>
                  <input type="number" step="0.01" min="0.01" required value={newExpense.valor} onChange={e => setNewExpense({...newExpense, valor: e.target.value})} className="input-field" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="label-text">Comprovante Fiscal (PDF/JPG)</label>
                <input type="file" required accept=".pdf,.jpg,.jpeg,.png" className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer w-full" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Salvar Despesa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visualizar Despesa */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-on-surface">Detalhes da Despesa</h3>
              <button onClick={() => setSelectedExpense(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-on-surface-variant font-mono mb-1">{selectedExpense.id}</p>
                  <h4 className="font-bold text-lg text-on-surface">{selectedExpense.descricao}</h4>
                  <p className="text-sm text-on-surface-variant">{selectedExpense.categoria}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  selectedExpense.status === 'Aprovado' ? 'bg-green-100 text-green-800' :
                  selectedExpense.status === 'Em Análise' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {selectedExpense.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 bg-surface-container-lowest p-4 rounded-lg border border-gray-100">
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-1">Data</p>
                  <p className="font-medium">{selectedExpense.data}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-1">Valor</p>
                  <p className="font-bold text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedExpense.valor)}</p>
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${
                selectedExpense.status === 'Pendente' ? 'bg-red-50 border-red-100 text-red-800' : 
                selectedExpense.status === 'Aprovado' ? 'bg-green-50 border-green-100 text-green-800' :
                'bg-blue-50 border-blue-100 text-blue-800'
              }`}>
                <h5 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Mensagem do Avaliador
                </h5>
                <p className="text-sm">{selectedExpense.mensagem}</p>
              </div>

              <div className="pt-4 flex justify-between gap-3 border-t border-gray-100">
                <button className="btn-secondary flex items-center gap-2 flex-1 justify-center">
                  <Download className="w-4 h-4" /> Baixar Comprovante
                </button>
                {selectedExpense.status === 'Pendente' && (
                  <button className="btn-primary flex items-center gap-2 flex-1 justify-center">
                    <Upload className="w-4 h-4" /> Reenviar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Enviar Relatório */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-on-surface">Enviar Relatório Técnico</h3>
              <button onClick={() => setIsReportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); alert('Relatório enviado com sucesso!'); setIsReportModalOpen(false); }} className="p-6 space-y-4">
              <div>
                <label className="label-text">Tipo de Relatório</label>
                <select required className="input-field">
                  <option value="">Selecione...</option>
                  <option value="parcial_02">Relatório Parcial 02</option>
                  <option value="parcial_03">Relatório Parcial 03</option>
                  <option value="final">Relatório Final</option>
                </select>
              </div>
              <div>
                <label className="label-text">Arquivo do Relatório (PDF)</label>
                <div className="border-2 border-dashed border-outline-variant/50 rounded-xl bg-surface-container-lowest p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors">
                  <Upload className="w-8 h-8 text-primary mb-2 opacity-50" />
                  <p className="text-xs text-on-surface-variant mb-4">Arraste ou clique para selecionar</p>
                  <input type="file" required accept=".pdf" className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer w-full max-w-[200px]" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsReportModalOpen(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Enviar Relatório</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
