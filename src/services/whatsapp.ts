interface WhatsAppMessage {
  id: string;
  from: string;
  body: string;
  timestamp: number;
  hasMedia: boolean;
  mediaUrl?: string;
  mediaType?: string;
}

interface WhatsAppConfig {
  webhookUrl: string;
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
}

class WhatsAppService {
  private config: WhatsAppConfig | null = null;
  private messageHandlers: ((message: WhatsAppMessage) => void)[] = [];
  private initialized = false;

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      const stored = localStorage.getItem('whatsapp_config');
      if (stored) {
        this.config = JSON.parse(stored);
        this.initialized = true;
      }
    } catch (error) {
      console.warn('Erro ao carregar configuração WhatsApp:', error);
    }
  }

  setConfig(config: WhatsAppConfig) {
    this.config = config;
    this.initialized = true;
    localStorage.setItem('whatsapp_config', JSON.stringify(config));
  }

  getConfig(): WhatsAppConfig | null {
    return this.config;
  }

  onMessage(handler: (message: WhatsAppMessage) => void) {
    this.messageHandlers.push(handler);
  }

  async sendMessage(to: string, message: string) {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp não configurado. Configure na aba Configurações.');
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${this.config!.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config!.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro API WhatsApp: ${errorData.error?.message || 'Erro desconhecido'}`);
      }

      return response.json();
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      throw error;
    }
  }

  async setupWebhook() {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp não configurado');
    }

    // Simular configuração do webhook
    console.log('Webhook configurado:', this.config!.webhookUrl);
    
    return {
      success: true,
      webhookUrl: this.config!.webhookUrl,
      verifyToken: this.config!.verifyToken
    };
  }

  // Simular recebimento de mensagens (em produção seria via webhook)
  simulateIncomingMessage(from: string, body: string, hasMedia = false, mediaUrl?: string) {
    try {
      const message: WhatsAppMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        from,
        body,
        timestamp: Date.now(),
        hasMedia,
        mediaUrl,
        mediaType: hasMedia ? 'document' : undefined
      };

      // Notificar todos os handlers
      this.messageHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Erro no handler de mensagem:', error);
        }
      });

      return message;
    } catch (error) {
      console.error('Erro ao simular mensagem:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return this.config !== null && 
           this.config.accessToken !== '' && 
           this.config.phoneNumberId !== '' &&
           this.initialized;
  }

  getStatus(): string {
    if (!this.initialized) return 'Não inicializado';
    if (!this.config) return 'Não configurado';
    if (!this.config.accessToken) return 'Token de acesso necessário';
    if (!this.config.phoneNumberId) return 'ID do telefone necessário';
    return 'Configurado';
  }
}

export const whatsAppService = new WhatsAppService();