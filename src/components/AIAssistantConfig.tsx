import React, { useState, useEffect } from 'react';
import { Brain, Save, TestTube, RefreshCw, Settings, Zap, Target, AlertCircle, CheckCircle, Copy, Download, Upload } from 'lucide-react';
import { openAIService } from '../services/openai';
import toast from 'react-hot-toast';

interface AssistantPromptConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  analysisRules: {
    priceWeight: number;
    deliveryWeight: number;
    qualityWeight: number;
    paymentTermsWeight: number;
    customCriteria: string[];
  };
  outputFormat: {
    includeRecommendations: boolean;
    includeCostBenefit: boolean;
    includeRiskAnalysis: boolean;
    includeAlternatives: boolean;
    detailLevel: 'basic' | 'detailed' | 'comprehensive';
  };
  businessContext: {
    industry: string;
    companySize: string;
    budget: string;
    priorities: string[];
  };
  customInstructions: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_PROMPT_CONFIG: Omit<AssistantPromptConfig, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Configuração Padrão',
  description: 'Configuração padrão para análise de cotações corporativas',
  systemPrompt: `Você é um especialista em análise de cotações corporativas com foco em maximizar o valor para o negócio.

CONTEXTO DA EMPRESA:
- Setor: {industry}
- Porte: {companySize}
- Orçamento: {budget}
- Prioridades: {priorities}

CRITÉRIOS DE ANÁLISE (Pesos):
- Preço: {priceWeight}%
- Prazo de Entrega: {deliveryWeight}%
- Qualidade/Garantia: {qualityWeight}%
- Condições de Pagamento: {paymentTermsWeight}%

CRITÉRIOS PERSONALIZADOS:
{customCriteria}

INSTRUÇÕES ESPECÍFICAS:
{customInstructions}

FORMATO DE SAÍDA OBRIGATÓRIO:
Sempre retorne dados no formato JSON estruturado:
{
  "produtos": [
    {
      "id": "string_unico",
      "descricao": "string",
      "quantidade": number,
      "cotacoes": [
        {
          "fornecedor": "string",
          "preco_unitario": number,
          "preco_total": number,
          "prazo_entrega_dias": number,
          "condicao_pagamento": "string",
          "observacoes": "string",
          "dados_incompletos": boolean,
          "score_qualidade": number,
          "score_confiabilidade": number,
          "pontos_fortes": ["string"],
          "pontos_fracos": ["string"]
        }
      ],
      "recomendacao": {
        "fornecedor_recomendado": "string",
        "motivo": "string",
        "economia_potencial": number,
        "riscos": ["string"],
        "alternativas": ["string"]
      }
    }
  ],
  "resumo": {
    "total_produtos": number,
    "total_fornecedores": number,
    "economia_potencial": number,
    "economia_percentual": number,
    "recomendacoes_gerais": ["string"],
    "alertas": ["string"],
    "melhor_custo_beneficio": [
      {
        "produto_id": "string",
        "fornecedor": "string",
        "motivo": "string",
        "economia": number
      }
    ]
  },
  "analise_detalhada": {
    "pontos_atencao": ["string"],
    "oportunidades": ["string"],
    "riscos_identificados": ["string"],
    "sugestoes_negociacao": ["string"]
  }
}

REGRAS IMPORTANTES:
1. Sempre considere o contexto da empresa na análise
2. Aplique os pesos definidos para cada critério
3. Identifique dados incompletos e marque como tal
4. Forneça recomendações práticas e acionáveis
5. Considere aspectos qualitativos além do preço
6. Identifique oportunidades de negociação
7. Alerte sobre riscos potenciais`,
  analysisRules: {
    priceWeight: 40,
    deliveryWeight: 20,
    qualityWeight: 25,
    paymentTermsWeight: 15,
    customCriteria: []
  },
  outputFormat: {
    includeRecommendations: true,
    includeCostBenefit: true,
    includeRiskAnalysis: true,
    includeAlternatives: true,
    detailLevel: 'detailed'
  },
  businessContext: {
    industry: '',
    companySize: '',
    budget: '',
    priorities: []
  },
  customInstructions: '',
  isActive: true
};

