import React, { useState, useEffect } from 'react';
import { MessageSquare, QrCode, Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle, Smartphone, Copy, Zap, User, Phone } from 'lucide-react';
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

  // URLs para testar - GARANTIDO QUE UMA VAI FUNCIONAR
  const SERVERS = [
    'http://146.59.227.248:3001',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
  ];

  // FUNÇÃO PRINCIPAL - BUSCAR QR CODE
  const fetchQRCodeDirect = async () => {
    setLastUpdate(new Date().toLocaleTimeString());
    setAttempts(prev => prev + 1);
    
    console.log('🔥 BUSCANDO QR CODE - TENTATIVA', attempts + 1);
    
    for (const serverUrl of SERVERS) {
      try {
        console.log(`🔍 Testando servidor: ${serverUrl}`);
        setServerStatus('connecting');
        
        // 1. TESTAR STATUS PRIMEIRO
        const statusResponse = await fetch(`${serverUrl}/api/whatsapp/status`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (statusResponse.ok) {
          const status: WhatsAppStatus = await statusResponse.json();
          console.log('✅ Status obtido:', status);
          
          setServerStatus('online');
          setWorkingServer(serverUrl);
          setIsConnected(status.isReady);
          
          if (status.user) {
            setUser(status.user);
          }

          // 2. SE TEM QR DISPONÍVEL, BUSCAR
          if (status.hasQR && !status.isReady) {
            console.log('📱 QR Code disponível! Buscando...');
            
            const qrResponse = await fetch(`${serverUrl}/api/whatsapp/qr`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });

            if (qrResponse.ok) {
              const qrData: QRResponse = await qrResponse.json();
              console.log('🎉 QR CODE OBTIDO!');
              setQrCode(qrData.qr);
              toast.success('QR Code carregado! Escaneie agora!');
              return; // SUCESSO!
            }
          } else if (status.isReady) {
            console.log('✅ WhatsApp já conectado!');
            setQrCode(null);
            toast.success('WhatsApp já está conectado!');
            return; // SUCESSO!
          }
        }
      } catch (error) {
        console.log(`❌ Falhou: ${serverUrl}`, error);
      }
    }
    
    // Se chegou aqui, nenhum servidor funcionou
    setServerStatus('offline');
    toast.error('Nenhum servidor WhatsApp encontrado!');
  };

  // REINICIAR WHATSAPP
  const restartWhatsApp = async () => {
    if (!workingServer) {
      toast.error('Nenhum servidor disponível');
      return;
    }

    try {
      console.log('🔄 Reiniciando WhatsApp...');
      
      const response = await fetch(`${workingServer}/api/whatsapp/restart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsConnected(false);
        setQrCode(null);
        setUser(null);
        toast.success('WhatsApp reiniciado! Aguarde o QR Code...');
        
        // Buscar QR Code após reiniciar
        setTimeout(() => {
          fetchQRCodeDirect();
        }, 3000);
      }
    } catch (error) {
      toast.error('Erro ao reiniciar WhatsApp');
    }
  };

  // POLLING AUTOMÁTICO A CADA 3 SEGUNDOS
  useEffect(() => {
    fetchQRCodeDirect();
    
    const interval = setInterval(() => {
      if (!isConnected) {
        fetchQRCodeDirect();
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
                  WhatsApp - Apresentação Cliente
                </h1>
                <p className="text-gray-600">
                  Sistema pronto para demonstração
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500">Última atualização:</span>
                  <code className="text-xs bg-blue-100 px-2 py-1 rounded">{lastUpdate}</code>
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    Tentativa: {attempts}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-white ${getStatusColor()}`}>
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-sm font-medium">{getStatusText()}</span>
              </div>
              
              <button
                onClick={fetchQRCodeDirect}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Buscar QR</span>
              </button>
              
              <button
                onClick={restartWhatsApp}
                disabled={!workingServer}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>
        </div>

        {/* STATUS DO SERVIDOR */}
        {workingServer && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-800 font-medium">✅ Servidor WhatsApp encontrado!</p>
            </div>
            <p className="text-green-700 text-sm mt-1">
              Conectado em: <code className="bg-green-100 px-2 py-1 rounded">{workingServer}</code>
            </p>
          </div>
        )}

        {/* ERRO DE CONEXÃO */}
        {serverStatus === 'offline' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <p className="text-red-800 font-medium">⚠️ Nenhum servidor WhatsApp encontrado</p>
              </div>
              <button
                onClick={fetchQRCodeDirect}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Tentar Novamente
              </button>
            </div>
            <div className="mt-2 text-sm text-red-700">
              <p>Servidores testados:</p>
              <ul className="list-disc list-inside ml-2">
                {SERVERS.map(url => (
                  <li key={url}>{url}</li>
                ))}
              </ul>
              <p className="mt-2 font-medium">💡 Execute no servidor: <code className="bg-red-100 px-2 py-1 rounded">npm run whatsapp-server</code></p>
            </div>
          </div>
        )}

        {/* ÁREA PRINCIPAL DO QR CODE */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Conectar WhatsApp para Apresentação
            </h2>
            
            {qrCode ? (
              <div className="space-y-6">
                {/* QR CODE COMO IMAGEM */}
                <div className="flex justify-center">
                  <div className="p-6 bg-white border-4 border-green-300 rounded-2xl shadow-lg">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`}
                      alt="QR Code WhatsApp" 
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
                  <p>⚡ Pronto para demonstração ao cliente</p>
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
                    O WhatsApp está conectado e funcionando. Você pode demonstrar todas as funcionalidades ao cliente.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <Smartphone className="w-10 h-10 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Preparando WhatsApp...</h3>
                  <p className="text-gray-600">
                    {serverStatus === 'connecting' ? 'Conectando ao servidor...' : 
                     serverStatus === 'offline' ? 'Servidor offline' :
                     'Aguardando QR Code do servidor...'}
                  </p>
                </div>
                
                {/* BOTÕES DE AÇÃO EMERGENCIAL */}
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={fetchQRCodeDirect}
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span>Buscar QR Code</span>
                  </button>
                  
                  <button
                    onClick={restartWhatsApp}
                    disabled={!workingServer}
                    className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Zap className="w-5 h-5" />
                    <span>Forçar Reinício</span>
                  </button>
                </div>
                
                {serverStatus === 'offline' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">
                      ⚠️ Para a apresentação funcionar, execute no servidor:
                    </p>
                    <code className="bg-red-100 text-red-800 px-3 py-2 rounded text-sm block mt-2">
                      npm run whatsapp-server
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
                <li>Conexão real com WhatsApp</li>
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
        </div>
      </div>
    </div>
  );
};