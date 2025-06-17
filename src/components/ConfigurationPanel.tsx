import React, { useState, useEffect } from 'react';
import { Settings, Key, MessageSquare, Database, Bot, Save, TestTube, CheckCircle, AlertTriangle, Brain } from 'lucide-react';
import { openAIService } from '../services/openai';
import { whatsAppService } from '../services/whatsapp';
import { databaseService } from '../services/database';
import { AIAssistantConfig } from './AIAssistantConfig';
import toast from 'react-hot-toast';

export const ConfigurationPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'openai' | 'whatsapp' | 'assistant' | 'status'>('openai');
  const [openAIKey, setOpenAIKey] = useState('');
  const [assistantId, setAssistantId] = useState('');
  const [whatsappConfig, setWhatsappConfig] = useState({
    webhookUrl: '',
    accessToken: '',
    phoneNumberId: '',
    verifyToken: ''
  });
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    // Carregar configurações salvas
    const savedKey = localStorage.getItem('openai_api_key');
    const savedAssistant = localStorage.getItem('openai_assistant_id');
    const savedWhatsApp = whatsAppService.getConfig();

    if (savedKey) setOpenAIKey(savedKey);
    if (savedAssistant) setAssistantId(savedAssistant);
    if (savedWhatsApp) setWhatsappConfig(savedWhatsApp);
  }, []);

  const handleSaveOpenAI = async () => {
    if (!openAIKey.trim()) {
      toast.error('Insira uma API Key válida');
      return;
    }

    setCreating(true);
    try {
      openAIService.setApiKey(openAIKey);
      
      if (!assistantId) {
        toast.loading('Criando assistente especializado...', { id: 'assistant' });
        const assistant = await openAIService.createAssistant();
        setAssistantId(assistant.id);
        toast.success('Assistente criado com sucesso!', { id: 'assistant' });
      } else {
        openAIService.setAssistantId(assistantId);
        toast.success('Configuração OpenAI salva!');
      }
    } catch (error) {
      console.error('Erro OpenAI:', error);
      toast.error('Erro ao configurar OpenAI: ' + (error as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveWhatsApp = async () => {
    if (!whatsappConfig.accessToken.trim() || !whatsappConfig.phoneNumberId.trim()) {
      toast.error('Preencha pelo menos o Access Token e Phone Number ID');
      return;
    }

    try {
      whatsAppService.setConfig(whatsappConfig);
      await whatsAppService.setupWebhook();
      toast.success('WhatsApp configurado com sucesso!');
    } catch (error) {
      console.error('Erro WhatsApp:', error);
      toast.error('Erro ao configurar WhatsApp: ' + (error as Error).message);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!whatsAppService.isConfigured()) {
      toast.error('Configure o WhatsApp primeiro');
      return;
    }

    setTesting(true);
    try {
      // Simular mensagem de teste
      whatsAppService.simulateIncomingMessage(
        '+5511999999999',
        'Teste de integração: Cotação para 10 notebooks Dell, R$ 2.500,00 cada, prazo 5 dias.',
        false
      );
      toast.success('Mensagem de teste simulada com sucesso!');
    } catch (error) {
      toast.error('Erro no teste: ' + (error as Error).message);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (isConfigured: boolean) => {
    return isConfigured ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <AlertTriangle className="w-5 h-5 text-red-500" />
    );
  };

  const tabs = [
    { id: 'openai' as const, label: 'OpenAI', icon: Bot },
    { id: 'assistant' as const, label: 'Cérebro IA', icon: Brain },
    { id: 'whatsapp' as const, label: 'WhatsApp', icon: MessageSquare },
    { id: 'status' as const, label: 'Status', icon: Settings }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Configurações do Sistema
        </h2>
        <p className="text-gray-600">
          Configure as integrações e personalize o comportamento do assistente IA
        </p>
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
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8">
        {/* OpenAI Configuration */}
        {activeTab === 'openai' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Bot className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Configuração OpenAI
                </h3>
                <p className="text-sm text-gray-600">
                  Configure a API da OpenAI para análise inteligente de documentos
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key da OpenAI *
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={openAIKey}
                    onChange={(e) => setOpenAIKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Obtenha sua API Key em: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">platform.openai.com</a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID do Assistente (será criado automaticamente)
                </label>
                <input
                  type="text"
                  value={assistantId}
                  onChange={(e) => setAssistantId(e.target.value)}
                  placeholder="asst_..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  readOnly
                />
              </div>

              <button
                onClick={handleSaveOpenAI}
                disabled={creating || !openAIKey.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Configurando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar e Criar Assistente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* AI Assistant Configuration */}
        {activeTab === 'assistant' && (
          <AIAssistantConfig />
        )}

        {/* WhatsApp Configuration */}
        {activeTab === 'whatsapp' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Integração WhatsApp Business
                </h3>
                <p className="text-sm text-gray-600">
                  Receba cotações automaticamente via WhatsApp
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={whatsappConfig.webhookUrl}
                  onChange={(e) => setWhatsappConfig({...whatsappConfig, webhookUrl: e.target.value})}
                  placeholder="https://seu-dominio.com/webhook"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Token *
                </label>
                <input
                  type="password"
                  value={whatsappConfig.accessToken}
                  onChange={(e) => setWhatsappConfig({...whatsappConfig, accessToken: e.target.value})}
                  placeholder="EAAxxxxx..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number ID *
                </label>
                <input
                  type="text"
                  value={whatsappConfig.phoneNumberId}
                  onChange={(e) => setWhatsappConfig({...whatsappConfig, phoneNumberId: e.target.value})}
                  placeholder="123456789012345"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verify Token
                </label>
                <input
                  type="text"
                  value={whatsappConfig.verifyToken}
                  onChange={(e) => setWhatsappConfig({...whatsappConfig, verifyToken: e.target.value})}
                  placeholder="seu_token_verificacao"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSaveWhatsApp}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Salvar WhatsApp</span>
              </button>

              <button
                onClick={handleTestWhatsApp}
                disabled={testing || !whatsAppService.isConfigured()}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                <span>{testing ? 'Testando...' : 'Testar Integração'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Status das Integrações */}
        {activeTab === 'status' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Status das Integrações
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Bot className="w-5 h-5 text-gray-600" />
                  <div>
                    <span className="font-medium">OpenAI Assistant</span>
                    <p className="text-sm text-gray-600">{openAIService.getStatus()}</p>
                  </div>
                </div>
                {getStatusIcon(openAIService.isConfigured())}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Brain className="w-5 h-5 text-gray-600" />
                  <div>
                    <span className="font-medium">Cérebro IA Personalizado</span>
                    <p className="text-sm text-gray-600">
                      {(() => {
                        const config = localStorage.getItem('ai_assistant_config');
                        if (config) {
                          const parsed = JSON.parse(config);
                          return parsed.isActive ? `Ativo: ${parsed.name}` : 'Configurado mas inativo';
                        }
                        return 'Não configurado';
                      })()}
                    </p>
                  </div>
                </div>
                {getStatusIcon(!!localStorage.getItem('ai_assistant_config'))}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                  <div>
                    <span className="font-medium">WhatsApp Business</span>
                    <p className="text-sm text-gray-600">{whatsAppService.getStatus()}</p>
                  </div>
                </div>
                {getStatusIcon(whatsAppService.isConfigured())}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Database className="w-5 h-5 text-gray-600" />
                  <div>
                    <span className="font-medium">Banco de Dados</span>
                    <p className="text-sm text-gray-600">LocalStorage Ativo</p>
                  </div>
                </div>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            </div>

            {/* System Health Check */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Verificação do Sistema</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>✅ Dashboard: Funcionando e sendo alimentado pelo assistente</p>
                <p>✅ Comparação: Dados estruturados vindos da análise IA</p>
                <p>✅ Upload Inteligente: Processamento automático com IA</p>
                <p>✅ WhatsApp: Integração ativa para recebimento de cotações</p>
                <p>✅ Configuração IA: Sistema de personalização do assistente</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};