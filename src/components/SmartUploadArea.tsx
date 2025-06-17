import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader, Bot } from 'lucide-react';
import { DocumentoUpload } from '../types';
import { documentProcessor } from '../services/documentProcessor';
import { openAIService } from '../services/openai';
import { databaseService } from '../services/database';
import toast from 'react-hot-toast';

interface SmartUploadAreaProps {
  onAnalysisComplete: (analysis: any) => void;
}

export const SmartUploadArea: React.FC<SmartUploadAreaProps> = ({ onAnalysisComplete }) => {
  const [dragActive, setDragActive] = useState(false);
  const [documentos, setDocumentos] = useState<DocumentoUpload[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processarArquivos(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processarArquivos(Array.from(e.target.files));
    }
  }, []);

  const processarArquivos = async (arquivos: File[]) => {
    if (!openAIService.isConfigured()) {
      toast.error('Configure a OpenAI primeiro na aba Configurações');
      return;
    }

    const novosDocumentos: DocumentoUpload[] = arquivos.map((arquivo, index) => ({
      id: `doc_${Date.now()}_${index}`,
      nome: arquivo.name,
      tipo: arquivo.type,
      tamanho: arquivo.size,
      status: 'pendente',
      progresso: 0
    }));

    setDocumentos(prev => [...prev, ...novosDocumentos]);

    // Processar cada arquivo
    for (const doc of novosDocumentos) {
      const arquivo = arquivos.find(a => a.name === doc.nome);
      if (!arquivo) continue;

      try {
        // Atualizar status para processando
        setDocumentos(prev => prev.map(d => 
          d.id === doc.id ? { ...d, status: 'processando', progresso: 25 } : d
        ));

        // Extrair conteúdo do documento
        const conteudo = await documentProcessor.processFile(arquivo);
        
        setDocumentos(prev => prev.map(d => 
          d.id === doc.id ? { ...d, progresso: 50 } : d
        ));

        // Verificar se há configuração personalizada do assistente
        const customConfig = localStorage.getItem('ai_assistant_config');
        let resultadoAnalise;

        if (customConfig) {
          const config = JSON.parse(customConfig);
          if (config.isActive) {
            // Usar prompt personalizado
            const compiledPrompt = compilePrompt(config);
            resultadoAnalise = await openAIService.analyzeDocumentWithCustomPrompt(conteudo, arquivo.name, compiledPrompt);
          } else {
            // Usar análise padrão
            resultadoAnalise = await openAIService.analyzeDocument(conteudo, arquivo.name);
          }
        } else {
          // Usar análise padrão
          resultadoAnalise = await openAIService.analyzeDocument(conteudo, arquivo.name);
        }
        
        setDocumentos(prev => prev.map(d => 
          d.id === doc.id ? { ...d, progresso: 75 } : d
        ));

        // Salvar no banco de dados
        const analise = {
          id: `analise_${Date.now()}`,
          nome: `Análise IA - ${arquivo.name}`,
          data_criacao: new Date().toISOString(),
          documentos: [arquivo.name],
          resultado_analise: resultadoAnalise,
          status: 'concluida' as const
        };

        await databaseService.saveAnalysis(analise);

        setDocumentos(prev => prev.map(d => 
          d.id === doc.id ? { ...d, status: 'concluido', progresso: 100 } : d
        ));

        // Notificar conclusão
        onAnalysisComplete(analise);
        toast.success(`Análise IA de ${arquivo.name} concluída!`);

      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        setDocumentos(prev => prev.map(d => 
          d.id === doc.id ? { ...d, status: 'erro', progresso: 0 } : d
        ));
        toast.error(`Erro ao processar ${arquivo.name}: ${error}`);
      }
    }
  };

  const compilePrompt = (config: any): string => {
    let prompt = config.systemPrompt;
    
    // Replace placeholders
    prompt = prompt.replace('{industry}', config.businessContext?.industry || 'Não especificado');
    prompt = prompt.replace('{companySize}', config.businessContext?.companySize || 'Não especificado');
    prompt = prompt.replace('{budget}', config.businessContext?.budget || 'Não especificado');
    prompt = prompt.replace('{priorities}', config.businessContext?.priorities?.join(', ') || 'Não especificado');
    prompt = prompt.replace('{priceWeight}', config.analysisRules?.priceWeight?.toString() || '40');
    prompt = prompt.replace('{deliveryWeight}', config.analysisRules?.deliveryWeight?.toString() || '20');
    prompt = prompt.replace('{qualityWeight}', config.analysisRules?.qualityWeight?.toString() || '25');
    prompt = prompt.replace('{paymentTermsWeight}', config.analysisRules?.paymentTermsWeight?.toString() || '15');
    prompt = prompt.replace('{customCriteria}', config.analysisRules?.customCriteria?.join('\n- ') || 'Nenhum critério personalizado');
    prompt = prompt.replace('{customInstructions}', config.customInstructions || 'Nenhuma instrução específica');

    return prompt;
  };

  const analisarTodos = async () => {
    const documentosConcluidos = documentos.filter(d => d.status === 'concluido');
    if (documentosConcluidos.length === 0) {
      toast.error('Nenhum documento processado para análise');
      return;
    }

    setAnalyzing(true);
    try {
      // Buscar todas as análises dos documentos
      const analises = await Promise.all(
        documentosConcluidos.map(async (doc) => {
          const stored = databaseService.getAnalyses();
          return stored.find(a => a.documentos.includes(doc.nome));
        })
      );

      const analisesValidas = analises.filter(Boolean);
      
      if (analisesValidas.length > 0) {
        // Comparar todas as cotações
        const todasCotacoes = analisesValidas.map(a => a?.resultado_analise).filter(Boolean);
        const comparacao = await openAIService.compareQuotes(todasCotacoes);
        
        // Salvar análise comparativa
        const analiseComparativa = {
          id: `comparacao_${Date.now()}`,
          nome: 'Análise Comparativa IA Completa',
          data_criacao: new Date().toISOString(),
          documentos: documentosConcluidos.map(d => d.nome),
          resultado_analise: comparacao,
          status: 'concluida' as const
        };

        await databaseService.saveAnalysis(analiseComparativa);
        onAnalysisComplete(analiseComparativa);
        toast.success('Análise comparativa IA concluída!');
      }
    } catch (error) {
      toast.error('Erro na análise comparativa: ' + error);
    } finally {
      setAnalyzing(false);
    }
  };

  const removerDocumento = (docId: string) => {
    setDocumentos(docs => docs.filter(doc => doc.id !== docId));
  };

  const getStatusIcon = (status: DocumentoUpload['status']) => {
    switch (status) {
      case 'concluido':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'erro':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'processando':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatarTamanho = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Check if custom AI config is active
  const customConfig = localStorage.getItem('ai_assistant_config');
  const hasCustomConfig = customConfig ? JSON.parse(customConfig).isActive : false;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Status da Configuração */}
      {!openAIService.isConfigured() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <p className="text-yellow-800">
              Configure a OpenAI na aba <strong>Configurações</strong> para habilitar a análise inteligente
            </p>
          </div>
        </div>
      )}

      {/* AI Configuration Status */}
      {openAIService.isConfigured() && (
        <div className={`border rounded-lg p-4 ${hasCustomConfig ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center space-x-2">
            <Bot className={`w-5 h-5 ${hasCustomConfig ? 'text-purple-600' : 'text-blue-600'}`} />
            <p className={hasCustomConfig ? 'text-purple-800' : 'text-blue-800'}>
              {hasCustomConfig ? (
                <>
                  <strong>Assistente IA Personalizado Ativo:</strong> {JSON.parse(customConfig).name}
                  <br />
                  <span className="text-sm">Análises serão feitas com suas configurações personalizadas</span>
                </>
              ) : (
                <>
                  <strong>Assistente IA Padrão Ativo</strong>
                  <br />
                  <span className="text-sm">Configure o "Cérebro IA" para personalizar as análises</span>
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Área de Upload */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${!openAIService.isConfigured() ? 'opacity-50' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={handleChange}
          disabled={!openAIService.isConfigured()}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-blue-100 rounded-full">
            <Upload className="w-8 h-8 text-blue-600" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Upload Inteligente de Cotações
            </h3>
            <p className="text-gray-600 mb-4">
              Arraste e solte os arquivos aqui ou clique para selecionar
            </p>
            <p className="text-sm text-gray-500">
              Suporte para PDF, Word, Excel e arquivos de texto
            </p>
            <div className="flex items-center justify-center space-x-2 mt-2 text-xs text-blue-600">
              <Bot className="w-4 h-4" />
              <span>Análise automática com IA {hasCustomConfig ? 'personalizada' : 'padrão'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Documentos */}
      {documentos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-gray-900">
              Documentos ({documentos.length})
            </h4>
            
            {documentos.some(d => d.status === 'concluido') && (
              <button
                onClick={analisarTodos}
                disabled={analyzing}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {analyzing ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
                <span>{analyzing ? 'Analisando...' : 'Análise Comparativa IA'}</span>
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            {documentos.map((doc) => (
              <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    {getStatusIcon(doc.status)}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.nome}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatarTamanho(doc.tamanho)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {doc.status === 'processando' && (
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${doc.progresso}%` }}
                        />
                      </div>
                    )}
                    
                    <button
                      onClick={() => removerDocumento(doc.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};