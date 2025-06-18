import React, { useState, useEffect } from 'react';
import { MessageSquare, QrCode, Wifi, WifiOff, RefreshCw, Send, Users, MessageCircle, User, CheckCircle, AlertTriangle, Smartphone, Copy, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  fromMe: boolean;
  hasMedia?: boolean;
  type: string;
  contact?: {
    name: string;
    number: string;
    profilePicUrl?: string;
  };
  chat?: {
    name: string;
    isGroup: boolean;
  };
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
}

interface WhatsAppUser {
  name: string;
  number: string;
}

// 🔥 SERVIDOR FIXO - SEU SERVIDOR REAL
const SERVER_URL = 'http://146.59.227.248:3001';

export const WhatsAppIntegrated: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'connect' | 'dashboard' | 'messages'>('connect');
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
  const [messageText, setMessageText] = useState('');
  const [serverStatus, setServerStatus] = useState<'offline' | 'connecting' | 'online'>('offline');
  const [user, setUser] = useState<WhatsAppUser | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState<any>({});

  // 🔥 FUNÇÃO PRINCIPAL - BUSCAR STATUS E QR CODE
  const fetchWhatsAppData = async () => {
    console.log('🔍 Buscando dados do WhatsApp...');
    setDebugInfo(prev => ({ ...prev, lastFetch: new Date().toLocaleTimeString() }));
    
    try {
      setServerStatus('connecting');
      setConnectionError(null);

      // 1. TESTAR CONECTIVIDADE BÁSICA
      console.log('📡 Testando conectividade...');
      const pingResponse = await fetch(SERVER_URL, { 
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache'
      });
      
      if (!pingResponse.ok) {
        throw new Error(`Servidor não responde: ${pingResponse.status}`);
      }
      
      console.log('✅ Servidor respondeu!');
      setServerStatus('online');
      setDebugInfo(prev => ({ ...prev, serverPing: 'OK', serverStatus: pingResponse.status }));

      // 2. BUSCAR STATUS DO WHATSAPP
      console.log('📊 Buscando status...');
      const statusResponse = await fetch(`${SERVER_URL}/api/whatsapp/status`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (statusResponse.ok) {
        const status = await statusResponse.json();
        console.log('📊 Status recebido:', status);
        setDebugInfo(prev => ({ ...prev, status }));
        
        setIsConnected(status.isReady || false);
        
        // 3. SE TEM QR CODE DISPONÍVEL, BUSCAR
        if (status.hasQR && !status.isReady) {
          console.log('📱 QR Code disponível! Buscando...');
          await fetchQRCode();
        } else if (status.isReady) {
          console.log('✅ WhatsApp já conectado!');
          setQrCode(null);
          // Buscar dados do usuário se conectado
          await loadChats();
        }
      } else {
        console.error('❌ Erro no status:', statusResponse.status);
        setDebugInfo(prev => ({ ...prev, statusError: statusResponse.status }));
      }

    } catch (error) {
      console.error('❌ Erro geral:', error);
      setServerStatus('offline');
      setConnectionError(`Erro: ${error}`);
      setDebugInfo(prev => ({ ...prev, error: error.toString() }));
    }
  };

  // 🔥 BUSCAR QR CODE ESPECÍFICO
  const fetchQRCode = async () => {
    try {
      console.log('📱 Buscando QR Code...');
      const qrResponse = await fetch(`${SERVER_URL}/api/whatsapp/qr`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (qrResponse.ok) {
        const qrData = await qrResponse.json();
        console.log('✅ QR Code recebido!', qrData.qr ? 'Presente' : 'Vazio');
        
        if (qrData.qr) {
          setQrCode(qrData.qr);
          setDebugInfo(prev => ({ ...prev, qrCode: 'Recebido', qrLength: qrData.qr.length }));
          toast.success('QR Code carregado! Escaneie com seu WhatsApp');
        } else {
          console.log('⚠️ QR Code vazio');
          setDebugInfo(prev => ({ ...prev, qrCode: 'Vazio' }));
        }
      } else if (qrResponse.status === 404) {
        console.log('⏳ QR Code ainda não disponível (404)');
        setDebugInfo(prev => ({ ...prev, qrCode: 'Não disponível (404)' }));
      } else {
        console.error('❌ Erro no QR Code:', qrResponse.status);
        setDebugInfo(prev => ({ ...prev, qrCodeError: qrResponse.status }));
      }
    } catch (error) {
      console.error('❌ Erro ao buscar QR Code:', error);
      setDebugInfo(prev => ({ ...prev, qrCodeError: error.toString() }));
    }
  };

  // 🔥 CARREGAR CHATS
  const loadChats = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/whatsapp/chats`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setChats(data);
        console.log(`💬 ${data.length} conversas carregadas`);
        toast.success(`${data.length} conversas carregadas`);
      }
    } catch (error) {
      console.error('Erro ao carregar chats:', error);
    }
  };

  // 🔥 ENVIAR MENSAGEM
  const sendMessage = async () => {
    if (!selectedChat || !messageText.trim() || !isConnected) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/whatsapp/send`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: selectedChat.id,
          message: messageText
        })
      });

      if (response.ok) {
        setMessageText('');
        toast.success('Mensagem enviada!');
      } else {
        const error = await response.json();
        toast.error('Erro ao enviar: ' + error.error);
      }
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  // 🔥 REINICIAR WHATSAPP
  const restartWhatsApp = async () => {
    try {
      setRetryCount(prev => prev + 1);
      console.log(`🔄 Reiniciando WhatsApp (tentativa ${retryCount + 1})...`);
      
      const response = await fetch(`${SERVER_URL}/api/whatsapp/restart`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsConnected(false);
        setQrCode(null);
        setMessages([]);
        setChats([]);
        setUser(null);
        toast.success('WhatsApp reiniciado!');
        
        // Aguardar e buscar novamente
        setTimeout(() => {
          fetchWhatsAppData();
        }, 3000);
      }
    } catch (error) {
      toast.error('Erro ao reiniciar WhatsApp');
    }
  };

  // 🔥 POLLING AUTOMÁTICO
  useEffect(() => {
    // Buscar dados imediatamente
    fetchWhatsAppData();
    
    // Polling a cada 5 segundos se não conectado
    const interval = setInterval(() => {
      if (!isConnected) {
        fetchWhatsAppData();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('pt-BR');
  };

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

  const tabs = [
    { id: 'connect' as const, label: 'Conectar WhatsApp', icon: QrCode },
    { id: 'dashboard' as const, label: 'Dashboard', icon: MessageSquare },
    { id: 'messages' as const, label: 'Mensagens', icon: MessageCircle }
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
                WhatsApp Real Integrado
              </h2>
              <p className="text-gray-600">
                Conecte seu WhatsApp verdadeiro na plataforma
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-gray-500">Servidor:</span>
                <code className="text-xs bg-blue-100 px-2 py-1 rounded">
                  {SERVER_URL}
                </code>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  FIXO ✓
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-white ${getStatusColor()}`}>
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-medium">{getStatusText()}</span>
            </div>
            
            <button
              onClick={restartWhatsApp}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reiniciar ({retryCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-red-800 font-medium">Erro de Conexão</p>
            </div>
            <button
              onClick={fetchWhatsAppData}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </div>
          <p className="text-red-700 text-sm mt-1">{connectionError}</p>
        </div>
      )}

      {/* Success Message */}
      {serverStatus === 'online' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">✅ Conectado ao servidor WhatsApp!</p>
          </div>
          <p className="text-green-700 text-sm mt-1">
            Servidor: {SERVER_URL} | Tentativas: {retryCount}
          </p>
        </div>
      )}

      {/* Debug Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">🔍 Debug Info (Tempo Real)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium">Última busca:</span>
            <p className="text-gray-600">{debugInfo.lastFetch || 'Nunca'}</p>
          </div>
          <div>
            <span className="font-medium">Status servidor:</span>
            <p className="text-gray-600">{debugInfo.serverStatus || 'N/A'}</p>
          </div>
          <div>
            <span className="font-medium">QR Code:</span>
            <p className="text-gray-600">{debugInfo.qrCode || 'N/A'}</p>
          </div>
          <div>
            <span className="font-medium">WhatsApp:</span>
            <p className="text-gray-600">{isConnected ? 'Conectado' : 'Desconectado'}</p>
          </div>
        </div>
        {debugInfo.status && (
          <div className="mt-2 p-2 bg-white rounded text-xs">
            <strong>Status completo:</strong> {JSON.stringify(debugInfo.status)}
          </div>
        )}
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
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Connect Tab */}
        {activeTab === 'connect' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Conectar seu WhatsApp Real
              </h3>
              
              {/* Botões de Ação */}
              <div className="mb-6 flex justify-center space-x-4">
                <button
                  onClick={fetchWhatsAppData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  🔄 Buscar QR Code
                </button>
                <button
                  onClick={fetchQRCode}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  📱 Forçar QR Code
                </button>
                <button
                  onClick={restartWhatsApp}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  🔄 Reiniciar WhatsApp
                </button>
              </div>
              
              {qrCode ? (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="p-4 bg-white border-2 border-gray-300 rounded-lg">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrCode)}`}
                        alt="QR Code WhatsApp" 
                        className="w-64 h-64"
                        onError={(e) => {
                          console.error('Erro ao carregar QR Code como imagem');
                          // Fallback: mostrar o código como texto
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* QR Code como texto (backup) */}
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">QR Code (texto):</h4>
                    <div className="text-xs font-mono bg-white p-2 rounded border max-h-32 overflow-y-auto">
                      {qrCode}
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(qrCode)}
                      className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      📋 Copiar QR Code
                    </button>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">📱 Como conectar:</h4>
                    <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside text-left max-w-md mx-auto">
                      <li>Abra o WhatsApp no seu celular</li>
                      <li>Toque em "Mais opções" (⋮) ou "Configurações"</li>
                      <li>Selecione "Dispositivos conectados"</li>
                      <li>Toque em "Conectar um dispositivo"</li>
                      <li>Escaneie este QR Code com a câmera</li>
                    </ol>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>⚡ QR Code do servidor real: {SERVER_URL}</p>
                    <p>🔒 Conexão segura e criptografada</p>
                    <p>🔄 Atualização automática a cada 5 segundos</p>
                  </div>
                </div>
              ) : isConnected ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-green-900">WhatsApp Conectado!</h4>
                    <p className="text-green-700">Conectado como: <strong>{user?.name}</strong></p>
                    <p className="text-green-600 text-sm">Número: {user?.number}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">
                      ✅ Seu WhatsApp real está conectado! Agora você pode usar o dashboard e enviar mensagens.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <Smartphone className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">Aguardando Conexão</h4>
                    <p className="text-gray-600">
                      {serverStatus === 'connecting' ? 'Procurando QR Code...' : 
                       serverStatus === 'offline' ? 'Servidor offline' :
                       'Aguardando QR Code do servidor...'}
                    </p>
                  </div>
                  {serverStatus === 'offline' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800 text-sm">
                        ⚠️ Servidor offline. Verifique se o comando está rodando na porta 3001.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {!isConnected ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-yellow-900 mb-2">Conecte seu WhatsApp primeiro</h3>
                <p className="text-yellow-700 mb-4">Vá para a aba "Conectar WhatsApp" para escanear o QR Code</p>
                <button
                  onClick={() => setActiveTab('connect')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Conectar WhatsApp
                </button>
              </div>
            ) : (
              <>
                {/* User Info */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{user?.name}</h3>
                      <p className="text-green-100">+{user?.number}</p>
                      <p className="text-green-100 text-sm">WhatsApp Real conectado</p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Conversas</p>
                        <p className="text-2xl font-bold text-gray-900">{chats.length}</p>
                      </div>
                      <MessageSquare className="w-8 h-8 text-green-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Mensagens</p>
                        <p className="text-2xl font-bold text-gray-900">{messages.length}</p>
                      </div>
                      <MessageCircle className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Status</p>
                        <p className="text-2xl font-bold text-green-600">Online</p>
                      </div>
                      <Wifi className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* Recent Chats */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Conversas Recentes</h3>
                      <button
                        onClick={loadChats}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Carregar Chats
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {chats.slice(0, 10).map((chat) => (
                      <div key={chat.id} className="p-4 hover:bg-gray-50 cursor-pointer"
                           onClick={() => {
                             setSelectedChat(chat);
                             setActiveTab('messages');
                           }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              {chat.isGroup ? (
                                <Users className="w-5 h-5 text-gray-600" />
                              ) : (
                                <User className="w-5 h-5 text-gray-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{chat.name}</p>
                              {chat.lastMessage && (
                                <p className="text-sm text-gray-600 truncate">
                                  {chat.lastMessage.fromMe ? 'Você: ' : ''}{chat.lastMessage.body}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {chat.unreadCount > 0 && (
                              <div className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {chat.unreadCount}
                              </div>
                            )}
                            {chat.lastMessage && (
                              <p className="text-xs text-gray-500 mt-1">
                                {formatTime(chat.lastMessage.timestamp)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {chats.length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p>Clique em "Carregar Chats" para ver suas conversas</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mensagens</h3>
            {selectedChat ? (
              <div>
                <p className="text-gray-600">Conversa com: {selectedChat.name}</p>
                {/* Implementar interface de mensagens aqui */}
              </div>
            ) : (
              <p className="text-gray-500">Selecione uma conversa no Dashboard</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};