import React, { useState, useEffect } from 'react';
import { MessageSquare, QrCode, Wifi, WifiOff, RefreshCw, Send, Users, MessageCircle, User, CheckCircle, AlertTriangle, Smartphone, Copy, Trash2 } from 'lucide-react';
import io from 'socket.io-client';
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

// 🔥 CORRIGIDO: Usar porta 3001 (onde o servidor realmente está)
const SERVER_URLS = [
  'http://146.59.227.248:3001',  // Servidor principal
  'http://localhost:3001',       // Local development
  'http://127.0.0.1:3001'        // Fallback local
];

export const WhatsAppIntegrated: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'connect' | 'dashboard' | 'messages'>('connect');
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
  const [messageText, setMessageText] = useState('');
  const [serverStatus, setServerStatus] = useState<'offline' | 'connecting' | 'online'>('offline');
  const [user, setUser] = useState<WhatsAppUser | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentServerUrl, setCurrentServerUrl] = useState<string>('');
  const [lastQrFetch, setLastQrFetch] = useState<number>(0);

  // Função para testar conectividade com múltiplas URLs
  const findWorkingServer = async (): Promise<string | null> => {
    console.log('🔍 Procurando servidor WhatsApp disponível...');
    
    for (const url of SERVER_URLS) {
      try {
        console.log(`🔌 Testando: ${url}`);
        const response = await fetch(`${url}/api/whatsapp/status`, { 
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (response.ok) {
          console.log(`✅ Servidor encontrado: ${url}`);
          return url;
        }
      } catch (error) {
        console.log(`❌ Falhou: ${url} - ${error}`);
      }
    }
    
    console.log('⚠️ Nenhum servidor respondeu');
    return null;
  };

  // Função para buscar QR Code via API REST
  const fetchQRCodeAPI = async (serverUrl: string): Promise<string | null> => {
    try {
      console.log('🔍 Buscando QR Code via API...');
      const response = await fetch(`${serverUrl}/api/whatsapp/qr`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ QR Code recebido via API');
        return data.qr;
      } else if (response.status === 404) {
        console.log('⏳ QR Code ainda não disponível (404)');
        return null;
      } else {
        console.log('❌ Erro ao buscar QR Code:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Erro na API de QR Code:', error);
      return null;
    }
  };

  // Função para buscar status via API REST
  const fetchStatusAPI = async (serverUrl: string): Promise<any> => {
    try {
      console.log('🔍 Buscando status via API...');
      const response = await fetch(`${serverUrl}/api/whatsapp/status`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (response.ok) {
        const status = await response.json();
        console.log('📊 Status recebido via API:', status);
        return status;
      }
    } catch (error) {
      console.error('❌ Erro na API de status:', error);
    }
    return null;
  };

  // Conectar via Socket.IO
  const connectSocket = (serverUrl: string) => {
    console.log('🔌 Tentando conectar Socket.IO em:', serverUrl);
    
    const newSocket = io(serverUrl, {
      timeout: 10000,
      forceNew: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000
    });
    
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Socket.IO conectado!');
      toast.success('Socket.IO conectado!');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Erro Socket.IO:', error);
      // Não desconecta aqui, deixa tentar reconectar
    });

    newSocket.on('qr', (qr: string) => {
      console.log('📱 QR Code via Socket.IO!');
      setQrCode(qr);
      setIsConnected(false);
      setLastQrFetch(Date.now());
    });

    newSocket.on('ready', (data: any) => {
      console.log('🎉 WhatsApp conectado via Socket.IO!', data);
      setIsConnected(true);
      setQrCode(null);
      setUser(data.user);
      toast.success(`WhatsApp conectado como ${data.user.name}!`);
    });

    newSocket.on('message', (message: WhatsAppMessage) => {
      console.log('💬 Nova mensagem via Socket.IO:', message);
      setMessages(prev => [message, ...prev]);
    });

    newSocket.on('chats', (chatList: WhatsAppChat[]) => {
      console.log(`💬 ${chatList.length} conversas via Socket.IO`);
      setChats(chatList);
    });

    newSocket.on('status', (status: any) => {
      console.log('📊 Status via Socket.IO:', status);
      setIsConnected(status.isReady);
      if (status.user) {
        setUser(status.user);
      }
    });

    return newSocket;
  };

  // Função principal de inicialização
  const initializeConnection = async () => {
    setServerStatus('connecting');
    setConnectionError(null);
    
    console.log('🚀 Iniciando conexão com WhatsApp...');
    
    // 1. Encontrar servidor funcionando
    const workingServer = await findWorkingServer();
    
    if (!workingServer) {
      setServerStatus('offline');
      setConnectionError('Nenhum servidor WhatsApp encontrado. Verifique se o comando "npm run whatsapp-server" está rodando na porta 3001.');
      return;
    }
    
    console.log('✅ Usando servidor:', workingServer);
    setCurrentServerUrl(workingServer);
    setServerStatus('online');
    
    // 2. Tentar Socket.IO (não bloqueante)
    const socketConnection = connectSocket(workingServer);
    
    // 3. Buscar status inicial via API
    const status = await fetchStatusAPI(workingServer);
    if (status) {
      setIsConnected(status.isReady);
      if (status.user) {
        setUser(status.user);
      }
      if (status.hasQR && !status.isReady) {
        // Buscar QR Code se disponível
        const qr = await fetchQRCodeAPI(workingServer);
        if (qr) {
          setQrCode(qr);
          setLastQrFetch(Date.now());
        }
      }
    } else {
      // Se API não responder, tenta buscar QR Code mesmo assim
      const qr = await fetchQRCodeAPI(workingServer);
      if (qr) {
        setQrCode(qr);
        setLastQrFetch(Date.now());
      }
    }
  };

  // Polling para QR Code e status
  useEffect(() => {
    if (currentServerUrl && serverStatus === 'online' && !isConnected) {
      const interval = setInterval(async () => {
        const now = Date.now();
        if (now - lastQrFetch > 5000) { // A cada 5 segundos
          console.log('🔄 Polling QR Code e status...');
          
          // Verificar status primeiro
          const status = await fetchStatusAPI(currentServerUrl);
          if (status?.isReady) {
            setIsConnected(true);
            setQrCode(null);
            if (status.user) {
              setUser(status.user);
              toast.success(`WhatsApp conectado como ${status.user.name}!`);
            }
            return; // Para o polling se conectou
          }
          
          // Se não conectado, buscar QR Code
          const qr = await fetchQRCodeAPI(currentServerUrl);
          if (qr) {
            setQrCode(qr);
            setLastQrFetch(now);
          }
        }
      }, 3000); // Polling a cada 3 segundos

      return () => clearInterval(interval);
    }
  }, [currentServerUrl, serverStatus, isConnected, lastQrFetch]);

  // Inicializar conexão ao montar componente
  useEffect(() => {
    initializeConnection();
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const retryConnection = () => {
    setRetryCount(prev => prev + 1);
    console.log(`🔄 Tentativa de reconexão #${retryCount + 1}`);
    setQrCode(null);
    setIsConnected(false);
    setUser(null);
    setCurrentServerUrl('');
    initializeConnection();
  };

  const loadChats = async () => {
    if (!currentServerUrl) return;
    
    try {
      const response = await fetch(`${currentServerUrl}/api/whatsapp/chats`, {
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
        toast.success(`${data.length} conversas carregadas`);
      }
    } catch (error) {
      console.error('Erro ao carregar chats:', error);
      toast.error('Erro ao carregar chats');
    }
  };

  const loadChatMessages = async (chatId: string) => {
    if (!currentServerUrl) return;
    
    try {
      const response = await fetch(`${currentServerUrl}/api/whatsapp/messages/${chatId}`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        toast.success(`${data.length} mensagens carregadas`);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
    }
  };

  const sendMessage = async () => {
    if (!selectedChat || !messageText.trim() || !currentServerUrl) return;

    try {
      const response = await fetch(`${currentServerUrl}/api/whatsapp/send`, {
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

  const restartWhatsApp = async () => {
    if (!currentServerUrl) return;
    
    try {
      const response = await fetch(`${currentServerUrl}/api/whatsapp/restart`, {
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
        
        // Reinicializar conexão
        setTimeout(() => {
          initializeConnection();
        }, 3000);
      }
    } catch (error) {
      toast.error('Erro ao reiniciar WhatsApp');
    }
  };

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
                  {currentServerUrl || 'Procurando...'}
                </code>
                {socket?.connected && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Socket.IO ✓</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-white ${getStatusColor()}`}>
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-medium">{getStatusText()}</span>
            </div>
            
            <button
              onClick={retryConnection}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reconectar</span>
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
              onClick={retryConnection}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Tentar Novamente ({retryCount})
            </button>
          </div>
          <p className="text-red-700 text-sm mt-1">{connectionError}</p>
          <div className="mt-2 text-xs text-red-600">
            <p>Servidores testados:</p>
            <ul className="list-disc list-inside ml-2">
              {SERVER_URLS.map(url => (
                <li key={url}>{url}</li>
              ))}
            </ul>
            <p className="mt-2 font-medium">💡 Execute no servidor: <code>npm run whatsapp-server</code></p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {serverStatus === 'online' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">✅ Conectado ao servidor WhatsApp Real!</p>
          </div>
          <p className="text-green-700 text-sm mt-1">
            Servidor: {currentServerUrl} | 
            Socket.IO: {socket?.connected ? '✅ Conectado' : '❌ Usando API REST'} |
            Tentativas: {retryCount}
          </p>
        </div>
      )}

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
              
              {/* Debug Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg text-left">
                <h4 className="font-medium text-gray-900 mb-2">🔍 Status da Conexão:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Servidor:</strong> {serverStatus}</p>
                  <p><strong>URL Ativa:</strong> {currentServerUrl || 'Nenhuma'}</p>
                  <p><strong>Socket.IO:</strong> {socket?.connected ? 'Conectado' : 'Desconectado'}</p>
                  <p><strong>WhatsApp:</strong> {isConnected ? 'Conectado' : 'Desconectado'}</p>
                  <p><strong>QR Code:</strong> {qrCode ? 'Disponível' : 'Não disponível'}</p>
                  <p><strong>Tentativas:</strong> {retryCount}</p>
                  <p><strong>Último QR:</strong> {lastQrFetch ? new Date(lastQrFetch).toLocaleTimeString() : 'Nunca'}</p>
                </div>
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={retryConnection}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    🔄 Forçar Reconexão
                  </button>
                  <button
                    onClick={() => fetchQRCodeAPI(currentServerUrl)}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    disabled={!currentServerUrl}
                  >
                    📱 Buscar QR Code
                  </button>
                </div>
              </div>
              
              {qrCode ? (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="p-4 bg-white border-2 border-gray-300 rounded-lg">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrCode)}`}
                        alt="QR Code WhatsApp" 
                        className="w-64 h-64"
                      />
                    </div>
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
                    <p>⚡ QR Code do servidor real: {currentServerUrl}</p>
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
                      {serverStatus === 'connecting' ? 'Procurando servidor...' : 
                       serverStatus === 'offline' ? 'Servidor offline' :
                       'Aguardando QR Code do servidor...'}
                    </p>
                  </div>
                  {serverStatus === 'offline' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800 text-sm">
                        ⚠️ Servidor offline. Execute no servidor: <code className="bg-red-100 px-2 py-1 rounded">npm run whatsapp-server</code>
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
                             loadChatMessages(chat.id);
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chats List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Suas Conversas</h3>
              </div>
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => {
                      setSelectedChat(chat);
                      loadChatMessages(chat.id);
                    }}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedChat?.id === chat.id ? 'bg-green-50 border-l-4 border-green-500' : ''
                    }`}
                  >
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
                      {chat.unreadCount > 0 && (
                        <div className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {chat.unreadCount}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
                {chats.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    {isConnected ? 'Carregue os chats no Dashboard' : 'Conecte o WhatsApp primeiro'}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
              {selectedChat ? (
                <>
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        {selectedChat.isGroup ? (
                          <Users className="w-5 h-5 text-green-600" />
                        ) : (
                          <User className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{selectedChat.name}</p>
                        <p className="text-sm text-gray-600">
                          {selectedChat.isGroup ? 'Grupo' : 'Contato'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="h-96 p-4 overflow-y-auto">
                    <div className="space-y-4">
                      {messages
                        .slice(0, 50)
                        .reverse()
                        .map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs px-4 py-2 rounded-lg ${
                                message.fromMe
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              {!message.fromMe && selectedChat.isGroup && (
                                <p className="text-xs font-medium mb-1 text-green-600">
                                  {message.contact?.name}
                                </p>
                              )}
                              <p className="whitespace-pre-wrap">{message.body}</p>
                              <p className={`text-xs mt-1 ${
                                message.fromMe ? 'text-green-100' : 'text-gray-500'
                              }`}>
                                {formatTime(message.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="p-4 border-t border-gray-200">
                    <div className="flex space-x-3">
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                        rows={2}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        disabled={!isConnected}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!messageText.trim() || !isConnected}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Selecione uma conversa para começar</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};