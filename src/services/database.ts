interface DatabaseConfig {
  type: 'localStorage' | 'supabase';
  supabaseUrl?: string;
  supabaseKey?: string;
}

interface StoredAnalysis {
  id: string;
  nome: string;
  data_criacao: string;
  documentos: string[];
  resultado_analise: any;
  status: 'processando' | 'concluida' | 'erro';
}

interface WhatsAppQuote {
  id: string;
  from: string;
  message: string;
  timestamp: number;
  processed: boolean;
  analysis_id?: string;
}

class DatabaseService {
  private config: DatabaseConfig = { type: 'localStorage' };

  setConfig(config: DatabaseConfig) {
    this.config = config;
    localStorage.setItem('db_config', JSON.stringify(config));
  }

  async saveAnalysis(analysis: StoredAnalysis): Promise<void> {
    if (this.config.type === 'localStorage') {
      const analyses = this.getAnalyses();
      const index = analyses.findIndex(a => a.id === analysis.id);
      
      if (index >= 0) {
        analyses[index] = analysis;
      } else {
        analyses.push(analysis);
      }
      
      localStorage.setItem('analyses', JSON.stringify(analyses));
    } else {
      // Implementar Supabase
      throw new Error('Supabase não implementado ainda');
    }
  }

  getAnalyses(): StoredAnalysis[] {
    if (this.config.type === 'localStorage') {
      const stored = localStorage.getItem('analyses');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  }

  async getAnalysis(id: string): Promise<StoredAnalysis | null> {
    const analyses = this.getAnalyses();
    return analyses.find(a => a.id === id) || null;
  }

  async deleteAnalysis(id: string): Promise<void> {
    if (this.config.type === 'localStorage') {
      const analyses = this.getAnalyses();
      const filtered = analyses.filter(a => a.id !== id);
      localStorage.setItem('analyses', JSON.stringify(filtered));
    }
  }

  async clearAllAnalyses(): Promise<void> {
    if (this.config.type === 'localStorage') {
      localStorage.removeItem('analyses');
    }
  }

  async saveWhatsAppQuote(quote: WhatsAppQuote): Promise<void> {
    if (this.config.type === 'localStorage') {
      const quotes = this.getWhatsAppQuotes();
      quotes.push(quote);
      localStorage.setItem('whatsapp_quotes', JSON.stringify(quotes));
    }
  }

  getWhatsAppQuotes(): WhatsAppQuote[] {
    if (this.config.type === 'localStorage') {
      const stored = localStorage.getItem('whatsapp_quotes');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  }

  async markQuoteAsProcessed(id: string, analysisId: string): Promise<void> {
    if (this.config.type === 'localStorage') {
      const quotes = this.getWhatsAppQuotes();
      const quote = quotes.find(q => q.id === id);
      if (quote) {
        quote.processed = true;
        quote.analysis_id = analysisId;
        localStorage.setItem('whatsapp_quotes', JSON.stringify(quotes));
      }
    }
  }
}

export const databaseService = new DatabaseService();