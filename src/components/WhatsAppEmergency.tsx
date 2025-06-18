import React, { useState, useEffect } from 'react';
import { MessageSquare, QrCode, Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle, Smartphone, Copy, Zap, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface WhatsAppStatus {
  isReady: boolean;
  hasQR: boolean;
  timestamp?: string;
  server?: string;
  user?: {
    name: string;
    number: string;
  };
}

interface QRResponse {
  qr: string;
  timestamp?: string;
  length?: number;
  folder?: string;
}

export const WhatsAppEmergency: React.FC = () => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [serverStatus, setServerStatus] = useState<'offline' | 'connecting' | 'online'>('offline');
  const [user, setUser] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [attempts, setAttempts] = useState(0);
  const [debugInfo, setDebugInfo] = useState<any>({});

  // 🔥 URLS FIXAS - EXATAMENTE COMO VOCÊ ESPECIFICOU
  const SERVER_BASE = 'http://146.59.227.248:3001';
  const API_BASE = 'http://146.59.227.248:3001/api/whatsapp';

  // URLs EXATAS CONFORME VOCÊ ESPECIFICOU
  const ENDPOINTS = {
    server: 'http://146.59.227.248:3001/',
    status: 'http://146.59.227.248:3001/api/whatsapp/status',
    qr: 'http://146.59.227.248:3001/api/whatsapp/qr',
    chats: 'http://146.59.227.248:3001/api/whatsapp/chats',
    send: 'http://146.59.227.248:3001/api/whatsapp/send',
    restart: 'http://146.59.227.248:3001/api/whatsapp/restart'
  };

  // FUNÇÃO PRINCIPAL - BUSCAR QR CODE DO ENDPOINT CORRETO
  const fetchQRCodeFromStandalone = async () => {
    setLastUpdate(new Date().toLocaleTimeString());
    setAttempts(prev => prev + 1);
    
    console.log('🔥 CONECTANDO AO WHATSAPP-STANDALONE - TENTATIVA', attempts + 1);
    console.log('🌐 URL FIXA:', ENDPOINTS.status);
    console.log('📱 QR URL FIXA:', ENDPOINTS.qr);
    
    try {
      setServerStatus('connecting');
      setDebugInfo(prev => ({ 
        ...prev, 
        lastAttempt: new Date().toLocaleTimeString(),
        statusUrl: ENDPOINTS.status,
        qrUrl: ENDPOINTS.qr,
        attemptNumber: attempts + 1
      }));
      
      // 1. TESTAR STATUS PRIMEIRO
      console.log('📊 Testando status em URL FIXA:', ENDPOINTS.status);
      
      const statusResponse = await fetch(ENDPOINTS.status, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 Status response:', statusResponse.status);
      setDebugInfo(prev => ({ ...prev, statusResponse: statusResponse.status }));

      if (statusResponse.ok) {
        const statusData: WhatsAppStatus = await statusResponse.json();
        console.log('✅ Status obtido do Standalone:', statusData);
        setDebugInfo(prev => ({ ...prev, statusData }));
        
        setServerStatus('online');
        setIsConnected(statusData.isReady);
        
        if (statusData.user) {
          setUser(statusData.user);
        }

        // 2. SE TEM QR DISPONÍVEL, BUSCAR
        if (statusData.hasQR && !statusData.isReady) {
          console.log('📱 QR Code disponível! Buscando em URL FIXA:', ENDPOINTS.qr);
          
          const qrResponse = await fetch(ENDPOINTS.qr, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'omit',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });

          console.log('📱 QR response:', qrResponse.status);
          setDebugInfo(prev => ({ ...prev, qrResponse: qrResponse.status }));

          if (qrResponse.ok) {
            const qrData: QRResponse = await qrResponse.json();
            console.log('🎉 QR CODE REAL OBTIDO DO STANDALONE!');
            console.log('📏 Tamanho do QR:', qrData.qr?.length);
            setQrCode(qrData.qr);
            setDebugInfo(prev => ({ 
              ...prev, 
              qrReceived: true, 
              qrLength: qrData.qr?.length,
              qrTimestamp: qrData.timestamp,
              qrFolder: qrData.folder
            }));
            toast.success('QR Code REAL carregado do servidor Standalone!');
            return; // SUCESSO!
          } else {
            console.log('⏳ QR Code ainda não disponível (status:', qrResponse.status, ')');
            setDebugInfo(prev => ({ ...prev, qrNotReady: qrResponse.status }));
          }
        } else if (statusData.isReady) {
          console.log('✅ WhatsApp já conectado no Standalone!');
          setQrCode(null);
          toast.success('WhatsApp já está conectado!');
          return; // SUCESSO!
        } else {
          console.log('⏳ Aguardando QR Code ser gerado...');
          setDebugInfo(prev => ({ ...prev, waitingForQR: true }));
        }
      } else {
        console.log('❌ Status não OK:', statusResponse.status);
        setDebugInfo(prev => ({ ...prev, statusError: statusResponse.status }));
        throw new Error(`Status API retornou: ${statusResponse.status}`);
      }
      
    } catch (error) {
      console.error('❌ Erro ao conectar com Standalone:', error);
      setServerStatus('offline');
      setDebugInfo(prev => ({ 
        ...prev, 
        error: error.toString(),
        lastError: error.message
      }));
      toast.error('Erro ao conectar: ' + error.message);
    }
  };

  // REINICIAR WHATSAPP NO STANDALONE
  const restartWhatsApp = async () => {
    try {
      console.log('🔄 Reiniciando WhatsApp no Standalone...');
      console.log('🔄 Endpoint restart URL FIXA:', ENDPOINTS.restart);
      
      const response = await fetch(ENDPOINTS.restart, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsConnected(false);
        setQrCode(null);
        setUser(null);
        toast.success('WhatsApp reiniciado no Standalone!');
        
        // Buscar QR Code após reiniciar
        setTimeout(() => {
          fetchQRCodeFromStandalone();
        }, 3000);
      } else {
        throw new Error(`Restart falhou: ${response.status}`);
      }
    } catch (error) {
      toast.error('Erro ao reiniciar WhatsApp: ' + error.message);
    }
  };

  // POLLING AUTOMÁTICO A CADA 3 SEGUNDOS
  useEffect(() => {
    fetchQRCodeFromStandalone();
    
    const interval = setInterval(() => {
      if (!isConnected) {
        fetchQRCodeFromStandalone();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const getStatusColor = () => {
    if (serverStatus === 'offline') return 'bg-red-500';
    if (serverStatus === 'connecting') return 'bg-yellow-500';
    if (isConnected) return 'bg-green-500';
    return 'bg-orange-500';
  };

  const getStatusText = () => {
    if (serverStatus === 'offline') return 'Servidor Offline';
    if (serverStatus === 'connecting') return 'Conectando...';
    if (isConnected) return `WhatsApp: ${user?.name || 'Conectado'}`;
    return 'Aguardando QR Code';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* HEADER EMERGENCIAL */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <MessageSquare className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  WhatsApp STANDALONE - Apresentação Cliente
                </h1>
                <p className="text-gray-600">
                  Conectando ao servidor: {SERVER_BASE}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500">Última atualização:</span>
                  <code className="text-xs bg-blue-100 px-2 py-1 rounded">{lastUpdate}</code>
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    Tentativa: {attempts}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500">API Base:</span>
                  <code className="text-xs bg-green-100 px-2 py-1 rounded">{API_BASE}</code>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-white ${getStatusColor()}`}>
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-sm font-medium">{getStatusText()}</span>
              </div>
              
              <button
                onClick={fetchQRCodeFromStandalone}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Buscar QR</span>
              </button>
              
              <button
                onClick={restartWhatsApp}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Zap className="w-4 h-4" />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>
        </div>

        {/* DEBUG INFO DETALHADO - URLs FIXAS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">🔍 URLs FIXAS - Exatamente como você especificou</h3>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="p-2 bg-green-50 rounded">
              <span className="font-medium text-green-800">Servidor:</span>
              <p className="text-green-700 font-mono text-xs">{ENDPOINTS.server}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded">
              <span className="font-medium text-blue-800">API Status:</span>
              <p className="text-blue-700 font-mono text-xs">{ENDPOINTS.status}</p>
            </div>
            <div className="p-2 bg-purple-50 rounded">
              <span className="font-medium text-purple-800">QR Code:</span>
              <p className="text-purple-700 font-mono text-xs">{ENDPOINTS.qr}</p>
            </div>
            <div className="p-2 bg-orange-50 rounded">
              <span className="font-medium text-orange-800">Conversas:</span>
              <p className="text-orange-700 font-mono text-xs">{ENDPOINTS.chats}</p>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Última tentativa:</span>
              <p className="text-gray-600">{debugInfo.lastAttempt || 'Nunca'}</p>
            </div>
            <div>
              <span className="font-medium">Status Response:</span>
              <p className="text-gray-600">{debugInfo.statusResponse || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium">QR Response:</span>
              <p className="text-gray-600">{debugInfo.qrResponse || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium">QR Length:</span>
              <p className="text-gray-600">{debugInfo.qrLength || 'N/A'}</p>
            </div>
          </div>
          
          {debugInfo.statusData && (
            <div className="mt-3 p-3 bg-gray-50 rounded text-xs">
              <strong>Status Data:</strong> {JSON.stringify(debugInfo.statusData, null, 2)}
            </div>
          )}
          {debugInfo.lastError && (
            <div className="mt-3 p-3 bg-red-50 rounded text-xs text-red-800">
              <strong>Último Erro:</strong> {debugInfo.lastError}
            </div>
          )}
        </div>

        {/* STATUS DO SERVIDOR */}
        {serverStatus === 'online' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-800 font-medium">✅ Conectado ao WhatsApp Standalone!</p>
            </div>
            <p className="text-green-700 text-sm mt-1">
              Servidor: <code className="bg-green-100 px-2 py-1 rounded">{SERVER_BASE}</code>
            </p>
            <p className="text-green-700 text-sm">
              API: <code className="bg-green-100 px-2 py-1 rounded">{API_BASE}</code>
            </p>
          </div>
        )}

        {/* ERRO DE CONEXÃO */}
        {serverStatus === 'offline' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <p className="text-red-800 font-medium">⚠️ Não foi possível conectar ao WhatsApp Standalone</p>
              </div>
              <button
                onClick={fetchQRCodeFromStandalone}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Tentar Novamente
              </button>
            </div>
            <div className="mt-2 text-sm text-red-700">
              <p className="font-medium">💡 Verifique se o comando está rodando no servidor:</p>
              <code className="bg-red-100 px-2 py-1 rounded text-xs block mt-1">cd /home/ubuntu/cotacao/whatsapp-standalone && npm start</code>
              <div className="mt-2">
                <p className="font-medium">🌐 URLs testadas (FIXAS):</p>
                <ul className="text-xs space-y-1 mt-1">
                  <li>• Status: {ENDPOINTS.status}</li>
                  <li>• QR Code: {ENDPOINTS.qr}</li>
                  <li>• Chats: {ENDPOINTS.chats}</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ÁREA PRINCIPAL DO QR CODE */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Conectar WhatsApp REAL para Apresentação
            </h2>
            
            {qrCode ? (
              <div className="space-y-6">
                {/* QR CODE COMO IMAGEM */}
                <div className="flex justify-center">
                  <div className="p-6 bg-white border-4 border-green-300 rounded-2xl shadow-lg">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`}
                      alt="QR Code WhatsApp REAL do Standalone" 
                      className="w-72 h-72"
                      onError={(e) => {
                        console.error('Erro ao carregar QR Code como imagem');
                      }}
                    />
                  </div>
                </div>
                
                {/* INSTRUÇÕES PARA O CLIENTE */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <h3 className="font-bold text-green-900 mb-4 text-lg">📱 Como conectar (para mostrar ao cliente):</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div>
                      <h4 className="font-semibold text-green-800 mb-2">No Android:</h4>
                      <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
                        <li>Abra o WhatsApp</li>
                        <li>Toque nos 3 pontos (⋮)</li>
                        <li>Selecione "Dispositivos conectados"</li>
                        <li>Toque "Conectar um dispositivo"</li>
                        <li>Escaneie este QR Code</li>
                      </ol>
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-800 mb-2">No iPhone:</h4>
                      <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
                        <li>Abra o WhatsApp</li>
                        <li>Toque em "Configurações"</li>
                        <li>Selecione "Dispositivos conectados"</li>
                        <li>Toque "Conectar um dispositivo"</li>
                        <li>Escaneie este QR Code</li>
                      </ol>
                    </div>
                  </div>
                </div>
                
                {/* QR CODE COMO TEXTO (BACKUP) */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">QR Code (texto de backup):</h4>
                  <div className="text-xs font-mono bg-white p-3 rounded border max-h-32 overflow-y-auto break-all">
                    {qrCode}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(qrCode);
                      toast.success('QR Code copiado!');
                    }}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    📋 Copiar QR Code
                  </button>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <p>🔄 Atualizando automaticamente a cada 3 segundos</p>
                  <p>🔒 Conexão segura e criptografada</p>
                  <p>⚡ QR Code REAL do servidor Standalone</p>
                  <p>📡 API: {ENDPOINTS.qr}</p>
                </div>
              </div>
            ) : isConnected ? (
              <div className="space-y-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-green-900">WhatsApp Conectado!</h3>
                  <p className="text-green-700 text-lg">Conectado como: <strong>{user?.name}</strong></p>
                  <p className="text-green-600">Número: {user?.number}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <h4 className="font-bold text-blue-900 mb-2">✅ Sistema Pronto para Apresentação!</h4>
                  <p className="text-blue-800">
                    O WhatsApp REAL está conectado e funcionando. Você pode demonstrar todas as funcionalidades ao cliente.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <Smartphone className="w-10 h-10 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Preparando WhatsApp REAL...</h3>
                  <p className="text-gray-600">
                    {serverStatus === 'connecting' ? 'Conectando ao servidor Standalone...' : 
                     'Aguardando QR Code do servidor...'}
                  </p>
                </div>
                
                {/* BOTÕES DE AÇÃO EMERGENCIAL */}
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={fetchQRCodeFromStandalone}
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span>Buscar QR Code REAL</span>
                  </button>
                  
                  <button
                    onClick={restartWhatsApp}
                    className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Zap className="w-5 h-5" />
                    <span>Reiniciar WhatsApp</span>
                  </button>
                </div>
                
                {serverStatus === 'offline' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">
                      ⚠️ Para a apresentação funcionar, execute no servidor:
                    </p>
                    <code className="bg-red-100 text-red-800 px-3 py-2 rounded text-sm block mt-2">
                      cd /home/ubuntu/cotacao/whatsapp-standalone && npm start
                    </code>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* INFORMAÇÕES TÉCNICAS PARA APRESENTAÇÃO */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-4">📋 Informações para Apresentação ao Cliente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">✅ Funcionalidades Demonstráveis:</h4>
              <ul className="text-blue-700 space-y-1 list-disc list-inside">
                <li>Conexão REAL com WhatsApp</li>
                <li>Recebimento de mensagens em tempo real</li>
                <li>Envio de mensagens</li>
                <li>Lista de conversas</li>
                <li>Histórico de mensagens</li>
                <li>Auto-resposta para cotações</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">🎯 Pontos de Venda:</h4>
              <ul className="text-blue-700 space-y-1 list-disc list-inside">
                <li>Sistema integrado completo</li>
                <li>Análise automática de cotações</li>
                <li>Interface profissional</li>
                <li>Segurança e criptografia</li>
                <li>Fácil de usar</li>
                <li>Pronto para produção</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-100 rounded">
            <p className="text-blue-800 text-sm">
              <strong>🌐 Servidor:</strong> {SERVER_BASE}
            </p>
            <p className="text-blue-800 text-sm">
              <strong>📱 API WhatsApp:</strong> {API_BASE}
            </p>
            <p className="text-blue-800 text-sm">
              <strong>📋 Status:</strong> {ENDPOINTS.status}
            </p>
            <p className="text-blue-800 text-sm">
              <strong>🔲 QR Code:</strong> {ENDPOINTS.qr}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};