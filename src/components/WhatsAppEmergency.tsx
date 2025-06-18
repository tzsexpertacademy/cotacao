import React, { useState, useEffect } from 'react';
import { MessageSquare, QrCode, Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle, Smartphone, Copy, Zap, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface WhatsAppStatus {
  isReady: boolean;
  hasQR: boolean;
  user?: {
    name: string;
    number: string;
  };
}

interface QRResponse {
  qr: string;
}

export const WhatsAppEmergency: React.FC = () => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [serverStatus, setServerStatus] = useState<'offline' | 'connecting' | 'online'>('offline');
  const [user, setUser] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [attempts, setAttempts] = useState(0);
  const [workingServer, setWorkingServer] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});

  // 🔥 MÚLTIPLOS SERVIDORES PARA TESTAR
  const POSSIBLE_SERVERS = [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://146.59.227.248:3001',
    `http://${window.location.hostname}:3001`
  ];

  // FUNÇÃO PRINCIPAL - BUSCAR QR CODE COM FALLBACK
  const fetchQRCodeFromStandalone = async () => {
    setLastUpdate(new Date().toLocaleTimeString());
    setAttempts(prev => prev + 1);
    
    console.log('🔥 CONECTANDO AO WHATSAPP-STANDALONE - TENTATIVA', attempts + 1);
    
    // Se já temos um servidor funcionando, usar ele primeiro
    const serversToTry = workingServer 
      ? [workingServer, ...POSSIBLE_SERVERS.filter(s => s !== workingServer)]
      : POSSIBLE_SERVERS;
    
    for (const serverUrl of serversToTry) {
      try {
        console.log('🌐 Testando servidor:', serverUrl);
        setServerStatus('connecting');
        setDebugInfo(prev => ({ 
          ...prev, 
          lastAttempt: new Date().toLocaleTimeString(),
          currentServer: serverUrl,
          attemptNumber: attempts + 1
        }));
        
        // 1. TESTAR CONECTIVIDADE BÁSICA PRIMEIRO
        console.log('🌐 Testando conectividade básica...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const basicTest = await fetch(serverUrl, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache',
          credentials: 'omit',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (compatible; WhatsApp-Frontend/1.0)'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('🌐 Conectividade básica:', basicTest.status, 'para', serverUrl);
        setDebugInfo(prev => ({ 
          ...prev, 
          basicConnectivity: basicTest.status,
          workingServer: serverUrl
        }));

        if (basicTest.ok) {
          console.log('✅ Servidor respondendo:', serverUrl);
          setServerStatus('online');
          setWorkingServer(serverUrl);
          
          // 2. TESTAR STATUS DO WHATSAPP
          console.log('📊 Testando status do WhatsApp...');
          
          const statusController = new AbortController();
          const statusTimeoutId = setTimeout(() => statusController.abort(), 8000);
          
          const statusResponse = await fetch(`${serverUrl}/api/whatsapp/status`, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'omit',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (compatible; WhatsApp-Frontend/1.0)'
            },
            signal: statusController.signal
          });

          clearTimeout(statusTimeoutId);

          console.log('📊 Status response:', statusResponse.status);
          setDebugInfo(prev => ({ ...prev, statusResponse: statusResponse.status }));

          if (statusResponse.ok) {
            const statusData: WhatsAppStatus = await statusResponse.json();
            console.log('✅ Status obtido:', statusData);
            setDebugInfo(prev => ({ ...prev, statusData }));
            
            setIsConnected(statusData.isReady);
            
            if (statusData.user) {
              setUser(statusData.user);
            }

            // 3. SE TEM QR DISPONÍVEL, BUSCAR
            if (statusData.hasQR && !statusData.isReady) {
              console.log('📱 QR Code disponível! Buscando...');
              
              const qrController = new AbortController();
              const qrTimeoutId = setTimeout(() => qrController.abort(), 8000);
              
              const qrResponse = await fetch(`${serverUrl}/api/whatsapp/qr`, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                credentials: 'omit',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (compatible; WhatsApp-Frontend/1.0)'
                },
                signal: qrController.signal
              });

              clearTimeout(qrTimeoutId);

              console.log('📱 QR response:', qrResponse.status);
              setDebugInfo(prev => ({ ...prev, qrResponse: qrResponse.status }));

              if (qrResponse.ok) {
                const qrData: QRResponse = await qrResponse.json();
                console.log('🎉 QR CODE OBTIDO!');
                setQrCode(qrData.qr);
                setDebugInfo(prev => ({ ...prev, qrReceived: true, qrLength: qrData.qr?.length }));
                toast.success(`QR Code carregado de ${serverUrl}!`);
                return; // SUCESSO!
              } else {
                console.log('⏳ QR Code ainda não disponível (status:', qrResponse.status, ')');
                setDebugInfo(prev => ({ ...prev, qrNotReady: qrResponse.status }));
              }
            } else if (statusData.isReady) {
              console.log('✅ WhatsApp já conectado!');
              setQrCode(null);
              toast.success('WhatsApp já está conectado!');
              return; // SUCESSO!
            } else {
              console.log('⏳ Aguardando QR Code ser gerado...');
              setDebugInfo(prev => ({ ...prev, waitingForQR: true }));
            }
            
            // Se chegou até aqui, o servidor está funcionando mas sem QR ainda
            return;
          } else {
            console.log('❌ Status API não OK:', statusResponse.status, 'para', serverUrl);
            setDebugInfo(prev => ({ ...prev, statusError: statusResponse.status }));
            // Continuar tentando outros servidores
          }
        } else {
          console.log('❌ Servidor não respondeu:', basicTest.status, 'para', serverUrl);
          setDebugInfo(prev => ({ ...prev, serverNotResponding: basicTest.status }));
          // Continuar tentando outros servidores
        }
        
      } catch (error) {
        console.error('❌ Erro ao conectar com', serverUrl, ':', error);
        setDebugInfo(prev => ({ 
          ...prev, 
          [`error_${serverUrl}`]: error.toString(),
          lastError: error.toString()
        }));
        
        // Se foi erro de rede/timeout, continuar tentando outros servidores
        if (error.name === 'AbortError' || error.message.includes('fetch')) {
          console.log('⏳ Tentando próximo servidor...');
          continue;
        }
      }
    }
    
    // Se chegou aqui, nenhum servidor funcionou
    console.error('❌ Nenhum servidor WhatsApp encontrado!');
    setServerStatus('offline');
    setWorkingServer(null);
    toast.error('Nenhum servidor WhatsApp encontrado. Verifique se o servidor está rodando.');
  };

  // REINICIAR WHATSAPP
  const restartWhatsApp = async () => {
    if (!workingServer) {
      toast.error('Nenhum servidor conectado para reiniciar');
      return;
    }

    try {
      console.log('🔄 Reiniciando WhatsApp em:', workingServer);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${workingServer}/api/whatsapp/restart`, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; WhatsApp-Frontend/1.0)'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setIsConnected(false);
        setQrCode(null);
        setUser(null);
        toast.success('WhatsApp reiniciado!');
        
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

  // POLLING AUTOMÁTICO A CADA 5 SEGUNDOS
  useEffect(() => {
    fetchQRCodeFromStandalone();
    
    const interval = setInterval(() => {
      if (!isConnected) {
        fetchQRCodeFromStandalone();
      }
    }, 5000);

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
                  {workingServer ? `Conectado: ${workingServer}` : 'Procurando servidor...'}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500">Última atualização:</span>
                  <code className="text-xs bg-blue-100 px-2 py-1 rounded">{lastUpdate}</code>
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    Tentativa: {attempts}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500">Servidores testados:</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">{POSSIBLE_SERVERS.length} opções</code>
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
                disabled={!workingServer}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4" />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>
        </div>

        {/* DEBUG INFO DETALHADO */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">🔍 Debug Info Detalhado (Tempo Real)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Última tentativa:</span>
              <p className="text-gray-600">{debugInfo.lastAttempt || 'Nunca'}</p>
            </div>
            <div>
              <span className="font-medium">Servidor atual:</span>
              <p className="text-gray-600 text-xs">{debugInfo.currentServer || 'Nenhum'}</p>
            </div>
            <div>
              <span className="font-medium">Conectividade:</span>
              <p className="text-gray-600">{debugInfo.basicConnectivity || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium">Status API:</span>
              <p className="text-gray-600">{debugInfo.statusResponse || 'N/A'}</p>
            </div>
          </div>
          
          {/* LISTA DE SERVIDORES TESTADOS */}
          <div className="mt-4">
            <h4 className="font-medium text-gray-900 mb-2">🌐 Servidores Testados:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {POSSIBLE_SERVERS.map((server, index) => (
                <div key={index} className={`p-2 rounded ${server === workingServer ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  <span className="font-mono">{server}</span>
                  {server === workingServer && <span className="ml-2 text-green-600">✅ Ativo</span>}
                </div>
              ))}
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
        {workingServer && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-800 font-medium">✅ Conectado ao WhatsApp Standalone!</p>
            </div>
            <p className="text-green-700 text-sm mt-1">
              Servidor: <code className="bg-green-100 px-2 py-1 rounded">{workingServer}</code>
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
              <p className="font-medium">💡 Verifique se algum destes comandos está rodando:</p>
              <div className="mt-2 space-y-1">
                <code className="bg-red-100 px-2 py-1 rounded text-xs block">cd whatsapp-standalone && npm start</code>
                <code className="bg-red-100 px-2 py-1 rounded text-xs block">cd /home/ubuntu/cotacao/whatsapp-standalone && npm start</code>
                <code className="bg-red-100 px-2 py-1 rounded text-xs block">node server.js (na pasta do projeto)</code>
              </div>
              <p className="mt-2 text-xs">Servidores testados: {POSSIBLE_SERVERS.join(', ')}</p>
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
                      alt="QR Code WhatsApp REAL" 
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
                  <p>🔄 Atualizando automaticamente a cada 5 segundos</p>
                  <p>🔒 Conexão segura e criptografada</p>
                  <p>⚡ QR Code REAL do servidor: {workingServer}</p>
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
                    {serverStatus === 'connecting' ? 'Conectando ao servidor...' : 
                     serverStatus === 'offline' ? 'Procurando servidor ativo...' :
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
                    disabled={!workingServer}
                    className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Zap className="w-5 h-5" />
                    <span>Reiniciar WhatsApp</span>
                  </button>
                </div>
                
                {serverStatus === 'offline' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm font-medium mb-2">
                      ⚠️ Para a apresentação funcionar, execute um destes comandos no servidor:
                    </p>
                    <div className="space-y-1">
                      <code className="bg-red-100 text-red-800 px-3 py-2 rounded text-sm block">
                        cd whatsapp-standalone && npm start
                      </code>
                      <code className="bg-red-100 text-red-800 px-3 py-2 rounded text-sm block">
                        node whatsapp-standalone/server.js
                      </code>
                    </div>
                    <p className="text-red-700 text-xs mt-2">
                      O sistema testará automaticamente: localhost:3001, 127.0.0.1:3001, 146.59.227.248:3001
                    </p>
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
              <strong>Servidor ativo:</strong> {workingServer || 'Nenhum encontrado'}
            </p>
            <p className="text-blue-800 text-sm">
              <strong>Comando para iniciar:</strong> cd whatsapp-standalone && npm start
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};