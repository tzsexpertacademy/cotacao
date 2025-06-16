import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone, QrCode, Wifi, WifiOff, RefreshCw, Trash2, Send, Users, MessageCircle, Monitor, Settings, Download, Upload, Eye, EyeOff, AlertTriangle, CheckCircle, Copy, Smartphone, Zap, User } from 'lucide-react';
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

interface WhatsAppContact {
  id: string;
  name: string;
  number: string;
  isMyContact: boolean;
  profilePicUrl?: string;
}

interface WhatsAppUser {
  name: string;
  number: string;
}

// Configuração do servidor - ALTERE AQUI O IP DO SEU SERVIDOR
const SERVER_IP = '186.239.127.30'; // Substitua pelo IP do seu servidor
const SERVER_PORT = '3001';
const SERVER_URL = `http://${SERVER_IP}:${SERVER_PORT}`;

export const WhatsAppRealManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'qr' | 'dashboard' | 'messages' | 'contacts' | 'settings'>('qr');
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
  const [messageText, setMessageText] = useState('');
  const [serverStatus, setServerStatus] = useState<'offline' | 'connecting' | 'online'>('offline');
  const [user, setUser] = useState<WhatsAppUser | null>(null);
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalChats: 0,
    totalContacts: 0,
    messagesReceived: 0
  });

  // Conectar ao servidor Socket.IO
  useEffect(() => {
    console.log('🔌 Conectando ao servidor WhatsApp...');
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);
    setServerStatus('connecting');

    newSocket.on('connect', () => {
      console.log('✅ Conectado ao servidor WhatsApp REAL!');
      setServerStatus('online');
      toast.success('Conectado ao servidor WhatsApp!');
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Desconectado do servidor');
      setServerStatus('offline');
      setIsConnected(false);
      toast.error('Desconectado do servidor WhatsApp');
    });

    newSocket.on('qr', (qr: string) => {
      console.log('📱 QR Code REAL recebido!');
      setQrCode(qr);
      setIsConnected(false);
      toast.success('QR Code gerado! Escaneie com seu WhatsApp');
    });

    newSocket.on('ready', (data: any) => {
      console.log('🎉 WhatsApp REAL conectado!', data);
      setIsConnected(true);
      setQrCode(null);
      setUser(data.user);
      toast.success(`WhatsApp conectado como ${data.user.name}!`);
      loadChats();
      loadContacts();
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
      console.log('💬 Nova mensagem REAL:', message);
      setMessages(prev => [message, ...prev]);
      setStats(prev => ({
        ...prev,
        totalMessages: prev.totalMessages + 1,
        messagesReceived: prev.messagesReceived + 1
      }));
      
      if (!message.fromMe) {
        toast.success(`Nova mensagem de ${message.contact?.name || message.from}`);
      }
    });

    newSocket.on('message_sent', (message: WhatsAppMessage) => {
      console.log('📤 Mensagem enviada:', message);
      setMessages(prev => [message, ...prev]);
    });

    newSocket.on('chats', (chatList: WhatsAppChat[]) => {
      console.log(`💬 ${chatList.length} conversas REAIS carregadas`);
      setChats(chatList);
      setStats(prev => ({ ...prev, totalChats: chatList.length }));
    });

    newSocket.on('status', (status: any) => {
      setIsConnected(status.isReady);
      if (status.hasQR && !status.isReady) {
        fetchQRCode();
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const fetchQRCode = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/whatsapp/qr`);
      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qr);
      }
    } catch (error) {
      console.error('Erro ao buscar QR Code:', error);
    }
  };

  const loadChats = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/whatsapp/chats`);
      if (response.ok) {
        const data = await response.json();
        setChats(data);
        setStats(prev => ({ ...prev, totalChats: data.length }));
      }
    } catch (error) {
      console.error('Erro ao carregar chats:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/whatsapp/contacts`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
        setStats(prev => ({ ...prev, totalContacts: data.length }));
      }
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    }
  };

  const loadChatMessages = async (chatId: string) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/whatsapp/messages/${chatId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedChat || !messageText.trim() || !isConnected) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/whatsapp/send`, {
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
    try {
      const response = await fetch(`${SERVER_URL}/api/whatsapp/restart`, {
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
        setContacts([]);
        setUser(null);
        toast.success('WhatsApp reiniciado!');
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
    { id: 'qr' as const, label: 'QR Code', icon: QrCode },
    { id: 'dashboard' as const, label: 'Dashboard', icon: Monitor },
    { id: 'messages' as const, label: 'Mensagens', icon: MessageCircle },
    { id: 'contacts' as const, label: 'Contatos', icon: Users },
    { id: 'settings' as const, label: 'Configurações', icon: Settings }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <MessageSquare className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                WhatsApp REAL
              </h1>
              <p className="text-gray-600">
                Conecte seu WhatsApp verdadeiro - Conversas reais
              </p>
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
        {/* QR Code */}
        {activeTab === 'qr' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Conectar WhatsApp Real
              </h3>
              
              {qrCode ? (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="p-4 bg-white border-2 border-gray-300 rounded-lg">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrCode)}`}
                        alt="QR Code WhatsApp Real" 
                        className="w-64 h-64"
                      />
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">📱 Como conectar seu WhatsApp:</h4>
                    <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside text-left max-w-md mx-auto">
                      <li>Abra o WhatsApp no seu celular</li>
                      <li>Toque em "Mais opções" (⋮) ou "Configurações"</li>
                      <li>Selecione "Dispositivos conectados"</li>
                      <li>Toque em "Conectar um dispositivo"</li>
                      <li>Escaneie este QR Code com a câmera</li>
                    </ol>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>⚡ QR Code atualiza automaticamente</p>
                    <p>🔒 Conexão segura e criptografada</p>
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
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <Smartphone className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">Aguardando Conexão</h4>
                    <p className="text-gray-600">Iniciando WhatsApp... O QR Code aparecerá em breve.</p>
                  </div>
                  {serverStatus === 'offline' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800 text-sm">
                        ⚠️ Servidor offline. Execute: <code className="bg-red-100 px-2 py-1 rounded">npm run whatsapp-server</code>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {!isConnected ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-yellow-900 mb-2">Conecte seu WhatsApp primeiro</h3>
                <p className="text-yellow-700 mb-4">Vá para a aba "QR Code" para conectar</p>
                <button
                  onClick={() => setActiveTab('qr')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Ir para QR Code
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Mensagens</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalMessages}</p>
                      </div>
                      <MessageCircle className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Conversas</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalChats}</p>
                      </div>
                      <MessageSquare className="w-8 h-8 text-green-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Contatos</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalContacts}</p>
                      </div>
                      <Users className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Recebidas</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.messagesReceived}</p>
                      </div>
                      <Download className="w-8 h-8 text-orange-600" />
                    </div>
                  </div>
                </div>

                {/* Conversas Recentes */}
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
                        <p>Carregando suas conversas...</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Messages */}
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

        {/* Contacts */}
        {activeTab === 'contacts' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Seus Contatos ({contacts.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {contacts.map((contact) => (
                <div key={contact.id} className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      {contact.profilePicUrl ? (
                        <img 
                          src={contact.profilePicUrl} 
                          alt={contact.name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <User className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{contact.name}</p>
                      <p className="text-sm text-gray-600">+{contact.number}</p>
                    </div>
                    {contact.isMyContact && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Contato
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {contacts.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  {isConnected ? 'Carregando contatos...' : 'Conecte o WhatsApp primeiro'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Configurações</h3>
            
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">✅ WhatsApp REAL Conectado</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Conectado ao seu WhatsApp verdadeiro</li>
                  <li>• Todas as conversas são reais</li>
                  <li>• Mensagens sincronizadas em tempo real</li>
                  <li>• Funciona como WhatsApp Web oficial</li>
                  <li>• Dados seguros e criptografados</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Status da Conexão</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span>Servidor</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        serverStatus === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {serverStatus === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span>WhatsApp</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {isConnected ? 'Conectado' : 'Desconectado'}
                      </span>
                    </div>
                    {user && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span>Usuário</span>
                        <span className="text-sm font-medium text-gray-900">
                          {user.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Ações</h4>
                  <div className="space-y-2">
                    <button
                      onClick={restartWhatsApp}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Reiniciar WhatsApp</span>
                    </button>
                    
                    {!isConnected && (
                      <button
                        onClick={() => setActiveTab('qr')}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Ver QR Code</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {serverStatus === 'offline' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-2">⚠️ Servidor Offline</h4>
                  <p className="text-red-800 text-sm mb-2">
                    Para usar o WhatsApp real, execute o servidor:
                  </p>
                  <code className="bg-red-100 text-red-800 px-3 py-2 rounded text-sm block">
                    npm run whatsapp-server
                  </code>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};