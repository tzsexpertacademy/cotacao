interface WhatsAppManagerConfig {
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
  webhookUrl: string;
}

interface Message {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  type: 'text' | 'image' | 'document' | 'audio' | 'video';
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  profilePicture?: string;
  lastSeen?: number;
  isBlocked: boolean;
  tags: string[];
}

interface WebhookEvent {
  id: string;
  timestamp: number;
  type: 'message' | 'status' | 'error';
  data: any;
  processed: boolean;
}

class WhatsAppManager {
  private config: WhatsAppManagerConfig | null = null;
  private messages: Message[] = [];
  private contacts: Contact[] = [];
  private webhookEvents: WebhookEvent[] = [];
  private messageHandlers: ((message: Message) => void)[] = [];
  private statusHandlers: ((status: any) => void)[] = [];

  constructor() {
    this.loadFromStorage();
    this.setupWebhookServer();
  }

  // Configuration
  setConfig(config: WhatsAppManagerConfig) {
    this.config = config;
    localStorage.setItem('whatsapp_manager_config', JSON.stringify(config));
  }

  getConfig(): WhatsAppManagerConfig | null {
    return this.config;
  }

  isConfigured(): boolean {
    return this.config !== null && 
           this.config.accessToken !== '' && 
           this.config.phoneNumberId !== '';
  }

