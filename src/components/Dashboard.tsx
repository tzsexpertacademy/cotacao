import React, { useMemo } from 'react';
import { TrendingDown, TrendingUp, Clock, DollarSign, Users, FileText, Brain, Target, AlertTriangle } from 'lucide-react';
import { AnaliseCompleta } from '../types';

interface DashboardProps {
  analises: AnaliseCompleta[];
}

export const Dashboard: React.FC<DashboardProps> = ({ analises }) => {
  const analiseAtual = analises[analises.length - 1];

  const estatisticas = useMemo(() => {
    if (!analiseAtual) return null;

    const totalProdutos = analiseAtual.produtos.length;
    const totalFornecedores = analiseAtual.total_fornecedores;
    
    const todosProdutos = analiseAtual.produtos;
    const todasCotacoes = todosProdutos.flatMap(p => p.cotacoes || []);
    
    // Check if we have any cotacoes to work with
    if (todasCotacoes.length === 0) {
      return {
        totalProdutos,
        totalFornecedores,
        valorTotalMenor: 0,
        valorTotalMaior: 0,
        economia: 0,
        percentualEconomia: 0,
        prazoMedio: 0,
        menorPrazo: 0,
        qualidadeMedia: 0,
        fornecedoresRecomendados: 0,
        alertasIdentificados: 0
      };
    }
    
    const valorTotalMenor = todosProdutos.reduce((acc, produto) => {
      if (!produto.cotacoes || produto.cotacoes.length === 0) return acc;
      const menorPreco = Math.min(...produto.cotacoes.map(c => c.preco_total));
      return acc + menorPreco;
    }, 0);

    const valorTotalMaior = todosProdutos.reduce((acc, produto) => {
      if (!produto.cotacoes || produto.cotacoes.length === 0) return acc;
      const maiorPreco = Math.max(...produto.cotacoes.map(c => c.preco_total));
      return acc + maiorPreco;
    }, 0);

    const economia = valorTotalMaior - valorTotalMenor;
    const percentualEconomia = valorTotalMaior > 0 ? ((economia / valorTotalMaior) * 100) : 0;

    const prazoMedio = todasCotacoes.reduce((acc, cotacao) => 
      acc + cotacao.prazo_entrega_dias, 0) / todasCotacoes.length;

    const menorPrazo = Math.min(...todasCotacoes.map(c => c.prazo_entrega_dias));

    // Calculate quality metrics from AI analysis
    const qualidadeMedia = todasCotacoes.reduce((acc, cotacao) => {
      // @ts-ignore - score_qualidade might not be in type yet
      return acc + (cotacao.score_qualidade || 7); // Default 7 if not available
    }, 0) / todasCotacoes.length;

    const fornecedoresRecomendados = analiseAtual.melhor_custo_beneficio?.length || 0;
    
    // Count alerts from AI analysis
    const alertasIdentificados = todasCotacoes.filter(c => c.dados_incompletos).length;

    return {
      totalProdutos,
      totalFornecedores,
      valorTotalMenor,
      valorTotalMaior,
      economia,
      percentualEconomia,
      prazoMedio: Math.round(prazoMedio),
      menorPrazo,
      qualidadeMedia,
      fornecedoresRecomendados,
      alertasIdentificados
    };
  }, [analiseAtual]);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  if (!analiseAtual || !estatisticas) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Nenhuma análise disponível
        </h3>
        <p className="text-gray-600 mb-4">
          Faça upload de documentos para começar a análise com IA
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-blue-600" />
            <p className="text-blue-800 text-sm">
              O assistente IA está pronto para analisar suas cotações
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {analiseAtual.nome_analise}
            </h2>
            <p className="text-gray-600">
              Análise criada em {new Date(analiseAtual.data_criacao).toLocaleDateString('pt-BR')}
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <Brain className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-purple-600">Analisado por IA</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Economia potencial</p>
            <p className="text-3xl font-bold text-green-600">
              {formatarMoeda(estatisticas.economia)}
            </p>
            <p className="text-sm text-green-600">
              {estatisticas.percentualEconomia.toFixed(1)}% de economia
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Produtos</p>
              <p className="text-2xl font-bold text-gray-900">
                {estatisticas.totalProdutos}
              </p>
              <p className="text-xs text-gray-500 mt-1">Analisados pela IA</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fornecedores</p>
              <p className="text-2xl font-bold text-gray-900">
                {estatisticas.totalFornecedores}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {estatisticas.fornecedoresRecomendados} recomendados
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Menor Valor Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatarMoeda(estatisticas.valorTotalMenor)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Melhor custo-benefício</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingDown className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Qualidade Média</p>
              <p className="text-2xl font-bold text-gray-900">
                {estatisticas.qualidadeMedia.toFixed(1)}/10
              </p>
              <p className="text-xs text-gray-500 mt-1">Score da IA</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Recommendations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Brain className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Recomendações da IA</h3>
          </div>
          
          {analiseAtual.melhor_custo_beneficio && analiseAtual.melhor_custo_beneficio.length > 0 ? (
            <div className="space-y-3">
              {analiseAtual.melhor_custo_beneficio.map((recomendacao, index) => {
                const produto = analiseAtual.produtos.find(p => p.id === recomendacao.produto_id);
                return (
                  <div key={index} className="flex items-start space-x-3 p-4 bg-purple-50 rounded-lg">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {produto?.descricao}
                      </p>
                      <p className="text-sm text-gray-600">
                        Recomendado: <span className="font-medium">{recomendacao.fornecedor}</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        {recomendacao.motivo}
                      </p>
                      {/* @ts-ignore - economia might not be in type yet */}
                      {recomendacao.economia && (
                        <p className="text-sm text-green-600 font-medium">
                          {/* @ts-ignore */}
                          Economia: {formatarMoeda(recomendacao.economia)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma recomendação específica disponível</p>
            </div>
          )}
        </div>

        {/* Alerts and Risks */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Alertas e Riscos</h3>
          </div>
          
          <div className="space-y-3">
            {estatisticas.alertasIdentificados > 0 && (
              <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">Dados Incompletos</p>
                  <p className="text-sm text-yellow-800">
                    {estatisticas.alertasIdentificados} cotação(ões) com informações faltantes
                  </p>
                </div>
              </div>
            )}
            
            {estatisticas.prazoMedio > 15 && (
              <div className="flex items-start space-x-3 p-4 bg-orange-50 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-900">Prazo Elevado</p>
                  <p className="text-sm text-orange-800">
                    Prazo médio de {estatisticas.prazoMedio} dias pode impactar cronograma
                  </p>
                </div>
              </div>
            )}
            
            {estatisticas.qualidadeMedia < 6 && (
              <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-lg">
                <Target className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Qualidade Baixa</p>
                  <p className="text-sm text-red-800">
                    Score médio de qualidade abaixo do recomendado
                  </p>
                </div>
              </div>
            )}
            
            {estatisticas.alertasIdentificados === 0 && estatisticas.prazoMedio <= 15 && estatisticas.qualidadeMedia >= 6 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-green-600 font-medium">Análise sem alertas críticos</p>
                <p className="text-sm text-green-600">Todas as cotações estão dentro dos parâmetros</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumo por Fornecedor com AI Insights */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Resumo por Fornecedor (Análise IA)
        </h3>
        <div className="space-y-4">
          {Array.from(new Set(analiseAtual.produtos.flatMap(p => 
            (p.cotacoes || []).map(c => c.fornecedor)
          ))).map(fornecedor => {
            const cotacoesFornecedor = analiseAtual.produtos.flatMap(p => 
              (p.cotacoes || []).filter(c => c.fornecedor === fornecedor)
            );
            
            const valorTotal = cotacoesFornecedor.reduce((acc, c) => acc + c.preco_total, 0);
            const prazoMedio = cotacoesFornecedor.length > 0 
              ? cotacoesFornecedor.reduce((acc, c) => acc + c.prazo_entrega_dias, 0) / cotacoesFornecedor.length
              : 0;
            const produtosCotados = cotacoesFornecedor.length;
            
            // AI quality metrics
            const qualidadeMedia = cotacoesFornecedor.reduce((acc, c) => {
              // @ts-ignore
              return acc + (c.score_qualidade || 7);
            }, 0) / cotacoesFornecedor.length;
            
            const isRecommended = analiseAtual.melhor_custo_beneficio?.some(r => r.fornecedor === fornecedor);

            return (
              <div key={fornecedor} className={`flex items-center justify-between p-4 border rounded-lg ${
                isRecommended ? 'border-green-300 bg-green-50' : 'border-gray-200'
              }`}>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">{fornecedor}</h4>
                    {isRecommended && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Recomendado pela IA
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <p className="text-sm text-gray-600">
                      {produtosCotados} produtos • Prazo médio: {Math.round(prazoMedio)} dias
                    </p>
                    <p className="text-sm text-gray-600">
                      Qualidade IA: <span className="font-medium">{qualidadeMedia.toFixed(1)}/10</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Dados completos: {cotacoesFornecedor.filter(c => !c.dados_incompletos).length}/{produtosCotados}
                    </p>
                  </div>
                </div>
                <div className="text-right ml-6">
                  <p className="text-lg font-semibold text-gray-900">
                    {formatarMoeda(valorTotal)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};