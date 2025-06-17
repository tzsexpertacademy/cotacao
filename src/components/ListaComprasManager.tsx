import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, Edit3, Check, X, Star, TrendingDown, Clock, DollarSign, FileText, Download, Send, Filter, Search, Calendar, Tag, AlertTriangle, CheckCircle, Brain, Target } from 'lucide-react';
import { databaseService } from '../services/database';
import toast from 'react-hot-toast';

interface ItemLista {
  id: string;
  produtoId: string;
  descricao: string;
  quantidade: number;
  fornecedorSelecionado: string;
  precoUnitario: number;
  precoTotal: number;
  prazoEntrega: number;
  condicaoPagamento: string;
  observacoes: string;
  motivoSelecao: string;
  economiaGerada: number;
  scoreQualidade: number;
  scoreConfiabilidade: number;
  dataAdicao: string;
  status: 'pendente' | 'solicitado' | 'aprovado' | 'rejeitado';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  categoria: string;
  tags: string[];
}

interface ListaCompras {
  id: string;
  nome: string;
  descricao: string;
  itens: ItemLista[];
  valorTotal: number;
  economiaTotal: number;
  prazoMedio: number;
  dataCriacao: string;
  dataAtualizacao: string;
  status: 'rascunho' | 'finalizada' | 'enviada' | 'aprovada';
  observacoesGerais: string;
  fornecedoresPrincipais: string[];
  categorias: string[];
}

interface FiltrosLista {
  busca: string;
  categoria: string;
  fornecedor: string;
  prioridade: string;
  status: string;
  faixaPreco: { min: number; max: number };
  dataInicio: string;
  dataFim: string;
  ordenarPor: 'preco' | 'prazo' | 'qualidade' | 'economia' | 'data';
  ordem: 'asc' | 'desc';
  mostrarApenas: 'todos' | 'selecionados' | 'recomendados' | 'economia';
}

