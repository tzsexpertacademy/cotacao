// 🔍 SCRIPT DE DEBUG DO FRONTEND
class FrontendDebugger {
  constructor() {
    this.logs = [];
    this.startTime = Date.now();
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      elapsed: Date.now() - this.startTime
    };
    
    this.logs.push(logEntry);
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
  }

  // Debug da conexão Socket.IO
  debugSocketConnection(serverUrl, tenantId) {
    this.log('info', 'Iniciando debug Socket.IO', { serverUrl, tenantId });
    
    // Verificar se Socket.IO está disponível
    if (typeof io === 'undefined') {
      this.log('error', 'Socket.IO não está carregado');
      return;
    }

    // Testar conectividade básica
    this.testBasicConnectivity(serverUrl);
    
    // Criar conexão com debug
    const socket = io(serverUrl, {
      timeout: 10000,
      forceNew: true,
      transports: ['websocket', 'polling']
    });

    // Eventos de debug
    socket.on('connect', () => {
      this.log('success', 'Socket conectado', { id: socket.id });
      socket.emit('join-tenant', tenantId);
    });

    socket.on('connect_error', (error) => {
      this.log('error', 'Erro de conexão Socket', error);
    });

    socket.on('disconnect', (reason) => {
      this.log('warning', 'Socket desconectado', reason);
    });

    socket.on('qr', (qr) => {
      this.log('success', 'QR Code recebido via Socket', { length: qr?.length });
    });

    socket.on('status', (status) => {
      this.log('info', 'Status recebido via Socket', status);
    });

    return socket;
  }

  // Testar conectividade básica
  async testBasicConnectivity(serverUrl) {
    this.log('info', 'Testando conectividade básica', serverUrl);
    
    try {
      const response = await fetch(serverUrl);
      this.log('success', 'Servidor respondendo', { status: response.status });
    } catch (error) {
      this.log('error', 'Erro de conectividade', error.message);
    }
  }

  // Debug das APIs REST
  async debugAPIs(serverUrl, tenantId) {
    this.log('info', 'Iniciando debug das APIs', { serverUrl, tenantId });
    
    const endpoints = [
      { url: `${serverUrl}/api/whatsapp/${tenantId}/status`, name: 'Status' },
      { url: `${serverUrl}/api/whatsapp/${tenantId}/qr`, name: 'QR Code' }
    ];

    for (const endpoint of endpoints) {
      try {
        this.log('info', `Testando ${endpoint.name}`, endpoint.url);
        const response = await fetch(endpoint.url);
        
        if (response.ok) {
          const data = await response.json();
          this.log('success', `${endpoint.name} OK`, data);
        } else {
          this.log('warning', `${endpoint.name} não OK`, { status: response.status });
        }
      } catch (error) {
        this.log('error', `Erro em ${endpoint.name}`, error.message);
      }
    }
  }

  // Debug do estado do componente React
  debugReactState(component) {
    this.log('info', 'Estado do componente React', {
      tenantId: component.tenantId,
      isConnected: component.isConnected,
      qrCode: component.qrCode ? 'Presente' : 'Ausente',
      serverStatus: component.serverStatus,
      connectionError: component.connectionError
    });
  }

  // Gerar relatório completo
  generateReport() {
    const report = {
      startTime: this.startTime,
      duration: Date.now() - this.startTime,
      totalLogs: this.logs.length,
      errors: this.logs.filter(log => log.level === 'error'),
      warnings: this.logs.filter(log => log.level === 'warning'),
      successes: this.logs.filter(log => log.level === 'success'),
      logs: this.logs
    };

    console.log('📊 RELATÓRIO DE DEBUG COMPLETO');
    console.log('='.repeat(50));
    console.log('⏰ Duração:', report.duration, 'ms');
    console.log('📝 Total de logs:', report.totalLogs);
    console.log('❌ Erros:', report.errors.length);
    console.log('⚠️ Avisos:', report.warnings.length);
    console.log('✅ Sucessos:', report.successes.length);
    
    return report;
  }
}

// Disponibilizar globalmente
if (typeof window !== 'undefined') {
  window.FrontendDebugger = FrontendDebugger;
}

module.exports = FrontendDebugger;