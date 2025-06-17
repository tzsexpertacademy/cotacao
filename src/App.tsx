import React, { useState, useEffect } from 'react';
import { FileText, BarChart3, Upload as UploadIcon, Settings, Download, MessageSquare, Brain, ShoppingCart } from 'lucide-react';
import { SmartUploadArea } from './components/SmartUploadArea';
import { ComparacaoTable } from './components/ComparacaoTable';
import { Dashboard } from './components/Dashboard';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { WhatsAppIntegrated } from './components/WhatsAppIntegrated';
import { WhatsAppCotacoesManager } from './components/WhatsAppCotacoesManager';
import { ListaComprasManager } from './components/ListaComprasManager';
import { DocumentoUpload, AnaliseCompleta, FiltrosComparacao } from './types';
import { databaseService } from './services/database';
import { Toaster } from 'react-hot-toast';

type TabAtiva = 'dashboard' | 'upload' | 'comparacao' | 'whatsapp' | 'whatsapp-cotacoes' | 'lista-compras' | 'configuracoes';

function App() {
  const [tabAtiva, setTabAtiva] = useState<TabAtiva>('dashboard');
  const [analises, setAnalises] = useState<AnaliseCompleta[]>([]);
  const [filtros, setFiltros] = useState<FiltrosComparacao>({
    ordenar_por: 'preco',
    mostrar_apenas_completos: false,
    fornecedores_selecionados: []
  });

  // Carregar análises salvas
  useEffect(() => {
    const analisesCarregadas = databaseService.getAnalyses();
    if (analisesCarregadas.length > 0) {
      const analisesConvertidas = analisesCarregadas.map(a => ({
        id: a.id,
        nome_analise: a.nome,
        data_criacao: a.data_criacao,
        produtos: a.resultado_analise,
        total_fornecedores: calculateTotalSuppliers(a.resultado_analise),
        melhor_custo_beneficio: []
      }));
      setAnalises(analisesConvertidas);
    }
  }, []);

  const calculateTotalSuppliers = (result: any) => {
    try {
      // Se for string, converter para objeto
      const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
      
      // Verificar se temos produtos ou se é um objeto com produtos
      const produtos = parsedResult.produtos || parsedResult;
      
      // Extrair fornecedores únicos
      const fornecedores = new Set();
      if (Array.isArray(produtos)) {
        produtos.forEach((produto: any) => {
          if (produto.cotacoes) {
            produto.cotacoes.forEach((cotacao: any) => {
              fornecedores.add(cotacao.fornecedor);
            });
          }
        });
      }
      
      return fornecedores.size;
    } catch (error) {
      console.error('Erro ao calcular fornecedores:', error);
      return 0;
    }
  };

  const handleAnalysisComplete = (analysis: any) => {
    const novaAnalise: AnaliseCompleta = {
      id: analysis.id,
      nome_analise: analysis.nome,
      data_criacao: analysis.data_criacao,
      produtos: analysis.resultado_analise,
      total_fornecedores: calculateTotalSuppliers(analysis.resultado_analise),
      melhor_custo_beneficio: []
    };

    setAnalises(prev => {
      const filtered = prev.filter(a => a.id !== novaAnalise.id);
      return [...filtered, novaAnalise];
    });

    // Navegar para comparação se há produtos
    const produtos = typeof novaAnalise.produtos === 'string' 
      ? JSON.parse(novaAnalise.produtos) 
      : novaAnalise.produtos;
      
    if (produtos && (produtos.length > 0 || produtos.produtos?.length > 0)) {
      setTabAtiva('comparacao');
    }
  };

  const analiseAtual = analises[analises.length - 1];

  const tabs = [
    { id: 'dashboard' as TabAtiva, label: 'Dashboard', icon: BarChart3 },
    { id: 'upload' as TabAtiva, label: 'Upload Inteligente', icon: UploadIcon },
    { id: 'comparacao' as TabAtiva, label: 'Comparação', icon: FileText },
    { id: 'whatsapp' as TabAtiva, label: 'WhatsApp', icon: MessageSquare },
    { id: 'whatsapp-cotacoes' as TabAtiva, label: 'Cotações WhatsApp', icon: Brain },
    { id: 'lista-compras' as TabAtiva, label: 'Lista de Compras', icon: ShoppingCart },
    { id: 'configuracoes' as TabAtiva, label: 'Configurações', icon: Settings }
  ];

  const exportarRelatorio = () => {
    if (!analiseAtual) return;
    
    const dadosExport = {
      analise: analiseAtual,
      exportado_em: new Date().toISOString(),
      filtros_aplicados: filtros,
      todas_analises: analises
    };
    
    const blob = new Blob([JSON.stringify(dadosExport, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analise_cotacoes_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    AnáliseCorp AI
                  </h1>
                  <p className="text-sm text-gray-600">
                    Sistema Inteligente de Análise de Cotações
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={exportarRelatorio}
                disabled={!analiseAtual}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>Exportar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTabAtiva(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                    tabAtiva === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tabAtiva === 'dashboard' && (
          <Dashboard analises={analises} />
        )}

        {tabAtiva === 'upload' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Upload Inteligente de Documentos
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Envie os documentos de cotação dos seus fornecedores. 
                Nossa IA irá extrair automaticamente as informações e 
                gerar uma análise comparativa detalhada.
              </p>
            </div>
            
            <SmartUploadArea onAnalysisComplete={handleAnalysisComplete} />
          </div>
        )}

        {tabAtiva === 'comparacao' && analiseAtual && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Comparação Inteligente de Cotações
                </h2>
                <p className="text-gray-600">
                  Compare as ofertas dos fornecedores com análise de IA
                </p>
              </div>
            </div>

            <ComparacaoTable 
              produtos={analiseAtual.produtos}
              filtros={filtros}
              onFiltrosChange={setFiltros}
            />
          </div>
        )}

        {tabAtiva === 'whatsapp' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                WhatsApp Integrado
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Conecte seu WhatsApp diretamente na plataforma. Cada usuário tem sua instância exclusiva e isolada.
              </p>
            </div>
            
            <WhatsAppIntegrated />
          </div>
        )}

        {tabAtiva === 'whatsapp-cotacoes' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Extração de Cotações do WhatsApp
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Selecione conversas e mensagens para extrair cotações automaticamente com IA.
                Combine com documentos para análise completa.
              </p>
            </div>
            
            <WhatsAppCotacoesManager />
          </div>
        )}

        {tabAtiva === 'lista-compras' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Lista de Compras Inteligente
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Selecione as melhores oportunidades identificadas pela IA e gere uma lista organizada para solicitar aos fornecedores.
              </p>
            </div>
            
            <ListaComprasManager />
          </div>
        )}

        {tabAtiva === 'configuracoes' && (
          <ConfigurationPanel />
        )}
      </main>
    </div>
  );
}

export default App;