export const ListaComprasManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'oportunidades' | 'lista' | 'resumo' | 'envio'>('oportunidades');
  const [analises, setAnalises] = useState<any[]>([]);
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [listaAtual, setListaAtual] = useState<ListaCompras | null>(null);
  const [listas, setListas] = useState<ListaCompras[]>([]);
  const [filtros, setFiltros] = useState<FiltrosLista>({
    busca: '',
    categoria: '',
    fornecedor: '',
    prioridade: '',
    status: '',
    faixaPreco: { min: 0, max: 100000 },
    dataInicio: '',
    dataFim: '',
    ordenarPor: 'economia',
    ordem: 'desc',
    mostrarApenas: 'todos'
  });
  const [editandoItem, setEditandoItem] = useState<string | null>(null);
  const [novoItem, setNovoItem] = useState<Partial<ItemLista>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarAnalises();
    carregarListas();
  }, []);

  useEffect(() => {
    if (analises.length > 0) {
      processarOportunidades();
    }
  }, [analises, filtros]);

  const carregarAnalises = () => {
    try {
      const analisesCarregadas = databaseService.getAnalyses();
      setAnalises(analisesCarregadas);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar análises:', error);
      toast.error('Erro ao carregar análises');
      setLoading(false);
    }
  };

  const carregarListas = () => {
    try {
      const listasArmazenadas = localStorage.getItem('listas_compras');
      if (listasArmazenadas) {
        setListas(JSON.parse(listasArmazenadas));
      }
    } catch (error) {
      console.error('Erro ao carregar listas:', error);
    }
  };

  const salvarListas = (novasListas: ListaCompras[]) => {
    try {
      localStorage.setItem('listas_compras', JSON.stringify(novasListas));
      setListas(novasListas);
    } catch (error) {
      console.error('Erro ao salvar listas:', error);
      toast.error('Erro ao salvar listas');
    }
  };

  const processarOportunidades = () => {
    try {
      const todasOportunidades: any[] = [];

      analises.forEach(analise => {
        try {
          const resultado = typeof analise.resultado_analise === 'string' 
            ? JSON.parse(analise.resultado_analise) 
            : analise.resultado_analise;

          if (resultado && resultado.produtos) {
            resultado.produtos.forEach((produto: any) => {
              if (produto.cotacoes && produto.cotacoes.length > 0) {
                // Encontrar melhor cotação
                const melhorCotacao = produto.cotacoes.reduce((melhor: any, atual: any) => {
                  const scoreMelhor = (melhor.score_qualidade || 7) + (melhor.score_confiabilidade || 7) - (melhor.preco_total / 1000);
                  const scoreAtual = (atual.score_qualidade || 7) + (atual.score_confiabilidade || 7) - (atual.preco_total / 1000);
                  return scoreAtual > scoreMelhor ? atual : melhor;
                }, produto.cotacoes[0]);

                // Calcular economia
                const precoMaior = Math.max(...produto.cotacoes.map((c: any) => c.preco_total));
                const economia = precoMaior - melhorCotacao.preco_total;
                const economiaPercentual = precoMaior > 0 ? (economia / precoMaior) * 100 : 0;

                const oportunidade = {
                  id: `oport_${produto.id}_${melhorCotacao.fornecedor}`,
                  analiseId: analise.id,
                  produtoId: produto.id,
                  descricao: produto.descricao,
                  quantidade: produto.quantidade,
                  melhorCotacao,
                  economia,
                  economiaPercentual,
                  categoria: categorizarProduto(produto.descricao),
                  prioridade: calcularPrioridade(economia, economiaPercentual, melhorCotacao),
                  recomendadoIA: produto.recomendacao?.fornecedor_recomendado === melhorCotacao.fornecedor,
                  compatibilidadeCatalogo: produto.compatibilidade_catalogo,
                  dataAnalise: analise.data_criacao,
                  todasCotacoes: produto.cotacoes
                };

                todasOportunidades.push(oportunidade);
              }
            });
          }
        } catch (error) {
          console.error('Erro ao processar análise:', error);
        }
      });

      // Aplicar filtros
      const oportunidadesFiltradas = aplicarFiltros(todasOportunidades);
      setOportunidades(oportunidadesFiltradas);
    } catch (error) {
      console.error('Erro ao processar oportunidades:', error);
      toast.error('Erro ao processar oportunidades');
    }
  };

  const categorizarProduto = (descricao: string): string => {
    const desc = descricao.toLowerCase();
    
    if (desc.includes('notebook') || desc.includes('laptop') || desc.includes('computador')) return 'Informática';
    if (desc.includes('monitor') || desc.includes('tela')) return 'Monitores';
    if (desc.includes('impressora') || desc.includes('scanner')) return 'Impressão';
    if (desc.includes('teclado') || desc.includes('mouse') || desc.includes('cabo')) return 'Periféricos';
    if (desc.includes('smartphone') || desc.includes('celular') || desc.includes('tablet')) return 'Móveis';
    if (desc.includes('software') || desc.includes('licença')) return 'Software';
    if (desc.includes('servidor') || desc.includes('storage') || desc.includes('rede')) return 'Infraestrutura';
    
    return 'Outros';
  };

  const calcularPrioridade = (economia: number, economiaPercentual: number, cotacao: any): 'baixa' | 'media' | 'alta' | 'urgente' => {
    if (economia > 5000 || economiaPercentual > 20) return 'urgente';
    if (economia > 2000 || economiaPercentual > 15) return 'alta';
    if (economia > 500 || economiaPercentual > 10) return 'media';
    return 'baixa';
  };

  const aplicarFiltros = (oportunidades: any[]) => {
    return oportunidades.filter(oport => {
      // Filtro de busca
      if (filtros.busca && !oport.descricao.toLowerCase().includes(filtros.busca.toLowerCase()) &&
          !oport.melhorCotacao.fornecedor.toLowerCase().includes(filtros.busca.toLowerCase())) {
        return false;
      }

      // Filtro de categoria
      if (filtros.categoria && oport.categoria !== filtros.categoria) return false;

      // Filtro de fornecedor
      if (filtros.fornecedor && oport.melhorCotacao.fornecedor !== filtros.fornecedor) return false;

      // Filtro de prioridade
      if (filtros.prioridade && oport.prioridade !== filtros.prioridade) return false;

      // Filtro de faixa de preço
      if (oport.melhorCotacao.preco_total < filtros.faixaPreco.min || 
          oport.melhorCotacao.preco_total > filtros.faixaPreco.max) return false;

      // Filtro de data
      if (filtros.dataInicio && new Date(oport.dataAnalise) < new Date(filtros.dataInicio)) return false;
      if (filtros.dataFim && new Date(oport.dataAnalise) > new Date(filtros.dataFim)) return false;

      // Filtro de mostrar apenas
      if (filtros.mostrarApenas === 'recomendados' && !oport.recomendadoIA) return false;
      if (filtros.mostrarApenas === 'economia' && oport.economia < 100) return false;

      return true;
    }).sort((a, b) => {
      const campo = filtros.ordenarPor;
      let valorA, valorB;

      switch (campo) {
        case 'preco':
          valorA = a.melhorCotacao.preco_total;
          valorB = b.melhorCotacao.preco_total;
          break;
        case 'prazo':
          valorA = a.melhorCotacao.prazo_entrega_dias;
          valorB = b.melhorCotacao.prazo_entrega_dias;
          break;
        case 'qualidade':
          valorA = a.melhorCotacao.score_qualidade || 7;
          valorB = b.melhorCotacao.score_qualidade || 7;
          break;
        case 'economia':
          valorA = a.economia;
          valorB = b.economia;
          break;
        case 'data':
          valorA = new Date(a.dataAnalise).getTime();
          valorB = new Date(b.dataAnalise).getTime();
          break;
        default:
          valorA = a.economia;
          valorB = b.economia;
      }

      return filtros.ordem === 'asc' ? valorA - valorB : valorB - valorA;
    });
  };

  const criarNovaLista = () => {
    const novaLista: ListaCompras = {
      id: `lista_${Date.now()}`,
      nome: `Lista de Compras - ${new Date().toLocaleDateString('pt-BR')}`,
      descricao: 'Lista gerada automaticamente com as melhores oportunidades',
      itens: [],
      valorTotal: 0,
      economiaTotal: 0,
      prazoMedio: 0,
      dataCriacao: new Date().toISOString(),
      dataAtualizacao: new Date().toISOString(),
      status: 'rascunho',
      observacoesGerais: '',
      fornecedoresPrincipais: [],
      categorias: []
    };

    setListaAtual(novaLista);
    toast.success('Nova lista criada!');
  };

  const adicionarItemNaLista = (oportunidade: any) => {
    if (!listaAtual) {
      criarNovaLista();
      setTimeout(() => adicionarItemNaLista(oportunidade), 100);
      return;
    }

    const novoItem: ItemLista = {
      id: `item_${Date.now()}`,
      produtoId: oportunidade.produtoId,
      descricao: oportunidade.descricao,
      quantidade: oportunidade.quantidade,
      fornecedorSelecionado: oportunidade.melhorCotacao.fornecedor,
      precoUnitario: oportunidade.melhorCotacao.preco_unitario,
      precoTotal: oportunidade.melhorCotacao.preco_total,
      prazoEntrega: oportunidade.melhorCotacao.prazo_entrega_dias,
      condicaoPagamento: oportunidade.melhorCotacao.condicao_pagamento,
      observacoes: oportunidade.melhorCotacao.observacoes || '',
      motivoSelecao: oportunidade.recomendadoIA ? 'Recomendado pela IA' : 'Melhor custo-benefício',
      economiaGerada: oportunidade.economia,
      scoreQualidade: oportunidade.melhorCotacao.score_qualidade || 7,
      scoreConfiabilidade: oportunidade.melhorCotacao.score_confiabilidade || 7,
      dataAdicao: new Date().toISOString(),
      status: 'pendente',
      prioridade: oportunidade.prioridade,
      categoria: oportunidade.categoria,
      tags: oportunidade.recomendadoIA ? ['IA', 'Recomendado'] : ['Economia']
    };

    const listaAtualizada = {
      ...listaAtual,
      itens: [...listaAtual.itens, novoItem],
      dataAtualizacao: new Date().toISOString()
    };

    atualizarEstatisticasLista(listaAtualizada);
    setListaAtual(listaAtualizada);
    toast.success(`${oportunidade.descricao} adicionado à lista!`);
  };

  const removerItemDaLista = (itemId: string) => {
    if (!listaAtual) return;

    const listaAtualizada = {
      ...listaAtual,
      itens: listaAtual.itens.filter(item => item.id !== itemId),
      dataAtualizacao: new Date().toISOString()
    };

    atualizarEstatisticasLista(listaAtualizada);
    setListaAtual(listaAtualizada);
    toast.success('Item removido da lista!');
  };

  const atualizarEstatisticasLista = (lista: ListaCompras) => {
    lista.valorTotal = lista.itens.reduce((total, item) => total + item.precoTotal, 0);
    lista.economiaTotal = lista.itens.reduce((total, item) => total + item.economiaGerada, 0);
    lista.prazoMedio = lista.itens.length > 0 
      ? lista.itens.reduce((total, item) => total + item.prazoEntrega, 0) / lista.itens.length 
      : 0;
    lista.fornecedoresPrincipais = [...new Set(lista.itens.map(item => item.fornecedorSelecionado))];
    lista.categorias = [...new Set(lista.itens.map(item => item.categoria))];
  };

  const salvarLista = () => {
    if (!listaAtual) return;

    const listasAtualizadas = listas.filter(l => l.id !== listaAtual.id);
    listasAtualizadas.push(listaAtual);
    salvarListas(listasAtualizadas);
    toast.success('Lista salva com sucesso!');
  };

  const finalizarLista = () => {
    if (!listaAtual || listaAtual.itens.length === 0) {
      toast.error('Adicione pelo menos um item à lista');
      return;
    }

    const listaFinalizada = {
      ...listaAtual,
      status: 'finalizada' as const,
      dataAtualizacao: new Date().toISOString()
    };

    setListaAtual(listaFinalizada);
    
    // Salvar a lista finalizada
    const listasAtualizadas = listas.filter(l => l.id !== listaFinalizada.id);
    listasAtualizadas.push(listaFinalizada);
    salvarListas(listasAtualizadas);
    
    toast.success('Lista finalizada!');
    setActiveTab('resumo');
  };

  const gerarResumoParaVendedor = () => {
    if (!listaAtual) return '';

    const resumo = `
SOLICITAÇÃO DE COTAÇÃO
======================

Data: ${new Date().toLocaleDateString('pt-BR')}
Lista: ${listaAtual.nome}

RESUMO EXECUTIVO:
- Total de itens: ${listaAtual.itens.length}
- Valor total estimado: ${formatarMoeda(listaAtual.valorTotal)}
- Economia projetada: ${formatarMoeda(listaAtual.economiaTotal)}
- Prazo médio desejado: ${Math.round(listaAtual.prazoMedio)} dias

FORNECEDORES PREFERENCIAIS:
${listaAtual.fornecedoresPrincipais.map(f => `- ${f}`).join('\n')}

CATEGORIAS:
${listaAtual.categorias.map(c => `- ${c}`).join('\n')}

ITENS SOLICITADOS:
==================

${listaAtual.itens.map((item, index) => `
${index + 1}. ${item.descricao}
   Quantidade: ${item.quantidade}
   Preço referência: ${formatarMoeda(item.precoUnitario)} (unitário)
   Total estimado: ${formatarMoeda(item.precoTotal)}
   Prazo desejado: ${item.prazoEntrega} dias
   Fornecedor sugerido: ${item.fornecedorSelecionado}
   Prioridade: ${item.prioridade.toUpperCase()}
   Observações: ${item.observacoes || 'Nenhuma'}
   
`).join('')}

CONDIÇÕES GERAIS:
================
- Prazo de validade da proposta: 15 dias
- Condições de pagamento: A negociar
- Local de entrega: A definir
- Garantia mínima: Conforme fabricante

OBSERVAÇÕES ESPECIAIS:
=====================
${listaAtual.observacoesGerais || 'Nenhuma observação especial.'}

---
Esta solicitação foi gerada automaticamente pelo Sistema de Análise de Cotações.
Para dúvidas ou esclarecimentos, entre em contato.
`;

    return resumo;
  };

  const exportarLista = (formato: 'txt' | 'json' | 'csv') => {
    if (!listaAtual) return;

    let conteudo = '';
    let nomeArquivo = '';

    switch (formato) {
      case 'txt':
        conteudo = gerarResumoParaVendedor();
        nomeArquivo = `lista_compras_${listaAtual.id}.txt`;
        break;
      case 'json':
        conteudo = JSON.stringify(listaAtual, null, 2);
        nomeArquivo = `lista_compras_${listaAtual.id}.json`;
        break;
      case 'csv':
        const headers = 'Descrição,Quantidade,Fornecedor,Preço Unitário,Preço Total,Prazo,Categoria,Prioridade\n';
        const linhas = listaAtual.itens.map(item => 
          `"${item.descricao}",${item.quantidade},"${item.fornecedorSelecionado}",${item.precoUnitario},${item.precoTotal},${item.prazoEntrega},"${item.categoria}","${item.prioridade}"`
        ).join('\n');
        conteudo = headers + linhas;
        nomeArquivo = `lista_compras_${listaAtual.id}.csv`;
        break;
    }

    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`Lista exportada como ${formato.toUpperCase()}!`);
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'urgente': return 'bg-red-100 text-red-800 border-red-200';
      case 'alta': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'media': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'baixa': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'finalizada': return 'bg-green-100 text-green-800';
      case 'enviada': return 'bg-blue-100 text-blue-800';
      case 'aprovada': return 'bg-purple-100 text-purple-800';
      case 'rascunho': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Obter listas únicas para filtros
  const categorias = [...new Set(oportunidades.map(o => o.categoria))];
  const fornecedores = [...new Set(oportunidades.map(o => o.melhorCotacao.fornecedor))];

  const tabs = [
    { id: 'oportunidades' as const, label: 'Oportunidades', icon: Target },
    { id: 'lista' as const, label: 'Minha Lista', icon: ShoppingCart },
    { id: 'resumo' as const, label: 'Resumo', icon: FileText },
    { id: 'envio' as const, label: 'Enviar', icon: Send }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (analises.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma análise disponível</h3>
        <p className="text-gray-600 mb-4">
          Faça upload de documentos ou extraia cotações do WhatsApp para começar a criar sua lista de compras.
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => window.location.hash = '#upload'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Upload de Documentos
          </button>
          <button
            onClick={() => window.location.hash = '#whatsapp-cotacoes'}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Extrair do WhatsApp
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Lista de Compras Inteligente
              </h2>
              <p className="text-gray-600">
                Selecione as melhores oportunidades e gere uma lista organizada
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Oportunidades</p>
              <p className="text-2xl font-bold text-blue-600">{oportunidades.length}</p>
            </div>
            {listaAtual && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Itens na Lista</p>
                <p className="text-2xl font-bold text-green-600">{listaAtual.itens.length}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex space-x-1 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.id === 'lista' && listaAtual && listaAtual.itens.length > 0 && (
                  <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {listaAtual.itens.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Oportunidades Tab */}
        {activeTab === 'oportunidades' && (
          <div className="space-y-6">
            {/* Filtros Avançados */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros Avançados</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={filtros.busca}
                      onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                      placeholder="Produto ou fornecedor..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                  <select
                    value={filtros.categoria}
                    onChange={(e) => setFiltros({...filtros, categoria: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todas as categorias</option>
                    {categorias.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fornecedor</label>
                  <select
                    value={filtros.fornecedor}
                    onChange={(e) => setFiltros({...filtros, fornecedor: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos os fornecedores</option>
                    {fornecedores.map(forn => (
                      <option key={forn} value={forn}>{forn}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
                  <select
                    value={filtros.prioridade}
                    onChange={(e) => setFiltros({...filtros, prioridade: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todas as prioridades</option>
                    <option value="urgente">Urgente</option>
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ordenar por</label>
                  <select
                    value={filtros.ordenarPor}
                    onChange={(e) => setFiltros({...filtros, ordenarPor: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="economia">Maior Economia</option>
                    <option value="preco">Menor Preço</option>
                    <option value="prazo">Menor Prazo</option>
                    <option value="qualidade">Maior Qualidade</option>
                    <option value="data">Mais Recente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mostrar apenas</label>
                  <select
                    value={filtros.mostrarApenas}
                    onChange={(e) => setFiltros({...filtros, mostrarApenas: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="todos">Todas as oportunidades</option>
                    <option value="recomendados">Recomendados pela IA</option>
                    <option value="economia">Com economia significativa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preço mínimo</label>
                  <input
                    type="number"
                    value={filtros.faixaPreco.min}
                    onChange={(e) => setFiltros({
                      ...filtros, 
                      faixaPreco: {...filtros.faixaPreco, min: Number(e.target.value)}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preço máximo</label>
                  <input
                    type="number"
                    value={filtros.faixaPreco.max}
                    onChange={(e) => setFiltros({
                      ...filtros, 
                      faixaPreco: {...filtros.faixaPreco, max: Number(e.target.value)}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Lista de Oportunidades */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Oportunidades Identificadas ({oportunidades.length})
                  </h3>
                  {!listaAtual && (
                    <button
                      onClick={criarNovaLista}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nova Lista</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {oportunidades.map((oportunidade) => (
                  <div key={oportunidade.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h4 className="text-lg font-medium text-gray-900">
                            {oportunidade.descricao}
                          </h4>
                          
                          <span className={`px-2 py-1 text-xs rounded-full border ${getPrioridadeColor(oportunidade.prioridade)}`}>
                            {oportunidade.prioridade.toUpperCase()}
                          </span>
                          
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                            {oportunidade.categoria}
                          </span>
                          
                          {oportunidade.recomendadoIA && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center space-x-1">
                              <Brain className="w-3 h-3" />
                              <span>IA</span>
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Fornecedor</p>
                            <p className="font-medium">{oportunidade.melhorCotacao.fornecedor}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Quantidade</p>
                            <p className="font-medium">{oportunidade.quantidade} unidades</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Prazo</p>
                            <p className="font-medium">{oportunidade.melhorCotacao.prazo_entrega_dias} dias</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Qualidade IA</p>
                            <p className="font-medium">{(oportunidade.melhorCotacao.score_qualidade || 7).toFixed(1)}/10</p>
                          </div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-green-700">Economia Potencial</p>
                              <p className="text-lg font-bold text-green-800">
                                {formatarMoeda(oportunidade.economia)} ({oportunidade.economiaPercentual.toFixed(1)}%)
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Preço Total</p>
                              <p className="text-xl font-bold text-gray-900">
                                {formatarMoeda(oportunidade.melhorCotacao.preco_total)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="ml-6">
                        <button
                          onClick={() => adicionarItemNaLista(oportunidade)}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Adicionar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {oportunidades.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>Nenhuma oportunidade encontrada</p>
                    <p className="text-sm">Ajuste os filtros ou faça upload de mais cotações</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lista Tab */}
        {activeTab === 'lista' && (
          <div className="space-y-6">
            {!listaAtual ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma lista ativa</h3>
                <p className="text-gray-600 mb-4">Crie uma nova lista para começar a adicionar itens</p>
                <button
                  onClick={criarNovaLista}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Nova Lista</span>
                </button>
              </div>
            ) : (
              <>
                {/* Header da Lista */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{listaAtual.nome}</h3>
                      <p className="text-gray-600">{listaAtual.descricao}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(listaAtual.status)}`}>
                        {listaAtual.status.toUpperCase()}
                      </span>
                      <button
                        onClick={salvarLista}
                        className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        <Download className="w-4 h-4" />
                        <span>Salvar</span>
                      </button>
                      {listaAtual.status === 'rascunho' && (
                        <button
                          onClick={finalizarLista}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          <Check className="w-4 h-4" />
                          <span>Finalizar</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-600">Total de Itens</p>
                      <p className="text-2xl font-bold text-blue-800">{listaAtual.itens.length}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-600">Valor Total</p>
                      <p className="text-2xl font-bold text-green-800">{formatarMoeda(listaAtual.valorTotal)}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-purple-600">Economia Total</p>
                      <p className="text-2xl font-bold text-purple-800">{formatarMoeda(listaAtual.economiaTotal)}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <p className="text-sm text-orange-600">Prazo Médio</p>
                      <p className="text-2xl font-bold text-orange-800">{Math.round(listaAtual.prazoMedio)} dias</p>
                    </div>
                  </div>
                </div>

                {/* Itens da Lista */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900">Itens da Lista</h4>
                  </div>

                  <div className="divide-y divide-gray-200">
                    {listaAtual.itens.map((item) => (
                      <div key={item.id} className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <h5 className="text-lg font-medium text-gray-900">{item.descricao}</h5>
                              <span className={`px-2 py-1 text-xs rounded-full border ${getPrioridadeColor(item.prioridade)}`}>
                                {item.prioridade.toUpperCase()}
                              </span>
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                                {item.categoria}
                              </span>
                              {item.tags.map(tag => (
                                <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {tag}
                                </span>
                              ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-3">
                              <div>
                                <p className="text-sm text-gray-600">Fornecedor</p>
                                <p className="font-medium">{item.fornecedorSelecionado}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Quantidade</p>
                                <p className="font-medium">{item.quantidade}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Preço Unit.</p>
                                <p className="font-medium">{formatarMoeda(item.precoUnitario)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Total</p>
                                <p className="font-medium">{formatarMoeda(item.precoTotal)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Economia</p>
                                <p className="font-medium text-green-600">{formatarMoeda(item.economiaGerada)}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <p className="text-sm text-gray-600">Prazo</p>
                                <p className="font-medium">{item.prazoEntrega} dias</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Pagamento</p>
                                <p className="font-medium">{item.condicaoPagamento}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Qualidade</p>
                                <p className="font-medium">{item.scoreQualidade.toFixed(1)}/10</p>
                              </div>
                            </div>

                            {item.observacoes && (
                              <div className="mt-3">
                                <p className="text-sm text-gray-600">Observações</p>
                                <p className="text-sm text-gray-800">{item.observacoes}</p>
                              </div>
                            )}

                            <div className="mt-3">
                              <p className="text-sm text-gray-600">Motivo da Seleção</p>
                              <p className="text-sm text-gray-800">{item.motivoSelecao}</p>
                            </div>
                          </div>

                          <div className="ml-6">
                            <button
                              onClick={() => removerItemDaLista(item.id)}
                              className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Remover</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {listaAtual.itens.length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p>Nenhum item na lista</p>
                        <p className="text-sm">Vá para "Oportunidades" para adicionar itens</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Resumo Tab */}
        {activeTab === 'resumo' && listaAtual && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Resumo da Lista</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Estatísticas Gerais</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total de itens:</span>
                      <span className="font-medium">{listaAtual.itens.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valor total:</span>
                      <span className="font-medium">{formatarMoeda(listaAtual.valorTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Economia total:</span>
                      <span className="font-medium text-green-600">{formatarMoeda(listaAtual.economiaTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prazo médio:</span>
                      <span className="font-medium">{Math.round(listaAtual.prazoMedio)} dias</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fornecedores:</span>
                      <span className="font-medium">{listaAtual.fornecedoresPrincipais.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Categorias:</span>
                      <span className="font-medium">{listaAtual.categorias.length}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Distribuição por Categoria</h4>
                  <div className="space-y-2">
                    {listaAtual.categorias.map(categoria => {
                      const itensCategoria = listaAtual.itens.filter(item => item.categoria === categoria);
                      const valorCategoria = itensCategoria.reduce((sum, item) => sum + item.precoTotal, 0);
                      const percentual = (valorCategoria / listaAtual.valorTotal) * 100;
                      
                      return (
                        <div key={categoria} className="flex items-center justify-between">
                          <span className="text-gray-600">{categoria}:</span>
                          <div className="text-right">
                            <span className="font-medium">{formatarMoeda(valorCategoria)}</span>
                            <span className="text-sm text-gray-500 ml-2">({percentual.toFixed(1)}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h4 className="font-medium text-gray-900 mb-4">Fornecedores Principais</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {listaAtual.fornecedoresPrincipais.map(fornecedor => {
                    const itensFornecedor = listaAtual.itens.filter(item => item.fornecedorSelecionado === fornecedor);
                    const valorFornecedor = itensFornecedor.reduce((sum, item) => sum + item.precoTotal, 0);
                    const economiaFornecedor = itensFornecedor.reduce((sum, item) => sum + item.economiaGerada, 0);
                    
                    return (
                      <div key={fornecedor} className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900">{fornecedor}</h5>
                        <div className="mt-2 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Itens:</span>
                            <span>{itensFornecedor.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Valor:</span>
                            <span>{formatarMoeda(valorFornecedor)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Economia:</span>
                            <span className="text-green-600">{formatarMoeda(economiaFornecedor)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Envio Tab */}
        {activeTab === 'envio' && listaAtual && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Enviar Lista para Fornecedores</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Opções de Exportação</h4>
                  <div className="space-y-3">
                    <button
                      onClick={() => exportarLista('txt')}
                      className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <FileText className="w-6 h-6 text-blue-600" />
                      <div className="text-left">
                        <p className="font-medium">Arquivo de Texto (.txt)</p>
                        <p className="text-sm text-gray-600">Formato legível para envio por email</p>
                      </div>
                    </button>

                    <button
                      onClick={() => exportarLista('csv')}
                      className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <FileText className="w-6 h-6 text-green-600" />
                      <div className="text-left">
                        <p className="font-medium">Planilha (.csv)</p>
                        <p className="text-sm text-gray-600">Para abrir no Excel ou Google Sheets</p>
                      </div>
                    </button>

                    <button
                      onClick={() => exportarLista('json')}
                      className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <FileText className="w-6 h-6 text-purple-600" />
                      <div className="text-left">
                        <p className="font-medium">Dados Estruturados (.json)</p>
                        <p className="text-sm text-gray-600">Para integração com sistemas</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Preview do Resumo</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                      {gerarResumoParaVendedor()}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Próximos Passos</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Exporte a lista no formato desejado</li>
                  <li>• Envie para os fornecedores selecionados</li>
                  <li>• Aguarde as propostas e compare com as referências</li>
                  <li>• Use o sistema para analisar as novas cotações recebidas</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};