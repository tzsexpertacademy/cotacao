import React, { useState, useEffect } from 'react';
import { MessageSquare, QrCode, Wifi, WifiOff, RefreshCw, Send, Users, MessageCircle, User, CheckCircle, AlertTriangle, Smartphone, Copy } from 'lucide-react';
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

// Try multiple server configurations
const SERVER_CONFIGS = [
  'http://146.59.227.248:3005',  // Original port
  'http://146.59.227.248:3001',  // Fallback to main SaaS port
  'http://localhost:3005',       // Local development
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
  const [userId, setUserId] = useState<string>('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [currentServerUrl, setCurrentServerUrl] = useState<string>('');
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Gerar ID único para o usuário (em produção viria do login)
  useEffect(() => {
    let storedUserId = localStorage.getItem('whatsapp_user_id');
    if (!storedUserId) {
      storedUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('whatsapp_user_id', storedUserId);
    }
    setUserId(storedUserId);
  }, []);

  // Function to try connecting to different server configurations
  const tryConnectToServer = async (serverUrl: string): Promise<boolean> => {
    return new Promise((resolve) => {
      console.log(`🔌 Tentando conectar em: ${serverUrl}`);
      
      const testSocket = io(serverUrl, {
        timeout: 5000,
        forceNew: true,
        transports: ['websocket', 'polling']
      });

      const timeout = setTimeout(() => {
        testSocket.disconnect();
        resolve(false);
      }, 5000);

      testSocket.on('connect', () => {
        console.log(`✅ Conectado com sucesso em: ${serverUrl}`);
        clearTimeout(timeout);
        testSocket.disconnect();
        resolve(true);
      });

      testSocket.on('connect_error', () => {
        clearTimeout(timeout);
        testSocket.disconnect();
        resolve(false);
      });
    });
  };

  // Find working server and connect
  const connectToWorkingServer = async () => {
    if (!userId) return;

    console.log('🔍 Procurando servidor WhatsApp disponível...');
    setServerStatus('connecting');
    setConnectionError(null);
    setConnectionAttempts(prev => prev + 1);

    // Try each server configuration
    for (const serverUrl of SERVER_CONFIGS) {
      const isWorking = await tryConnectToServer(serverUrl);
      
      if (isWorking) {
        console.log(`🎯 Servidor encontrado: ${serverUrl}`);
        setCurrentServerUrl(serverUrl);
        connectToServer(serverUrl);
        return;
      }
    }

    // If no server is working
    console.error('❌ Nenhum servidor WhatsApp disponível');
    setServerStatus('offline');
    setConnectionError('Nenhum servidor WhatsApp disponível. Verifique se o servidor está rodando nas portas 3005 ou 3001.');
    toast.error('Erro: Servidor WhatsApp não encontrado');
  };

  // Connect to specific server
  const connectToServer = (serverUrl: string) => {
    console.log('🔌 Conectando ao servidor WhatsApp:', serverUrl);

    const newSocket = io(serverUrl, {
      timeout: 10000,
      forceNew: true,
      transports: ['websocket', 'polling']
    });
    
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Conectado ao servidor WhatsApp!');
      setServerStatus('online');
      setConnectionError(null);
      
      // Entrar no room do usuário
      newSocket.emit('join-user', userId);
      toast.success(`Conectado ao servidor WhatsApp! (${serverUrl})`);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Erro de conexão:', error);
      setServerStatus('offline');
      setConnectionError(`Erro de conexão com ${serverUrl}: ${error.message}`);
      
      // Try to reconnect to another server after a delay
      setTimeout(() => {
        if (connectionAttempts < 3) {
          connectToWorkingServer();
        }
      }, 3000);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Desconectado do servidor');
      setServerStatus('offline');
      setIsConnected(false);
      toast.error('Desconectado do servidor WhatsApp');
    });

    newSocket.on('qr', (qr: string) => {
      console.log('📱 QR Code recebido!');
      setQrCode(qr);
      setIsConnected(false);
      toast.success('QR Code gerado! Escaneie com seu WhatsApp');
    });

    newSocket.on('ready', (data: any) => {
      console.log('🎉 WhatsApp conectado!', data);
      setIsConnected(true);
      setQrCode(null);
      setUser(data.user);
      toast.success(`WhatsApp conectado como ${data.user.name}!`);
      loadChats();
    });

    newSocket.on('authenticated', () => {
      console.log('🔐 WhatsApp autenticado!');
      toast.success('WhatsApp autenticado!');
    });

    newSocket.on('auth_failure', (data: any) => {
      console.error('❌ Falha na autenticação:', data);
      toast.error('Falha na autenticação do WhatsApp');
    });

    newSocket.on('disconnected', (data: any) => {
      console.log('📱 WhatsApp desconectado:', data);
      setIsConnected(false);
      setQrCode(null);
      setUser(null);
      toast.error('WhatsApp desconectado: ' + data.reason);
    });

    newSocket.on('message', (message: WhatsAppMessage) => {
      console.log('💬 Nova mensagem:', message);
      setMessages(prev => [message, ...prev]);
      
      if (!message.fromMe) {
        toast.success(`Nova mensagem de ${message.contact?.name || message.from}`);
      }
    });

    newSocket.on('chats', (chatList: WhatsAppChat[]) => {
      console.log(`💬 ${chatList.length} conversas carregadas`);
      setChats(chatList);
    });

    newSocket.on('status', (status: any) => {
      console.log('📊 Status recebido:', status);
      setIsConnected(status.isReady);
      if (status.hasQR && !status.isReady) {
        fetchQRCode();
      }
      if (status.user) {
        setUser(status.user);
      }
    });
  };

  // Connect when userId is available
  useEffect(() => {
    if (!userId) return;

    connectToWorkingServer();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [userId]);

  const initializeWhatsApp = async () => {
    if (!userId || !currentServerUrl) {
      toast.error('Servidor não conectado');
      return;
    }
    
    setInitializing(true);
    try {
      const response = await fetch(`${currentServerUrl}/api/user/whatsapp/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ WhatsApp inicializado:', data);
        toast.success('WhatsApp inicializado! Aguarde o QR Code...');
        
        // Buscar QR Code após inicializar
        setTimeout(() => {
          fetchQRCode();
        }, 3000);
      } else {
        const error = await response.json();
        toast.error('Erro ao inicializar: ' + error.error);
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar WhatsApp:', error);
      toast.error('Erro ao inicializar WhatsApp');
    } finally {
      setInitializing(false);
    }
  };

  const fetchQRCode = async () => {
    if (!userId || !currentServerUrl) return;
    
    try {
      const response = await fetch(`${currentServerUrl}/api/user/${userId}/whatsapp/qr`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ QR Code recebido via API');
        setQrCode(data.qr);
      } else {
        console.log('⏳ QR Code ainda não disponível');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar QR Code:', error);
    }
  };

  const loadChats = async () => {
    if (!userId || !currentServerUrl) return;
    
    try {
      const response = await fetch(`${currentServerUrl}/api/user/${userId}/whatsapp/chats`);
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      }
    } catch (error) {
      console.error('Erro ao carregar chats:', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedChat || !messageText.trim() || !isConnected || !userId || !currentServerUrl) return;

    try {
      const response = await fetch(`${currentServerUrl}/api/user/${userId}/whatsapp/send`, {
        method: 'POST',
        headers: {
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
    if (!userId || !currentServerUrl) return;
    
    try {
      const response = await fetch(`${currentServerUrl}/api/user/${userId}/whatsapp/restart`, {
        method: 'POST',
        headers: {
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
        
        // Buscar novo QR Code após reiniciar
        setTimeout(() => {
          fetchQRCode();
        }, 3000);
      }
    } catch (error) {
      toast.error('Erro ao reiniciar WhatsApp');
    }
  };

  const retryConnection = () => {
    setConnectionAttempts(0);
    connectToWorkingServer();
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
    return 'Aguardando Conexão';
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
                WhatsApp Integrado
              </h2>
              <p className="text-gray-600">
                Conecte seu WhatsApp diretamente na plataforma
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-gray-500">ID:</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">{userId}</code>
                {currentServerUrl && (
                  <>
                    <span className="text-xs text-gray-500">Servidor:</span>
                    <code className="text-xs bg-blue-100 px-2 py-1 rounded">{currentServerUrl}</code>
                  </>
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
              onClick={restartWhatsApp}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reiniciar</span>
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
              Tentar Novamente
            </button>
          </div>
          <p className="text-red-700 text-sm mt-1">{connectionError}</p>
          <div className="mt-2 text-xs text-red-600">
            <p>Servidores testados:</p>
            <ul className="list-disc list-inside ml-2">
              {SERVER_CONFIGS.map(url => (
                <li key={url}>{url}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Success Message */}
      {serverStatus === 'online' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">✅ Sistema WhatsApp Integrado funcionando!</p>
          </div>
          <p className="text-green-700 text-sm mt-1">Conectado em: {currentServerUrl}</p>
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
                Conectar seu WhatsApp
              </h3>
              
              {!isConnected && !qrCode && (
                <div className="space-y-6">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <Smartphone className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      Inicializar WhatsApp
                    </h4>
                    <p className="text-gray-600 mb-4">
                      Clique no botão abaixo para inicializar sua instância WhatsApp
                    </p>
                    <button
                      onClick={initializeWhatsApp}
                      disabled={initializing || serverStatus !== 'online'}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {initializing ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Inicializando...</span>
                        </div>
                      ) : (
                        'Inicializar WhatsApp'
                      )}
                    </button>
                  </div>
                </div>
              )}
              
              {qrCode && (
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
                </div>
              )}

              {isConnected && (
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
                      ✅ Seu WhatsApp está conectado! Agora você pode usar o dashboard e enviar mensagens.
                    </p>
                  </div>
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
                      <p className="text-green-100 text-sm">WhatsApp conectado e funcionando</p>
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
                    <h3 className="text-lg font-semibold text-gray-900">Conversas Recentes</h3>
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
                        <p>Carregando suas conversas...</p>
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
                    onClick={() => setSelectedChat(chat)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedChat?.id === chat.id ? 'bg-green-50 border-r-2 border-green-500' : ''
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
                    {isConnected ? 'Carregando conversas...' : 'Conecte o WhatsApp primeiro'}
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
                        .filter(msg => msg.from === selectedChat.id || msg.to === selectedChat.id)
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