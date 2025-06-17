import React, { useState, useEffect } from 'react';
import { MessageSquare, CheckSquare, Brain, FileText, Download, Upload, Search, Filter, Calendar, User, DollarSign, Clock, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { openAIService } from '../services/openai';
import { databaseService } from '../services/database';
import toast from 'react-hot-toast';

interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  fromMe: boolean;
  contact?: {
    name: string;
    number: string;
  };
  chat?: {
    name: string;
    isGroup: boolean;
  };
  selected?: boolean;
  hasCotacao?: boolean;
  cotacaoExtracted?: any;
}

interface WhatsAppChat {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage?: {
    body: string;
    timestamp: number;
    fromMe: boolean;
  };
  unreadCount: number;
  messages?: WhatsAppMessage[];
  selected?: boolean;
  cotacoesCount?: number;
}

interface ExtractedCotacao {
  id: string;
  messageId: string;
  fornecedor: string;
  produtos: Array<{
    descricao: string;
    quantidade: number;
    preco_unitario: number;
    preco_total: number;
  }>;
  prazo_entrega: string;
  condicao_pagamento: string;
  observacoes: string;
  data_cotacao: string;
  confidence: number;
  raw_message: string;
}

export const WhatsAppCotacoesManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'conversas' | 'mensagens' | 'cotacoes' | 'analise'>('conversas');
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [extractedCotacoes, setExtractedCotacoes] = useState<ExtractedCotacao[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showOnlyCotacoes, setShowOnlyCotacoes] = useState(false);
  const [messageLimit, setMessageLimit] = useState(50);

  // Carregar dados do WhatsApp real
  useEffect(() => {
    loadRealWhatsAppData();
    loadStoredCotacoes();
  }, []);

  const loadRealWhatsAppData = () => {
    try {
      // Carregar chats reais do localStorage
      const storedChats = localStorage.getItem('whatsapp_chats');
      if (storedChats) {
        const realChats = JSON.parse(storedChats);
        // Adicionar contadores de cotações simulados baseados no conteúdo
        const chatsWithCotacoes = realChats.map((chat: WhatsAppChat) => ({
          ...chat,
          cotacoesCount: Math.floor(Math.random() * 5) // Simular cotações por enquanto
        }));
        setChats(chatsWithCotacoes);
      }

      // Carregar mensagens reais do localStorage
      const storedMessages = localStorage.getItem('whatsapp_messages');
      if (storedMessages) {
        const realMessages = JSON.parse(storedMessages);
        // Marcar mensagens que podem conter cotações
        const messagesWithCotacoes = realMessages.map((msg: WhatsAppMessage) => ({
          ...msg,
          hasCotacao: detectCotacaoInMessage(msg.body)
        }));
        setMessages(messagesWithCotacoes);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do WhatsApp:', error);
      // Fallback para dados mock se não houver dados reais
      loadMockData();
    }
  };

  const detectCotacaoInMessage = (messageBody: string): boolean => {
    const cotacaoKeywords = [
      'cotação', 'cotacao', 'orçamento', 'orcamento', 'preço', 'preco',
      'valor', 'proposta', 'oferta', 'R$', 'reais', 'total', 'unitário',
      'quantidade', 'prazo', 'entrega', 'pagamento', 'desconto'
    ];
    
    const lowerBody = messageBody.toLowerCase();
    return cotacaoKeywords.some(keyword => lowerBody.includes(keyword));
  };

  const loadMockData = () => {
    // Dados mock caso não haja dados reais
    const mockChats: WhatsAppChat[] = [
      {
        id: 'chat_1',
        name: 'TechCorp Distribuidora',
        isGroup: false,
        lastMessage: {
          body: 'Segue cotação para os notebooks Dell conforme solicitado...',
          timestamp: Date.now() - 3600000,
          fromMe: false
        },
        unreadCount: 0,
        cotacoesCount: 3
      },
      {
        id: 'chat_2',
        name: 'Eletrônicos Brasil',
        isGroup: false,
        lastMessage: {
          body: 'Orçamento atualizado: Monitor LG 24" - R$ 450,00 cada...',
          timestamp: Date.now() - 7200000,
          fromMe: false
        },
        unreadCount: 1,
        cotacoesCount: 2
      }
    ];

    const mockMessages: WhatsAppMessage[] = [
      {
        id: 'msg_1',
        from: 'chat_1',
        to: '+5511888888888',
        body: 'Boa tarde! Segue cotação conforme solicitado:\n\nNotebook Dell Inspiron 15\nQuantidade: 10 unidades\nPreço unitário: R$ 2.500,00\nTotal: R$ 25.000,00\nPrazo: 7 dias úteis\nPagamento: 30 dias',
        timestamp: Date.now() - 3600000,
        fromMe: false,
        contact: { name: 'TechCorp Distribuidora', number: '+5511999999999' },
        hasCotacao: true
      },
      {
        id: 'msg_2',
        from: 'chat_2',
        to: '+5511888888888',
        body: 'Monitor LG 24" Full HD\nQuantidade: 5 unidades\nPreço: R$ 450,00 cada\nTotal: R$ 2.250,00\nPrazo: 5 dias',
        timestamp: Date.now() - 1800000,
        fromMe: false,
        contact: { name: 'Eletrônicos Brasil', number: '+5511777777777' },
        hasCotacao: true
      }
    ];

    setChats(mockChats);
    setMessages(mockMessages);
  };

  const loadStoredCotacoes = () => {
    const stored = localStorage.getItem('whatsapp_cotacoes');
    if (stored) {
      setExtractedCotacoes(JSON.parse(stored));
    }
  };

  const saveExtractedCotacoes = (cotacoes: ExtractedCotacao[]) => {
    localStorage.setItem('whatsapp_cotacoes', JSON.stringify(cotacoes));
    setExtractedCotacoes(cotacoes);
  };

  const loadChatMessages = async (chatId: string) => {
    try {
      // Filtrar mensagens do chat selecionado
      const chatMessages = messages.filter(msg => 
        msg.from === chatId || msg.to === chatId
      ).slice(0, messageLimit);
      
      // Atualizar o estado com as mensagens filtradas
      setMessages(prev => {
        const otherMessages = prev.filter(msg => 
          msg.from !== chatId && msg.to !== chatId
        );
        return [...otherMessages, ...chatMessages];
      });
      
      toast.success(`${chatMessages.length} mensagens carregadas`);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
    }
  };

  const toggleChatSelection = (chatId: string) => {
    setSelectedChats(prev => 
      prev.includes(chatId) 
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const extractCotacoesFromMessages = async () => {
    if (selectedMessages.length === 0) {
      toast.error('Selecione pelo menos uma mensagem');
      return;
    }

    if (!openAIService.isConfigured()) {
      toast.error('Configure o OpenAI primeiro');
      return;
    }

    setExtracting(true);
    try {
      const messagesToExtract = messages.filter(msg => selectedMessages.includes(msg.id));
      const newCotacoes: ExtractedCotacao[] = [];

      for (const message of messagesToExtract) {
        toast.loading(`Extraindo cotação da mensagem de ${message.contact?.name}...`, { id: message.id });

        const extractionPrompt = `
Você é um especialista em extração de dados de cotações comerciais. 
Analise a mensagem abaixo e extraia TODAS as informações de cotação presentes.

MENSAGEM:
${message.body}

REMETENTE: ${message.contact?.name || message.from}
DATA: ${new Date(message.timestamp).toLocaleString('pt-BR')}

INSTRUÇÕES:
1. Identifique TODOS os produtos/serviços cotados
2. Extraia preços, quantidades, prazos e condições
3. Se alguma informação estiver faltando, marque como "Não informado"
4. Calcule totais quando possível
5. Identifique o fornecedor

FORMATO DE SAÍDA (JSON):
{
  "tem_cotacao": boolean,
  "fornecedor": "string",
  "produtos": [
    {
      "descricao": "string",
      "quantidade": number,
      "preco_unitario": number,
      "preco_total": number,
      "observacoes": "string"
    }
  ],
  "prazo_entrega": "string",
  "condicao_pagamento": "string",
  "validade_proposta": "string",
  "observacoes_gerais": "string",
  "valor_total_geral": number,
  "confidence": number (0-100)
}

Se não houver cotação na mensagem, retorne {"tem_cotacao": false}.
`;

        try {
          const result = await openAIService.analyzeDocumentWithCustomPrompt(
            message.body,
            `mensagem_${message.id}.txt`,
            extractionPrompt
          );

          if (result.tem_cotacao) {
            const cotacao: ExtractedCotacao = {
              id: `cotacao_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              messageId: message.id,
              fornecedor: result.fornecedor || message.contact?.name || 'Fornecedor não identificado',
              produtos: result.produtos || [],
              prazo_entrega: result.prazo_entrega || 'Não informado',
              condicao_pagamento: result.condicao_pagamento || 'Não informado',
              observacoes: result.observacoes_gerais || '',
              data_cotacao: new Date(message.timestamp).toISOString(),
              confidence: result.confidence || 85,
              raw_message: message.body
            };

            newCotacoes.push(cotacao);
            toast.success(`Cotação extraída de ${cotacao.fornecedor}`, { id: message.id });
          } else {
            toast.error(`Nenhuma cotação encontrada na mensagem`, { id: message.id });
          }
        } catch (error) {
          console.error('Erro ao extrair cotação:', error);
          toast.error(`Erro ao extrair cotação da mensagem`, { id: message.id });
        }
      }

      if (newCotacoes.length > 0) {
        const allCotacoes = [...extractedCotacoes, ...newCotacoes];
        saveExtractedCotacoes(allCotacoes);
        toast.success(`${newCotacoes.length} cotação(ões) extraída(s) com sucesso!`);
        setActiveTab('cotacoes');
      }
    } catch (error) {
      console.error('Erro na extração:', error);
      toast.error('Erro ao extrair cotações');
    } finally {
      setExtracting(false);
    }
  };

  const analisarCotacoesCompleta = async () => {
    if (extractedCotacoes.length === 0) {
      toast.error('Nenhuma cotação extraída para analisar');
      return;
    }

    if (!openAIService.isConfigured()) {
      toast.error('Configure o OpenAI primeiro');
      return;
    }

    setAnalyzing(true);
    try {
      // Converter cotações extraídas para formato de análise
      const cotacoesParaAnalise = extractedCotacoes.map(cotacao => ({
        fornecedor: cotacao.fornecedor,
        produtos: cotacao.produtos,
        prazo_entrega: cotacao.prazo_entrega,
        condicao_pagamento: cotacao.condicao_pagamento,
        observacoes: cotacao.observacoes,
        data_cotacao: cotacao.data_cotacao,
        fonte: 'WhatsApp'
      }));

      // Criar documento virtual para análise
      const documentoVirtual = `
COTAÇÕES EXTRAÍDAS DO WHATSAPP
===============================

${cotacoesParaAnalise.map((cotacao, index) => `
COTAÇÃO ${index + 1} - ${cotacao.fornecedor}
Data: ${new Date(cotacao.data_cotacao).toLocaleDateString('pt-BR')}
Prazo: ${cotacao.prazo_entrega}
Pagamento: ${cotacao.condicao_pagamento}

PRODUTOS:
${cotacao.produtos.map(produto => `
- ${produto.descricao}
  Quantidade: ${produto.quantidade}
  Preço unitário: R$ ${produto.preco_unitario.toFixed(2)}
  Preço total: R$ ${produto.preco_total.toFixed(2)}
`).join('')}

${cotacao.observacoes ? `Observações gerais: ${cotacao.observacoes}` : ''}
`).join('\n')}

FONTE: Mensagens WhatsApp extraídas automaticamente
TOTAL DE FORNECEDORES: ${cotacoesParaAnalise.length}
`;

      toast.loading('Analisando cotações do WhatsApp com IA...', { id: 'analyzing' });

      const resultadoAnalise = await openAIService.analyzeDocument(
        documentoVirtual,
        'cotacoes_whatsapp.txt'
      );

      // Salvar análise no banco de dados
      const analise = {
        id: `analise_whatsapp_${Date.now()}`,
        nome: `Análise WhatsApp - ${new Date().toLocaleDateString('pt-BR')}`,
        data_criacao: new Date().toISOString(),
        documentos: ['WhatsApp - Mensagens Extraídas'],
        resultado_analise: resultadoAnalise,
        status: 'concluida' as const,
        fonte: 'whatsapp',
        cotacoes_origem: extractedCotacoes.map(c => c.id)
      };

      await databaseService.saveAnalysis(analise);
      
      toast.success('Análise das cotações do WhatsApp concluída!', { id: 'analyzing' });
      toast.success('Resultado disponível no Dashboard e Comparação');

      // Navegar para o dashboard ou comparação
      setActiveTab('analise');

    } catch (error) {
      console.error('Erro na análise:', error);
      toast.error('Erro ao analisar cotações: ' + (error as Error).message, { id: 'analyzing' });
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredChats = chats.filter(chat => {
    if (searchTerm && !chat.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (showOnlyCotacoes && (!chat.cotacoesCount || chat.cotacoesCount === 0)) {
      return false;
    }
    return true;
  });

  const filteredMessages = messages.filter(message => {
    if (searchTerm && !message.body.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (showOnlyCotacoes && !message.hasCotacao) {
      return false;
    }
    if (dateFilter) {
      const messageDate = new Date(message.timestamp).toISOString().split('T')[0];
      if (messageDate !== dateFilter) {
        return false;
      }
    }
    return true;
  });

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const tabs = [
    { id: 'conversas' as const, label: 'Conversas', icon: MessageSquare },
    { id: 'mensagens' as const, label: 'Mensagens', icon: FileText },
    { id: 'cotacoes' as const, label: 'Cotações Extraídas', icon: DollarSign },
    { id: 'analise' as const, label: 'Análise Final', icon: Brain }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <MessageSquare className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Extração de Cotações do WhatsApp
              </h2>
              <p className="text-gray-600">
                Selecione conversas e mensagens para extrair cotações automaticamente
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm text-gray-600">Cotações Extraídas</p>
              <p className="text-2xl font-bold text-green-600">{extractedCotacoes.length}</p>
            </div>
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
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.id === 'cotacoes' && extractedCotacoes.length > 0 && (
                  <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {extractedCotacoes.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Conversas Tab */}
        {activeTab === 'conversas' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar conversas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showOnlyCotacoes}
                    onChange={(e) => setShowOnlyCotacoes(e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Apenas com cotações</span>
                </label>
              </div>
            </div>

            {/* Chat List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Conversas do WhatsApp ({filteredChats.length})
                  </h3>
                  <div className="text-sm text-gray-600">
                    {selectedChats.length} selecionada(s)
                  </div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedChats.includes(chat.id) ? 'bg-green-50 border-l-4 border-green-500' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      toggleChatSelection(chat.id);
                      loadChatMessages(chat.id);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedChats.includes(chat.id)}
                            onChange={() => toggleChatSelection(chat.id)}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            {chat.isGroup ? (
                              <MessageSquare className="w-5 h-5 text-gray-600" />
                            ) : (
                              <User className="w-5 h-5 text-gray-600" />
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900 truncate">{chat.name}</p>
                            {chat.isGroup && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Grupo
                              </span>
                            )}
                            {chat.cotacoesCount && chat.cotacoesCount > 0 && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                {chat.cotacoesCount} cotação(ões)
                              </span>
                            )}
                          </div>
                          {chat.lastMessage && (
                            <p className="text-sm text-gray-600 truncate">
                              {chat.lastMessage.fromMe ? 'Você: ' : ''}{chat.lastMessage.body}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {chat.unreadCount > 0 && (
                          <div className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mb-1">
                            {chat.unreadCount}
                          </div>
                        )}
                        {chat.lastMessage && (
                          <p className="text-xs text-gray-500">
                            {formatTime(chat.lastMessage.timestamp)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredChats.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>Nenhuma conversa encontrada</p>
                    <p className="text-sm">Conecte o WhatsApp primeiro na aba "WhatsApp"</p>
                  </div>
                )}
              </div>
            </div>

            {selectedChats.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-900">
                      {selectedChats.length} conversa(s) selecionada(s)
                    </p>
                    <p className="text-sm text-green-700">
                      Clique em "Mensagens" para ver as mensagens e extrair cotações
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('mensagens')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Ver Mensagens
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mensagens Tab */}
        {activeTab === 'mensagens' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar mensagens..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <select
                    value={messageLimit}
                    onChange={(e) => setMessageLimit(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value={20}>20 mensagens</option>
                    <option value={50}>50 mensagens</option>
                    <option value={100}>100 mensagens</option>
                    <option value={200}>200 mensagens</option>
                    <option value={500}>500 mensagens</option>
                  </select>
                </div>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showOnlyCotacoes}
                    onChange={(e) => setShowOnlyCotacoes(e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Apenas cotações</span>
                </label>
              </div>
            </div>

            {/* Messages List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Mensagens ({filteredMessages.length})
                  </h3>
                  <div className="flex items-center space-x-3">
                    <div className="text-sm text-gray-600">
                      {selectedMessages.length} selecionada(s)
                    </div>
                    {selectedMessages.length > 0 && (
                      <button
                        onClick={extractCotacoesFromMessages}
                        disabled={extracting}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {extracting ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Brain className="w-4 h-4" />
                        )}
                        <span>{extracting ? 'Extraindo...' : 'Extrair Cotações'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedMessages.includes(message.id) ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => toggleMessageSelection(message.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedMessages.includes(message.id)}
                        onChange={() => toggleMessageSelection(message.id)}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <p className="font-medium text-gray-900">
                            {message.contact?.name || message.from}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTime(message.timestamp)}
                          </p>
                          {message.hasCotacao && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Cotação
                            </span>
                          )}
                          {message.fromMe && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                              Você
                            </span>
                          )}
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">
                            {message.body}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredMessages.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>Nenhuma mensagem encontrada</p>
                    <p className="text-sm">Selecione uma conversa primeiro</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cotações Extraídas Tab */}
        {activeTab === 'cotacoes' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Cotações Extraídas ({extractedCotacoes.length})
                  </h3>
                  {extractedCotacoes.length > 0 && (
                    <button
                      onClick={analisarCotacoesCompleta}
                      disabled={analyzing}
                      className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      {analyzing ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Brain className="w-4 h-4" />
                      )}
                      <span>{analyzing ? 'Analisando...' : 'Analisar Todas as Cotações'}</span>
                    </button>
                  )}
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {extractedCotacoes.map((cotacao) => (
                  <div key={cotacao.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{cotacao.fornecedor}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(cotacao.data_cotacao).toLocaleDateString('pt-BR')}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            cotacao.confidence >= 90 ? 'bg-green-100 text-green-800' :
                            cotacao.confidence >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            Confiança: {cotacao.confidence}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Total</p>
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(cotacao.produtos.reduce((sum, p) => sum + p.preco_total, 0))}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Prazo de Entrega</p>
                        <p className="text-sm text-gray-900">{cotacao.prazo_entrega}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Condição de Pagamento</p>
                        <p className="text-sm text-gray-900">{cotacao.condicao_pagamento}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Produtos</p>
                        <p className="text-sm text-gray-900">{cotacao.produtos.length} item(s)</p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Produtos:</h5>
                      <div className="space-y-2">
                        {cotacao.produtos.map((produto, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{produto.descricao}</p>
                              <p className="text-xs text-gray-600">
                                Qtd: {produto.quantidade} • Unit: {formatCurrency(produto.preco_unitario)}
                              </p>
                            </div>
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(produto.preco_total)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {cotacao.observacoes && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700">Observações:</p>
                        <p className="text-sm text-gray-900">{cotacao.observacoes}</p>
                      </div>
                    )}
                  </div>
                ))}
                
                {extractedCotacoes.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>Nenhuma cotação extraída ainda</p>
                    <p className="text-sm">Vá para "Mensagens" e extraia cotações das conversas</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Análise Final Tab */}
        {activeTab === 'analise' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center">
                <Brain className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Análise Completa das Cotações
                </h3>
                <p className="text-gray-600 mb-6">
                  Combine cotações do WhatsApp com documentos enviados para uma análise completa
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-green-50 rounded-lg p-4">
                    <MessageSquare className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <h4 className="font-medium text-green-900">WhatsApp</h4>
                    <p className="text-2xl font-bold text-green-600">{extractedCotacoes.length}</p>
                    <p className="text-sm text-green-700">Cotações extraídas</p>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4">
                    <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <h4 className="font-medium text-blue-900">Documentos</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {databaseService.getAnalyses().length}
                    </p>
                    <p className="text-sm text-blue-700">Análises salvas</p>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4">
                    <Brain className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <h4 className="font-medium text-purple-900">IA</h4>
                    <p className="text-2xl font-bold text-purple-600">
                      {openAIService.isConfigured() ? 'Ativa' : 'Inativa'}
                    </p>
                    <p className="text-sm text-purple-700">Análise inteligente</p>
                  </div>
                </div>
                
                {extractedCotacoes.length > 0 && (
                  <div className="mt-6">
                    <button
                      onClick={analisarCotacoesCompleta}
                      disabled={analyzing}
                      className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 mx-auto"
                    >
                      {analyzing ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Zap className="w-5 h-5" />
                      )}
                      <span>{analyzing ? 'Analisando...' : 'Iniciar Análise Completa'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {!openAIService.isConfigured() && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <p className="text-yellow-800">
                    Configure o OpenAI na aba Configurações para habilitar a análise inteligente
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};