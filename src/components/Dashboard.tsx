import React, { useMemo } from 'react';
import { TrendingDown, TrendingUp, Clock, DollarSign, Users, FileText } from 'lucide-react';
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
        menorPrazo: 0
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

    return {
      totalProdutos,
      totalFornecedores,
      valorTotalMenor,
      valorTotalMaior,
      economia,
      percentualEconomia,
      prazoMedio: Math.round(prazoMedio),
      menorPrazo
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
        <p className="text-gray-600">
          Faça upload de documentos para começar a análise
        </p>
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

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Produtos</p>
              <p className="text-2xl font-bold text-gray-900">
                {estatisticas.totalProdutos}
              </p>
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
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingDown className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Menor Prazo</p>
              <p className="text-2xl font-bold text-gray-900">
                {estatisticas.menorPrazo} dias
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recomendações */}
      {analiseAtual.melhor_custo_beneficio && analiseAtual.melhor_custo_beneficio.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recomendações de Custo-Benefício
          </h3>
          <div className="space-y-3">
            {analiseAtual.melhor_custo_beneficio.map((recomendacao, index) => {
              const produto = analiseAtual.produtos.find(p => p.id === recomendacao.produto_id);
              return (
                <div key={index} className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {produto?.descricao}
                    </p>
                    <p className="text-sm text-gray-600">
                      Recomendado: <span className="font-medium">{recomendacao.fornecedor}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      {recomendacao.motivo}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resumo por Fornecedor */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Resumo por Fornecedor
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

            return (
              <div key={fornecedor} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{fornecedor}</h4>
                  <p className="text-sm text-gray-600">
                    {produtosCotados} produtos cotados • Prazo médio: {Math.round(prazoMedio)} dias
                  </p>
                </div>
                <div className="text-right">
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