export const AIAssistantConfig: React.FC = () => {
  const [config, setConfig] = useState<AssistantPromptConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'test' | 'templates'>('basic');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = () => {
    const stored = localStorage.getItem('ai_assistant_config');
    if (stored) {
      setConfig(JSON.parse(stored));
    } else {
      const newConfig: AssistantPromptConfig = {
        ...DEFAULT_PROMPT_CONFIG,
        id: `config_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setConfig(newConfig);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const updatedConfig = {
        ...config,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem('ai_assistant_config', JSON.stringify(updatedConfig));
      
      // Update OpenAI assistant with new prompt
      if (openAIService.isConfigured()) {
        const compiledPrompt = compilePrompt(updatedConfig);
        await openAIService.updateAssistantPrompt(compiledPrompt);
      }

      setConfig(updatedConfig);
      toast.success('Configuração salva com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configuração: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const compilePrompt = (cfg: AssistantPromptConfig): string => {
    let prompt = cfg.systemPrompt;
    
    // Replace placeholders
    prompt = prompt.replace('{industry}', cfg.businessContext.industry || 'Não especificado');
    prompt = prompt.replace('{companySize}', cfg.businessContext.companySize || 'Não especificado');
    prompt = prompt.replace('{budget}', cfg.businessContext.budget || 'Não especificado');
    prompt = prompt.replace('{priorities}', cfg.businessContext.priorities.join(', ') || 'Não especificado');
    prompt = prompt.replace('{priceWeight}', cfg.analysisRules.priceWeight.toString());
    prompt = prompt.replace('{deliveryWeight}', cfg.analysisRules.deliveryWeight.toString());
    prompt = prompt.replace('{qualityWeight}', cfg.analysisRules.qualityWeight.toString());
    prompt = prompt.replace('{paymentTermsWeight}', cfg.analysisRules.paymentTermsWeight.toString());
    prompt = prompt.replace('{customCriteria}', cfg.analysisRules.customCriteria.join('\n- ') || 'Nenhum critério personalizado');
    prompt = prompt.replace('{customInstructions}', cfg.customInstructions || 'Nenhuma instrução específica');

    return prompt;
  };

  const testConfiguration = async () => {
    if (!config || !openAIService.isConfigured()) {
      toast.error('Configure o OpenAI primeiro');
      return;
    }

    setTesting(true);
    try {
      const testDocument = `
COTAÇÃO TESTE - TechCorp Distribuidora
Data: ${new Date().toLocaleDateString()}

ITEM 1: Notebook Dell Inspiron 15
Quantidade: 10 unidades
Preço unitário: R$ 2.500,00
Preço total: R$ 25.000,00
Prazo de entrega: 7 dias úteis
Condições: 30 dias para pagamento
Observações: Garantia 12 meses, SSD 256GB

ITEM 2: Monitor LG 24" Full HD
Quantidade: 10 unidades
Preço unitário: R$ 450,00
Preço total: R$ 4.500,00
Prazo de entrega: 5 dias úteis
Condições: À vista com 5% desconto
Observações: IPS, HDMI + VGA
      `;

      const compiledPrompt = compilePrompt(config);
      const result = await openAIService.analyzeDocumentWithCustomPrompt(testDocument, 'teste.txt', compiledPrompt);
      
      setTestResult(result);
      toast.success('Teste realizado com sucesso!');
    } catch (error) {
      toast.error('Erro no teste: ' + (error as Error).message);
    } finally {
      setTesting(false);
    }
  };

  const exportConfig = () => {
    if (!config) return;
    
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-assistant-config-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setConfig({
          ...imported,
          id: `config_${Date.now()}`,
          updatedAt: new Date().toISOString()
        });
        toast.success('Configuração importada com sucesso!');
      } catch (error) {
        toast.error('Erro ao importar configuração');
      }
    };
    reader.readAsText(file);
  };

  const addCustomCriteria = () => {
    if (!config) return;
    setConfig({
      ...config,
      analysisRules: {
        ...config.analysisRules,
        customCriteria: [...config.analysisRules.customCriteria, '']
      }
    });
  };

  const updateCustomCriteria = (index: number, value: string) => {
    if (!config) return;
    const newCriteria = [...config.analysisRules.customCriteria];
    newCriteria[index] = value;
    setConfig({
      ...config,
      analysisRules: {
        ...config.analysisRules,
        customCriteria: newCriteria
      }
    });
  };

  const removeCustomCriteria = (index: number) => {
    if (!config) return;
    setConfig({
      ...config,
      analysisRules: {
        ...config.analysisRules,
        customCriteria: config.analysisRules.customCriteria.filter((_, i) => i !== index)
      }
    });
  };

  const addPriority = () => {
    if (!config) return;
    setConfig({
      ...config,
      businessContext: {
        ...config.businessContext,
        priorities: [...config.businessContext.priorities, '']
      }
    });
  };

  const updatePriority = (index: number, value: string) => {
    if (!config) return;
    const newPriorities = [...config.businessContext.priorities];
    newPriorities[index] = value;
    setConfig({
      ...config,
      businessContext: {
        ...config.businessContext,
        priorities: newPriorities
      }
    });
  };

  const removePriority = (index: number) => {
    if (!config) return;
    setConfig({
      ...config,
      businessContext: {
        ...config.businessContext,
        priorities: config.businessContext.priorities.filter((_, i) => i !== index)
      }
    });
  };

  if (!config) return null;

  const tabs = [
    { id: 'basic' as const, label: 'Configuração Básica', icon: Settings },
    { id: 'advanced' as const, label: 'Configuração Avançada', icon: Brain },
    { id: 'test' as const, label: 'Testar Configuração', icon: TestTube },
    { id: 'templates' as const, label: 'Templates', icon: Target }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Cérebro do Assistente IA
              </h2>
              <p className="text-gray-600">
                Configure como o assistente deve analisar suas cotações
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={exportConfig}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
            
            <label className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Importar</span>
              <input
                type="file"
                accept=".json"
                onChange={importConfig}
                className="hidden"
              />
            </label>
            
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'Salvando...' : 'Salvar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${config.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="font-medium text-gray-900">
              {config.name} - {config.isActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            Última atualização: {new Date(config.updatedAt).toLocaleString('pt-BR')}
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
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Basic Configuration */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Configuração
                  </label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => setConfig({ ...config, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={config.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setConfig({ ...config, isActive: e.target.value === 'active' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Business Context */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contexto da Empresa</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Setor/Indústria
                  </label>
                  <input
                    type="text"
                    value={config.businessContext.industry}
                    onChange={(e) => setConfig({
                      ...config,
                      businessContext: { ...config.businessContext, industry: e.target.value }
                    })}
                    placeholder="Ex: Tecnologia, Saúde, Educação"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Porte da Empresa
                  </label>
                  <select
                    value={config.businessContext.companySize}
                    onChange={(e) => setConfig({
                      ...config,
                      businessContext: { ...config.businessContext, companySize: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Selecione</option>
                    <option value="Microempresa">Microempresa (até 9 funcionários)</option>
                    <option value="Pequena">Pequena (10-49 funcionários)</option>
                    <option value="Média">Média (50-249 funcionários)</option>
                    <option value="Grande">Grande (250+ funcionários)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Faixa de Orçamento
                  </label>
                  <select
                    value={config.businessContext.budget}
                    onChange={(e) => setConfig({
                      ...config,
                      businessContext: { ...config.businessContext, budget: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Selecione</option>
                    <option value="Até R$ 10.000">Até R$ 10.000</option>
                    <option value="R$ 10.000 - R$ 50.000">R$ 10.000 - R$ 50.000</option>
                    <option value="R$ 50.000 - R$ 100.000">R$ 50.000 - R$ 100.000</option>
                    <option value="R$ 100.000 - R$ 500.000">R$ 100.000 - R$ 500.000</option>
                    <option value="Acima de R$ 500.000">Acima de R$ 500.000</option>
                  </select>
                </div>
              </div>

              {/* Priorities */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridades da Empresa
                </label>
                <div className="space-y-2">
                  {config.businessContext.priorities.map((priority, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={priority}
                        onChange={(e) => updatePriority(index, e.target.value)}
                        placeholder="Ex: Redução de custos, Qualidade, Sustentabilidade"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => removePriority(index)}
                        className="px-2 py-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addPriority}
                    className="text-purple-600 hover:text-purple-800 text-sm"
                  >
                    + Adicionar Prioridade
                  </button>
                </div>
              </div>
            </div>

            {/* Analysis Rules */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Critérios de Análise</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Peso do Preço ({config.analysisRules.priceWeight}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.analysisRules.priceWeight}
                    onChange={(e) => setConfig({
                      ...config,
                      analysisRules: { ...config.analysisRules, priceWeight: parseInt(e.target.value) }
                    })}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Peso do Prazo ({config.analysisRules.deliveryWeight}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.analysisRules.deliveryWeight}
                    onChange={(e) => setConfig({
                      ...config,
                      analysisRules: { ...config.analysisRules, deliveryWeight: parseInt(e.target.value) }
                    })}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Peso da Qualidade ({config.analysisRules.qualityWeight}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.analysisRules.qualityWeight}
                    onChange={(e) => setConfig({
                      ...config,
                      analysisRules: { ...config.analysisRules, qualityWeight: parseInt(e.target.value) }
                    })}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Peso do Pagamento ({config.analysisRules.paymentTermsWeight}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.analysisRules.paymentTermsWeight}
                    onChange={(e) => setConfig({
                      ...config,
                      analysisRules: { ...config.analysisRules, paymentTermsWeight: parseInt(e.target.value) }
                    })}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Total: {config.analysisRules.priceWeight + config.analysisRules.deliveryWeight + config.analysisRules.qualityWeight + config.analysisRules.paymentTermsWeight}%
                  {config.analysisRules.priceWeight + config.analysisRules.deliveryWeight + config.analysisRules.qualityWeight + config.analysisRules.paymentTermsWeight !== 100 && (
                    <span className="text-orange-600 ml-2">⚠️ Recomendado: 100%</span>
                  )}
                </p>
              </div>

              {/* Custom Criteria */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Critérios Personalizados
                </label>
                <div className="space-y-2">
                  {config.analysisRules.customCriteria.map((criteria, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={criteria}
                        onChange={(e) => updateCustomCriteria(index, e.target.value)}
                        placeholder="Ex: Certificações ISO, Localização geográfica"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => removeCustomCriteria(index)}
                        className="px-2 py-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addCustomCriteria}
                    className="text-purple-600 hover:text-purple-800 text-sm"
                  >
                    + Adicionar Critério
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Configuration */}
        {activeTab === 'advanced' && (
          <div className="space-y-6">
            {/* System Prompt */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Prompt do Sistema</h3>
              <p className="text-sm text-gray-600 mb-4">
                Configure as instruções detalhadas que o assistente seguirá. Use variáveis como {'{industry}'}, {'{priceWeight}'}, etc.
              </p>
              
              <textarea
                value={config.systemPrompt}
                onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                rows={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
              />
            </div>

            {/* Custom Instructions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Instruções Personalizadas</h3>
              <p className="text-sm text-gray-600 mb-4">
                Adicione instruções específicas para seu negócio ou setor.
              </p>
              
              <textarea
                value={config.customInstructions}
                onChange={(e) => setConfig({ ...config, customInstructions: e.target.value })}
                rows={6}
                placeholder="Ex: Sempre considerar fornecedores locais como prioridade, verificar certificações ambientais..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Output Format */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Formato de Saída</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Incluir na Análise</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={config.outputFormat.includeRecommendations}
                        onChange={(e) => setConfig({
                          ...config,
                          outputFormat: { ...config.outputFormat, includeRecommendations: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Recomendações</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={config.outputFormat.includeCostBenefit}
                        onChange={(e) => setConfig({
                          ...config,
                          outputFormat: { ...config.outputFormat, includeCostBenefit: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Análise Custo-Benefício</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={config.outputFormat.includeRiskAnalysis}
                        onChange={(e) => setConfig({
                          ...config,
                          outputFormat: { ...config.outputFormat, includeRiskAnalysis: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Análise de Riscos</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={config.outputFormat.includeAlternatives}
                        onChange={(e) => setConfig({
                          ...config,
                          outputFormat: { ...config.outputFormat, includeAlternatives: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Alternativas</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Nível de Detalhamento</h4>
                  <select
                    value={config.outputFormat.detailLevel}
                    onChange={(e) => setConfig({
                      ...config,
                      outputFormat: { ...config.outputFormat, detailLevel: e.target.value as any }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="basic">Básico</option>
                    <option value="detailed">Detalhado</option>
                    <option value="comprehensive">Abrangente</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Configuration */}
        {activeTab === 'test' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Testar Configuração</h3>
                <button
                  onClick={testConfiguration}
                  disabled={testing || !openAIService.isConfigured()}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {testing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  <span>{testing ? 'Testando...' : 'Executar Teste'}</span>
                </button>
              </div>

              {!openAIService.isConfigured() && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <p className="text-yellow-800">Configure o OpenAI primeiro na aba Configurações</p>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Prompt Compilado (Preview)</h4>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {compilePrompt(config)}
                </pre>
              </div>

              {testResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Resultado do Teste</h4>
                  <pre className="text-xs text-green-800 whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Templates */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Templates Pré-configurados</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Template cards would go here */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Foco em Preço</h4>
                  <p className="text-sm text-gray-600 mb-3">Prioriza o menor custo com qualidade mínima aceitável</p>
                  <button className="text-purple-600 hover:text-purple-800 text-sm">
                    Aplicar Template
                  </button>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Foco em Qualidade</h4>
                  <p className="text-sm text-gray-600 mb-3">Prioriza qualidade e confiabilidade sobre preço</p>
                  <button className="text-purple-600 hover:text-purple-800 text-sm">
                    Aplicar Template
                  </button>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Equilibrado</h4>
                  <p className="text-sm text-gray-600 mb-3">Balanceamento entre preço, qualidade e prazo</p>
                  <button className="text-purple-600 hover:text-purple-800 text-sm">
                    Aplicar Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};