  // Messages
  async sendMessage(to: string, message: string, type: 'text' = 'text'): Promise<Message> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp Manager não configurado');
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
          to: to.replace(/\D/g, ''), // Remove non-digits
          type: 'text',
          text: { body: message }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`WhatsApp API Error: ${error.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      
      const newMessage: Message = {
        id: result.messages[0].id,
        from: this.config!.phoneNumberId,
        to,
        body: message,
        timestamp: Date.now(),
        direction: 'outbound',
        status: 'sent',
        type: 'text'
      };

      this.addMessage(newMessage);
      return newMessage;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  }

  async sendMediaMessage(to: string, mediaUrl: string, caption?: string, type: 'image' | 'document' | 'audio' | 'video' = 'image'): Promise<Message> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp Manager não configurado');
    }

    try {
      const mediaObject: any = {
        link: mediaUrl
      };

      if (caption && (type === 'image' || type === 'document')) {
        mediaObject.caption = caption;
      }

      const response = await fetch(`https://graph.facebook.com/v18.0/${this.config!.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config!.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace(/\D/g, ''),
          type,
          [type]: mediaObject
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`WhatsApp API Error: ${error.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      
      const newMessage: Message = {
        id: result.messages[0].id,
        from: this.config!.phoneNumberId,
        to,
        body: caption || mediaUrl,
        timestamp: Date.now(),
        direction: 'outbound',
        status: 'sent',
        type
      };

      this.addMessage(newMessage);
      return newMessage;
    } catch (error) {
      console.error('Erro ao enviar mídia:', error);
      throw error;
    }
  }

  getMessages(phone?: string, limit: number = 50, offset: number = 0): Message[] {
    let filteredMessages = this.messages;
    
    if (phone) {
      filteredMessages = this.messages.filter(m => 
        m.from === phone || m.to === phone
      );
    }

    return filteredMessages
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(offset, offset + limit);
  }

  private addMessage(message: Message) {
    this.messages.push(message);
    this.saveToStorage();
    
    // Notify handlers
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  // Contacts
  addContact(contact: Omit<Contact, 'id'>): Contact {
    const newContact: Contact = {
      ...contact,
      id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.contacts.push(newContact);
    this.saveToStorage();
    return newContact;
  }

  getContacts(): Contact[] {
    return this.contacts;
  }

  getContact(phone: string): Contact | null {
    return this.contacts.find(c => c.phone === phone) || null;
  }

  updateContact(id: string, updates: Partial<Contact>): Contact | null {
    const contactIndex = this.contacts.findIndex(c => c.id === id);
    if (contactIndex === -1) return null;

    this.contacts[contactIndex] = { ...this.contacts[contactIndex], ...updates };
    this.saveToStorage();
    return this.contacts[contactIndex];
  }

  // Webhook handling
  private setupWebhookServer() {
    // This would be implemented with a real server in production
    // For now, we'll simulate webhook events
    console.log('Webhook server setup (simulated)');
  }

  handleWebhookEvent(event: any): WebhookEvent {
    const webhookEvent: WebhookEvent = {
      id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: this.determineEventType(event),
      data: event,
      processed: false
    };

    this.webhookEvents.push(webhookEvent);
    this.processWebhookEvent(webhookEvent);
    this.saveToStorage();

    return webhookEvent;
  }

  private determineEventType(event: any): 'message' | 'status' | 'error' {
    if (event.entry?.[0]?.changes?.[0]?.value?.messages) {
      return 'message';
    } else if (event.entry?.[0]?.changes?.[0]?.value?.statuses) {
      return 'status';
    }
    return 'error';
  }

  private processWebhookEvent(webhookEvent: WebhookEvent) {
    try {
      if (webhookEvent.type === 'message') {
        this.processIncomingMessage(webhookEvent.data);
      } else if (webhookEvent.type === 'status') {
        this.processMessageStatus(webhookEvent.data);
      }
      
      webhookEvent.processed = true;
    } catch (error) {
      console.error('Error processing webhook event:', error);
    }
  }

  private processIncomingMessage(data: any) {
    const messageData = data.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!messageData) return;

    const message: Message = {
      id: messageData.id,
      from: messageData.from,
      to: data.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id || '',
      body: messageData.text?.body || messageData.caption || '[Media]',
      timestamp: parseInt(messageData.timestamp) * 1000,
      direction: 'inbound',
      status: 'delivered',
      type: messageData.type || 'text'
    };

    this.addMessage(message);

    // Auto-create contact if doesn't exist
    if (!this.getContact(message.from)) {
      this.addContact({
        name: `Contact ${message.from}`,
        phone: message.from,
        isBlocked: false,
        tags: []
      });
    }
  }

  private processMessageStatus(data: any) {
    const statusData = data.entry?.[0]?.changes?.[0]?.value?.statuses?.[0];
    if (!statusData) return;

    // Update message status
    const messageIndex = this.messages.findIndex(m => m.id === statusData.id);
    if (messageIndex !== -1) {
      this.messages[messageIndex].status = statusData.status;
      this.saveToStorage();
    }

    // Notify status handlers
    this.statusHandlers.forEach(handler => {
      try {
        handler(statusData);
      } catch (error) {
        console.error('Error in status handler:', error);
      }
    });
  }

  // Event handlers
  onMessage(handler: (message: Message) => void) {
    this.messageHandlers.push(handler);
  }

  onStatus(handler: (status: any) => void) {
    this.statusHandlers.push(handler);
  }

  // Webhook verification
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.config?.verifyToken) {
      return challenge;
    }
    return null;
  }

  // Analytics
  getAnalytics(days: number = 7) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentMessages = this.messages.filter(m => m.timestamp > cutoff);
    
    return {
      totalMessages: recentMessages.length,
      inboundMessages: recentMessages.filter(m => m.direction === 'inbound').length,
      outboundMessages: recentMessages.filter(m => m.direction === 'outbound').length,
      uniqueContacts: new Set(recentMessages.map(m => m.direction === 'inbound' ? m.from : m.to)).size,
      messagesByDay: this.groupMessagesByDay(recentMessages),
      topContacts: this.getTopContacts(recentMessages)
    };
  }

  private groupMessagesByDay(messages: Message[]) {
    const groups: { [key: string]: number } = {};
    
    messages.forEach(message => {
      const date = new Date(message.timestamp).toISOString().split('T')[0];
      groups[date] = (groups[date] || 0) + 1;
    });
    
    return groups;
  }

  private getTopContacts(messages: Message[]) {
    const contactCounts: { [key: string]: number } = {};
    
    messages.forEach(message => {
      const contact = message.direction === 'inbound' ? message.from : message.to;
      contactCounts[contact] = (contactCounts[contact] || 0) + 1;
    });
    
    return Object.entries(contactCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([phone, count]) => ({ phone, count }));
  }

  // Storage
  private loadFromStorage() {
    try {
      const config = localStorage.getItem('whatsapp_manager_config');
      if (config) {
        this.config = JSON.parse(config);
      }

      const messages = localStorage.getItem('whatsapp_manager_messages');
      if (messages) {
        this.messages = JSON.parse(messages);
      }

      const contacts = localStorage.getItem('whatsapp_manager_contacts');
      if (contacts) {
        this.contacts = JSON.parse(contacts);
      }

      const webhookEvents = localStorage.getItem('whatsapp_manager_webhook_events');
      if (webhookEvents) {
        this.webhookEvents = JSON.parse(webhookEvents);
      }
    } catch (error) {
      console.error('Error loading from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('whatsapp_manager_messages', JSON.stringify(this.messages));
      localStorage.setItem('whatsapp_manager_contacts', JSON.stringify(this.contacts));
      localStorage.setItem('whatsapp_manager_webhook_events', JSON.stringify(this.webhookEvents));
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  }

  // Utility methods
  formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('55')) {
      return `+${cleaned}`;
    } else if (cleaned.length === 11) {
      return `+55${cleaned}`;
    }
    return `+${cleaned}`;
  }

  isValidPhoneNumber(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  // Simulate incoming message (for testing)
  simulateIncomingMessage(from: string, body: string, type: 'text' | 'image' | 'document' = 'text') {
    const webhookData = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '15550559999',
              phone_number_id: this.config?.phoneNumberId || 'PHONE_NUMBER_ID'
            },
            messages: [{
              from: from.replace(/\D/g, ''),
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type,
              text: type === 'text' ? { body } : undefined,
              caption: type !== 'text' ? body : undefined
            }]
          },
          field: 'messages'
        }]
      }]
    };

    this.handleWebhookEvent(webhookData);
  }
}

export const whatsAppManager = new WhatsAppManager();