import React, { useMemo } from 'react';
import { ChevronUp, ChevronDown, Star, Clock, CreditCard, AlertTriangle, Brain, Target, TrendingUp, Award } from 'lucide-react';
import { Produto, FiltrosComparacao } from '../types';

interface ComparacaoTableProps {
  produtos: Produto[];
  filtros: FiltrosComparacao;
  onFiltrosChange: (filtros: FiltrosComparacao) => void;
}

export const ComparacaoTable: React.FC<ComparacaoTableProps> = ({ 
  produtos, 
  filtros, 
  onFiltrosChange 
}) => {
  const produtosOrdenados = useMemo(() => {
    return produtos.map(produto => ({
      ...produto,
      cotacoes: [...produto.cotacoes].sort((a, b) => {
        switch (filtros.ordenar_por) {
          case 'preco':
            return a.preco_total - b.preco_total;
          case 'prazo':
            return a.prazo_entrega_dias - b.prazo_entrega_dias;
          case 'condicao_pagamento':
            return a.condicao_pagamento.localeCompare(b.condicao_pagamento);
          default:
            return 0;
        }
      })
    }));
  }, [produtos, filtros.ordenar_por]);

  const todosFornecedores = useMemo(() => {
    const fornecedores = new Set<string>();
    produtos.forEach(produto => {
      produto.cotacoes.forEach(cotacao => {
        fornecedores.add(cotacao.fornecedor);
      });
    });
    return Array.from(fornecedores);
  }, [produtos]);

  const getMelhorCotacao = (produto: Produto) => {
    let melhor = produto.cotacoes[0];
    produto.cotacoes.forEach(cotacao => {
      if (cotacao.preco_total < melhor.preco_total) {
        melhor = cotacao;
      }
    });
    return melhor;
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const getStatusColor = (isMelhor: boolean, temProblemas: boolean, isRecommended: boolean) => {
    if (temProblemas) return 'bg-yellow-50 border-yellow-200';
    if (isRecommended) return 'bg-purple-50 border-purple-200';
    if (isMelhor) return 'bg-green-50 border-green-200';
    return 'bg-white border-gray-200';
  };

  const getQualityColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const toggleFornecedor = (fornecedor: string) => {
    const novosFornecedores = filtros.fornecedores_selecionados.includes(fornecedor)
      ? filtros.fornecedores_selecionados.filter(f => f !== fornecedor)
      : [...filtros.fornecedores_selecionados, fornecedor];
    
    onFiltrosChange({
      ...filtros,
      fornecedores_selecionados: novosFornecedores
    });
  };

  return (
    <div className="w-full">
      {/* AI Analysis Header */}
      <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="font-medium text-purple-900">Análise Inteligente por IA</h3>
        </div>
        <p className="text-sm text-purple-800">
          Os dados abaixo foram processados e analisados pelo assistente IA, incluindo scores de qualidade, 
          recomendações personalizadas e identificação de riscos.
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Ordenar por:</label>
            <select
              value={filtros.ordenar_por}
              onChange={(e) => onFiltrosChange({
                ...filtros,
                ordenar_por: e.target.value as FiltrosComparacao['ordenar_por']
              })}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="preco">Menor Preço</option>
              <option value="prazo">Menor Prazo</option>
              <option value="condicao_pagamento">Condição de Pagamento</option>
            </select>
          </div>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filtros.mostrar_apenas_completos}
              onChange={(e) => onFiltrosChange({
                ...filtros,
                mostrar_apenas_completos: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Apenas cotações completas</span>
          </label>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Fornecedores:</span>
            <div className="flex flex-wrap gap-2">
              {todosFornecedores.map(fornecedor => (
                <button
                  key={fornecedor}
                  onClick={() => toggleFornecedor(fornecedor)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    filtros.fornecedores_selecionados.length === 0 || 
                    filtros.fornecedores_selecionados.includes(fornecedor)
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-300'
                  }`}
                >
                  {fornecedor}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Comparação */}
      <div className="space-y-6">
        {produtosOrdenados.map((produto) => {
          const melhorCotacao = getMelhorCotacao(produto);
          const cotacoesFiltradas = produto.cotacoes.filter(cotacao => {
            if (filtros.mostrar_apenas_completos && cotacao.dados_incompletos) return false;
            if (filtros.fornecedores_selecionados.length > 0 && 
                !filtros.fornecedores_selecionados.includes(cotacao.fornecedor)) return false;
            return true;
          });

          // Check if this product has AI recommendation
          const hasRecommendation = produto.recomendacao;

          return (
            <div key={produto.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {produto.descricao}
                      </h3>
                      {hasRecommendation && (
                        <div className="flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                          <Brain className="w-3 h-3" />
                          <span>IA</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Quantidade: {produto.quantidade.toLocaleString()} unidades
                    </p>
                    {hasRecommendation && (
                      <div className="mt-2 p-2 bg-purple-50 rounded text-sm">
                        <p className="text-purple-800">
                          <strong>Recomendação IA:</strong> {hasRecommendation.fornecedor_recomendado}
                        </p>
                        <p className="text-purple-700">{hasRecommendation.motivo}</p>
                        {hasRecommendation.economia_potencial > 0 && (
                          <p className="text-green-700 font-medium">
                            Economia: {formatarMoeda(hasRecommendation.economia_potencial)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Melhor oferta:</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatarMoeda(melhorCotacao.preco_total)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {cotacoesFiltradas.map((cotacao, index) => {
                  const isMelhor = cotacao.preco_total === melhorCotacao.preco_total;
                  const temProblemas = cotacao.dados_incompletos || false;
                  const isRecommended = hasRecommendation?.fornecedor_recomendado === cotacao.fornecedor;
                  
                  // @ts-ignore - AI scores might not be in type yet
                  const scoreQualidade = cotacao.score_qualidade || 7;
                  // @ts-ignore
                  const scoreConfiabilidade = cotacao.score_confiabilidade || 7;
                  // @ts-ignore
                  const pontosFortes = cotacao.pontos_fortes || [];
                  // @ts-ignore
                  const pontosFracos = cotacao.pontos_fracos || [];

                  return (
                    <div 
                      key={index} 
                      className={`p-6 transition-colors ${getStatusColor(isMelhor, temProblemas, isRecommended)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-3">
                            <h4 className="text-lg font-medium text-gray-900">
                              {cotacao.fornecedor}
                            </h4>
                            {isMelhor && (
                              <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                <Star className="w-3 h-3" />
                                <span>Melhor preço</span>
                              </div>
                            )}
                            {isRecommended && (
                              <div className="flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                <Award className="w-3 h-3" />
                                <span>Recomendado IA</span>
                              </div>
                            )}
                            {temProblemas && (
                              <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Dados incompletos</span>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-600">Prazo de entrega</p>
                                <p className="font-medium">
                                  {cotacao.prazo_entrega_dias} dias
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <CreditCard className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-600">Pagamento</p>
                                <p className="font-medium">
                                  {cotacao.condicao_pagamento}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Target className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-600">Qualidade IA</p>
                                <p className={`font-medium ${getQualityColor(scoreQualidade)}`}>
                                  {scoreQualidade.toFixed(1)}/10
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <TrendingUp className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-600">Confiabilidade</p>
                                <p className={`font-medium ${getQualityColor(scoreConfiabilidade)}`}>
                                  {scoreConfiabilidade.toFixed(1)}/10
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* AI Analysis Details */}
                          {(pontosFortes.length > 0 || pontosFracos.length > 0) && (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                              {pontosFortes.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-green-700 mb-1">Pontos Fortes (IA):</p>
                                  <ul className="text-sm text-green-600 space-y-1">
                                    {pontosFortes.map((ponto: string, idx: number) => (
                                      <li key={idx} className="flex items-start space-x-1">
                                        <span className="text-green-500 mt-0.5">•</span>
                                        <span>{ponto}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {pontosFracos.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-red-700 mb-1">Pontos Fracos (IA):</p>
                                  <ul className="text-sm text-red-600 space-y-1">
                                    {pontosFracos.map((ponto: string, idx: number) => (
                                      <li key={idx} className="flex items-start space-x-1">
                                        <span className="text-red-500 mt-0.5">•</span>
                                        <span>{ponto}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-4">
                            <p className="text-sm text-gray-600">Observações</p>
                            <p className="font-medium text-sm">
                              {cotacao.observacoes || 'Nenhuma observação'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right ml-6">
                          <p className="text-sm text-gray-600">Preço unitário</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {formatarMoeda(cotacao.preco_unitario)}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">Total</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatarMoeda(cotacao.preco_total)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};