import React, { useState } from 'react';
import { MessageSquare, Users, Send, Zap, FileText, Download, Upload, TestTube, Bot, Shuffle, Play, CheckCircle } from 'lucide-react';
import { openAIService } from '../services/openai';
import { databaseService } from '../services/database';
import toast from 'react-hot-toast';

interface TestMessage {
  id: string;
  from: string;
  body: string;
  timestamp: number;
  contact: {
    name: string;
    number: string;
  };
  hasCotacao: boolean;
}

interface TestChat {
  id: string;
  name: string;
  isGroup: boolean;
  messages: TestMessage[];
  cotacoesCount: number;
}

export const WhatsAppTestModule: React.FC = () => {
  const [testChats, setTestChats] = useState<TestChat[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [extractedCotacoes, setExtractedCotacoes] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Templates de mensagens de cotação realistas
  const cotacaoTemplates = [
    {
      fornecedor: "TechCorp Distribuidora",
      numero: "+5511999887766",
      mensagens: [
        "Boa tarde! Segue cotação conforme solicitado:\n\nNotebook Dell Inspiron 15\nQuantidade: 10 unidades\nPreço unitário: R$ 2.500,00\nTotal: R$ 25.000,00\nPrazo: 7 dias úteis\nPagamento: 30 dias\n\nObrigado!",
        "Orçamento atualizado:\n\nMonitor LG 24\" Full HD\n- Quantidade: 15 unidades\n- Preço: R$ 450,00 cada\n- Total: R$ 6.750,00\n- Prazo: 5 dias úteis\n- Condições: À vista com 3% desconto\n\nAguardo retorno!",
        "Cotação para impressoras:\n\nHP LaserJet Pro M404dn\nQtd: 5 unidades\nValor unitário: R$ 1.200,00\nValor total: R$ 6.000,00\nPrazo de entrega: 10 dias\nGarantia: 12 meses\nFrete incluso"
      ]
    },
    {
      fornecedor: "Eletrônicos Brasil",
      numero: "+5511888776655",
      mensagens: [
        "Prezado cliente,\n\nSegue nossa proposta:\n\nTeclado + Mouse Logitech MK540\nQuantidade: 20 conjuntos\nPreço unitário: R$ 150,00\nSubtotal: R$ 3.000,00\nDesconto 5%: R$ 150,00\nTotal: R$ 2.850,00\nPrazo: 3 dias úteis",
        "Cotação para cabos HDMI:\n\n- Cabo HDMI 2.0 - 2 metros\n- Quantidade: 50 unidades\n- Preço: R$ 12,50 cada\n- Total: R$ 625,00\n- Entrega: 2 dias úteis\n- Pagamento: 15 dias",
        "Proposta comercial:\n\nWebcam Logitech C920\nQtd: 8 unidades\nValor: R$ 280,00 cada\nTotal: R$ 2.240,00\nPrazo: 7 dias\nCondições: 30 dias ou à vista com 5% desconto"
      ]
    },
    {
      fornecedor: "Conecta Soluções",
      numero: "+5511777665544",
      mensagens: [
        "Olá! Cotação solicitada:\n\nRoteador TP-Link Archer C6\nQuantidade: 12 unidades\nPreço unitário: R$ 180,00\nPreço total: R$ 2.160,00\nPrazo de entrega: 4 dias úteis\nGarantia: 24 meses\nInstalação: Opcional +R$ 50,00",
        "Orçamento para switches:\n\nSwitch 8 portas Gigabit\n- Marca: D-Link DGS-1008A\n- Qtd: 6 unidades\n- Preço: R$ 95,00 cada\n- Total: R$ 570,00\n- Prazo: 3 dias\n- Frete grátis",
        "Proposta para nobreaks:\n\nNobreak SMS 1200VA\nQuantidade: 4 unidades\nValor unitário: R$ 320,00\nValor total: R$ 1.280,00\nPrazo: 5 dias úteis\nGarantia: 12 meses\nInstalação inclusa"
      ]
    },
    {
      fornecedor: "InfoTech Equipamentos",
      numero: "+5511666554433",
      mensagens: [
        "Segue cotação para tablets:\n\nTablet Samsung Galaxy Tab A8\nTela: 10.5 polegadas\nQuantidade: 6 unidades\nPreço: R$ 850,00 cada\nTotal: R$ 5.100,00\nPrazo: 8 dias úteis\nCondições: 45 dias para pagamento",
        "Orçamento smartphones:\n\nSamsung Galaxy A54 5G\n- Memória: 128GB\n- Qtd: 10 unidades\n- Preço: R$ 1.450,00 cada\n- Total: R$ 14.500,00\n- Prazo: 12 dias\n- Garantia: 12 meses",
        "Cotação para fones:\n\nFone Bluetooth JBL Tune 510BT\nQuantidade: 25 unidades\nPreço unitário: R$ 120,00\nTotal: R$ 3.000,00\nPrazo: 3 dias\nCores: Preto, Branco, Azul"
      ]
    },
    {
      fornecedor: "Digital Solutions",
      numero: "+5511555443322",
      mensagens: [
        "Proposta para licenças:\n\nMicrosoft Office 365 Business\nQuantidade: 50 licenças\nPreço: R$ 25,00/mês por usuário\nTotal mensal: R$ 1.250,00\nTotal anual: R$ 15.000,00\nSuporte técnico incluso",
        "Cotação antivírus corporativo:\n\nKaspersky Endpoint Security\n- 30 licenças\n- Preço: R$ 45,00 por licença/ano\n- Total: R$ 1.350,00\n- Renovação automática\n- Suporte 24/7",
        "Orçamento para backup:\n\nSolução de backup em nuvem\nEspaço: 1TB\nQuantidade: 5 contas\nPreço: R$ 80,00/mês por conta\nTotal mensal: R$ 400,00\nTotal anual: R$ 4.800,00"
      ]
    }
  ];

  const mensagensNormais = [
    "Bom dia! Como está?",
    "Obrigado pelo atendimento!",
    "Quando vocês podem entregar?",
    "Preciso de mais informações sobre garantia",
    "Vocês fazem instalação?",
    "Qual o prazo de pagamento?",
    "Podem enviar por email também?",
    "Muito obrigado pela cotação!",
    "Vou analisar e retorno em breve",
    "Excelente! Vamos fechar negócio"
  ];

  const gerarConversasTeste = () => {
    setGenerating(true);
    
    try {
      const novasConversas: TestChat[] = [];
      
      cotacaoTemplates.forEach((template, index) => {
        const chatId = `chat_test_${Date.now()}_${index}`;
        const mensagens: TestMessage[] = [];
        
        // Adicionar mensagens de cotação
        template.mensagens.forEach((mensagem, msgIndex) => {
          mensagens.push({
            id: `msg_${chatId}_${msgIndex}`,
            from: template.numero,
            body: mensagem,
            timestamp: Date.now() - (Math.random() * 86400000), // Últimas 24h
            contact: {
              name: template.fornecedor,
              number: template.numero
            },
            hasCotacao: true
          });
        });
        
        // Adicionar algumas mensagens normais
        const numMensagensNormais = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numMensagensNormais; i++) {
          const mensagemNormal = mensagensNormais[Math.floor(Math.random() * mensagensNormais.length)];
          mensagens.push({
            id: `msg_normal_${chatId}_${i}`,
            from: template.numero,
            body: mensagemNormal,
            timestamp: Date.now() - (Math.random() * 86400000),
            contact: {
              name: template.fornecedor,
              number: template.numero
            },
            hasCotacao: false
          });
        }
        
        // Ordenar mensagens por timestamp
        mensagens.sort((a, b) => b.timestamp - a.timestamp);
        
        novasConversas.push({
          id: chatId,
          name: template.fornecedor,
          isGroup: false,
          messages: mensagens,
          cotacoesCount: template.mensagens.length
        });
      });
      
      setTestChats(novasConversas);
      toast.success(`${novasConversas.length} conversas de teste geradas!`);
      
      // Salvar no localStorage para persistir
      localStorage.setItem('whatsapp_test_chats', JSON.stringify(novasConversas));
      
    } catch (error) {
      toast.error('Erro ao gerar conversas de teste');
    } finally {
      setGenerating(false);
    }
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const selecionarTodasCotacoes = () => {
    const cotacaoMessages = testChats.flatMap(chat => 
      chat.messages.filter(msg => msg.hasCotacao).map(msg => msg.id)
    );
    setSelectedMessages(cotacaoMessages);
    toast.success(`${cotacaoMessages.length} mensagens de cotação selecionadas`);
  };

  const extrairCotacoesComIA = async () => {
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
      const mensagensSelecionadas = testChats.flatMap(chat => 
        chat.messages.filter(msg => selectedMessages.includes(msg.id))
      );

      const novasCotacoes: any[] = [];

      for (const message of mensagensSelecionadas) {
        toast.loading(`Extraindo cotação de ${message.contact.name}...`, { id: message.id });

        const extractionPrompt = `
Você é um especialista em extração de dados de cotações comerciais do WhatsApp.
Analise a mensagem abaixo e extraia TODAS as informações de cotação presentes.

MENSAGEM:
${message.body}

REMETENTE: ${message.contact.name}
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
            `whatsapp_test_${message.id}.txt`,
            extractionPrompt
          );

          if (result.tem_cotacao) {
            const cotacao = {
              id: `cotacao_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              messageId: message.id,
              fornecedor: result.fornecedor || message.contact.name,
              produtos: result.produtos || [],
              prazo_entrega: result.prazo_entrega || 'Não informado',
              condicao_pagamento: result.condicao_pagamento || 'Não informado',
              observacoes: result.observacoes_gerais || '',
              data_cotacao: new Date(message.timestamp).toISOString(),
              confidence: result.confidence || 85,
              raw_message: message.body,
              fonte: 'teste'
            };

            novasCotacoes.push(cotacao);
            toast.success(`Cotação extraída de ${cotacao.fornecedor}`, { id: message.id });
          } else {
            toast.error(`Nenhuma cotação encontrada na mensagem`, { id: message.id });
          }
        } catch (error) {
          console.error('Erro ao extrair cotação:', error);
          toast.error(`Erro ao extrair cotação da mensagem`, { id: message.id });
        }
      }

      if (novasCotacoes.length > 0) {
        setExtractedCotacoes(prev => [...prev, ...novasCotacoes]);
        
        // Salvar no localStorage
        const todasCotacoes = [...extractedCotacoes, ...novasCotacoes];
        localStorage.setItem('whatsapp_test_cotacoes', JSON.stringify(todasCotacoes));
        
        toast.success(`${novasCotacoes.length} cotação(ões) extraída(s) com sucesso!`);
      }
    } catch (error) {
      console.error('Erro na extração:', error);
      toast.error('Erro ao extrair cotações');
    } finally {
      setExtracting(false);
    }
  };

  const analisarTodasCotacoes = async () => {
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
      // Converter cotações para formato de análise
      const documentoVirtual = `
COTAÇÕES EXTRAÍDAS DO WHATSAPP - TESTE
=====================================

${extractedCotacoes.map((cotacao, index) => `
COTAÇÃO ${index + 1} - ${cotacao.fornecedor}
Data: ${new Date(cotacao.data_cotacao).toLocaleDateString('pt-BR')}
Prazo: ${cotacao.prazo_entrega}
Pagamento: ${cotacao.condicao_pagamento}
Confiança: ${cotacao.confidence}%

PRODUTOS:
${cotacao.produtos.map((produto: any) => `
- ${produto.descricao}
  Quantidade: ${produto.quantidade}
  Preço unitário: R$ ${produto.preco_unitario.toFixed(2)}
  Preço total: R$ ${produto.preco_total.toFixed(2)}
  ${produto.observacoes ? `Observações: ${produto.observacoes}` : ''}
`).join('')}

${cotacao.observacoes ? `Observações gerais: ${cotacao.observacoes}` : ''}
`).join('\n')}

FONTE: Mensagens WhatsApp de Teste
TOTAL DE FORNECEDORES: ${extractedCotacoes.length}
SISTEMA: Teste de Extração com IA
`;

      toast.loading('Analisando cotações de teste com IA...', { id: 'analyzing' });

      const resultadoAnalise = await openAIService.analyzeDocument(
        documentoVirtual,
        'cotacoes_whatsapp_teste.txt'
      );

      // Salvar análise no banco de dados
      const analise = {
        id: `analise_teste_${Date.now()}`,
        nome: `Análise WhatsApp TESTE - ${new Date().toLocaleDateString('pt-BR')}`,
        data_criacao: new Date().toISOString(),
        documentos: ['WhatsApp - Mensagens de Teste'],
        resultado_analise: resultadoAnalise,
        status: 'concluida' as const,
        fonte: 'whatsapp_teste',
        cotacoes_origem: extractedCotacoes.map(c => c.id)
      };

      await databaseService.saveAnalysis(analise);
      
      toast.success('Análise das cotações de teste concluída!', { id: 'analyzing' });
      toast.success('Resultado disponível no Dashboard e Comparação');

    } catch (error) {
      console.error('Erro na análise:', error);
      toast.error('Erro ao analisar cotações: ' + (error as Error).message, { id: 'analyzing' });
    } finally {
      setAnalyzing(false);
    }
  };

  const limparDadosTeste = () => {
    setTestChats([]);
    setSelectedMessages([]);
    setExtractedCotacoes([]);
    localStorage.removeItem('whatsapp_test_chats');
    localStorage.removeItem('whatsapp_test_cotacoes');
    toast.success('Dados de teste limpos!');
  };

  const carregarDadosSalvos = () => {
    try {
      const chatsStorage = localStorage.getItem('whatsapp_test_chats');
      const cotacoesStorage = localStorage.getItem('whatsapp_test_cotacoes');
      
      if (chatsStorage) {
        setTestChats(JSON.parse(chatsStorage));
      }
      
      if (cotacoesStorage) {
        setExtractedCotacoes(JSON.parse(cotacoesStorage));
      }
      
      toast.success('Dados de teste carregados!');
    } catch (error) {
      toast.error('Erro ao carregar dados salvos');
    }
  };

  // Carregar dados salvos ao inicializar
  React.useEffect(() => {
    carregarDadosSalvos();
  }, []);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TestTube className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Módulo de Teste WhatsApp
              </h2>
              <p className="text-gray-600">
                Gere conversas e mensagens simuladas para testar a extração de cotações com IA
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm text-gray-600">Conversas Geradas</p>
              <p className="text-2xl font-bold text-blue-600">{testChats.length}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Cotações Extraídas</p>
              <p className="text-2xl font-bold text-green-600">{extractedCotacoes.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controles Principais */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Controles de Teste</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={gerarConversasTeste}
            disabled={generating}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {generating ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Shuffle className="w-5 h-5" />
            )}
            <span>{generating ? 'Gerando...' : 'Gerar Conversas'}</span>
          </button>

          <button
            onClick={selecionarTodasCotacoes}
            disabled={testChats.length === 0}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Selecionar Cotações</span>
          </button>

          <button
            onClick={extrairCotacoesComIA}
            disabled={extracting || selectedMessages.length === 0}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {extracting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Bot className="w-5 h-5" />
            )}
            <span>{extracting ? 'Extraindo...' : 'Extrair com IA'}</span>
          </button>

          <button
            onClick={analisarTodasCotacoes}
            disabled={analyzing || extractedCotacoes.length === 0}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {analyzing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Zap className="w-5 h-5" />
            )}
            <span>{analyzing ? 'Analisando...' : 'Analisar Tudo'}</span>
          </button>
        </div>

        <div className="mt-4 flex items-center space-x-4">
          <button
            onClick={carregarDadosSalvos}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Carregar Salvos</span>
          </button>

          <button
            onClick={limparDadosTeste}
            className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Limpar Tudo</span>
          </button>

          <div className="text-sm text-gray-600">
            {selectedMessages.length} mensagem(ns) selecionada(s)
          </div>
        </div>
      </div>

      {/* Status da IA */}
      {!openAIService.isConfigured() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-yellow-600" />
            <p className="text-yellow-800">
              Configure o OpenAI na aba Configurações para habilitar a extração com IA
            </p>
          </div>
        </div>
      )}

      {/* Lista de Conversas de Teste */}
      {testChats.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Conversas de Teste ({testChats.length})
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {testChats.map((chat) => (
              <div key={chat.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{chat.name}</h4>
                      <p className="text-sm text-gray-600">
                        {chat.messages.length} mensagens • {chat.cotacoesCount} cotações
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Teste
                  </span>
                </div>
                
                <div className="space-y-2">
                  {chat.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedMessages.includes(message.id)
                          ? 'bg-blue-50 border-2 border-blue-300'
                          : message.hasCotacao
                          ? 'bg-green-50 border border-green-200 hover:bg-green-100'
                          : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => toggleMessageSelection(message.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {message.contact.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTime(message.timestamp)}
                            </span>
                            {message.hasCotacao && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                Cotação
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">
                            {message.body.length > 200 
                              ? message.body.substring(0, 200) + '...'
                              : message.body
                            }
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedMessages.includes(message.id)}
                          onChange={() => toggleMessageSelection(message.id)}
                          className="ml-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cotações Extraídas */}
      {extractedCotacoes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Cotações Extraídas ({extractedCotacoes.length})
            </h3>
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
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Teste
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(cotacao.produtos.reduce((sum: number, p: any) => sum + p.preco_total, 0))}
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
                    {cotacao.produtos.map((produto: any, index: number) => (
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
          </div>
        </div>
      )}

      {/* Instruções */}
      {testChats.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <TestTube className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-blue-900 mb-2">Como usar o Módulo de Teste</h3>
          <div className="text-blue-800 space-y-2 max-w-2xl mx-auto">
            <p><strong>1. Gerar Conversas:</strong> Clique em "Gerar Conversas" para criar mensagens simuladas de fornecedores</p>
            <p><strong>2. Selecionar Mensagens:</strong> Use "Selecionar Cotações" ou clique nas mensagens individualmente</p>
            <p><strong>3. Extrair com IA:</strong> Use "Extrair com IA" para processar as mensagens selecionadas</p>
            <p><strong>4. Analisar Tudo:</strong> Use "Analisar Tudo" para gerar uma análise completa no Dashboard</p>
          </div>
        </div>
      )}
    </div>
  );
};