import OpenAI from 'openai';

class OpenAIService {
  private client: OpenAI | null = null;
  private assistantId: string | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      const apiKey = localStorage.getItem('openai_api_key');
      const assistantId = localStorage.getItem('openai_assistant_id');
      
      if (apiKey) {
        this.client = new OpenAI({
          apiKey,
          dangerouslyAllowBrowser: true
        });
      }
      
      if (assistantId) {
        this.assistantId = assistantId;
      }
    } catch (error) {
      console.warn('Erro ao inicializar OpenAI:', error);
    }
  }

  setApiKey(apiKey: string) {
    try {
      localStorage.setItem('openai_api_key', apiKey);
      this.client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });
    } catch (error) {
      console.error('Erro ao configurar API Key:', error);
      throw new Error('Falha ao configurar OpenAI: ' + (error as Error).message);
    }
  }

  setAssistantId(assistantId: string) {
    this.assistantId = assistantId;
    localStorage.setItem('openai_assistant_id', assistantId);
  }

  getAssistantId(): string | null {
    if (!this.assistantId) {
      this.assistantId = localStorage.getItem('openai_assistant_id');
    }
    return this.assistantId;
  }

  async createAssistant() {
    if (!this.client) throw new Error('OpenAI client não configurado');

    try {
      // Get custom prompt if available
      const customConfig = localStorage.getItem('ai_assistant_config');
      let instructions = this.getDefaultInstructions();
      
      if (customConfig) {
        const config = JSON.parse(customConfig);
        if (config.isActive && config.systemPrompt) {
          instructions = this.compilePrompt(config);
        }
      }

      const assistant = await this.client.beta.assistants.create({
        name: "Analista de Cotações Corporativas",
        instructions,
        model: "gpt-4-1106-preview",
        tools: [{ type: "code_interpreter" }]
      });

      this.setAssistantId(assistant.id);
      return assistant;
    } catch (error) {
      console.error('Erro ao criar assistente:', error);
      throw new Error('Falha ao criar assistente: ' + (error as Error).message);
    }
  }

  async updateAssistantPrompt(newPrompt: string) {
    if (!this.client || !this.assistantId) {
      throw new Error('OpenAI não configurado');
    }

    try {
      await this.client.beta.assistants.update(this.assistantId, {
        instructions: newPrompt
      });
      console.log('✅ Prompt do assistente atualizado');
    } catch (error) {
      console.error('Erro ao atualizar prompt:', error);
      throw new Error('Falha ao atualizar prompt: ' + (error as Error).message);
    }
  }

  private compilePrompt(config: any): string {
    let prompt = config.systemPrompt;
    
    // Replace placeholders
    prompt = prompt.replace('{industry}', config.businessContext?.industry || 'Não especificado');
    prompt = prompt.replace('{companySize}', config.businessContext?.companySize || 'Não especificado');
    prompt = prompt.replace('{budget}', config.businessContext?.budget || 'Não especificado');
    prompt = prompt.replace('{priorities}', config.businessContext?.priorities?.join(', ') || 'Não especificado');
    prompt = prompt.replace('{priceWeight}', config.analysisRules?.priceWeight?.toString() || '40');
    prompt = prompt.replace('{deliveryWeight}', config.analysisRules?.deliveryWeight?.toString() || '20');
    prompt = prompt.replace('{qualityWeight}', config.analysisRules?.qualityWeight?.toString() || '25');
    prompt = prompt.replace('{paymentTermsWeight}', config.analysisRules?.paymentTermsWeight?.toString() || '15');
    prompt = prompt.replace('{customCriteria}', config.analysisRules?.customCriteria?.join('\n- ') || 'Nenhum critério personalizado');
    prompt = prompt.replace('{customInstructions}', config.customInstructions || 'Nenhuma instrução específica');

    return prompt;
  }

  private getDefaultInstructions(): string {
    return `Você é um especialista em análise de cotações corporativas com vasto conhecimento em procurement e gestão de fornecedores.

IMPORTANTE: Sempre retorne dados no formato JSON estruturado:
{
  "produtos": [
    {
      "id": "string_unico",
      "descricao": "string",
      "quantidade": number,
      "cotacoes": [
        {
          "fornecedor": "string",
          "preco_unitario": number,
          "preco_total": number,
          "prazo_entrega_dias": number,
          "condicao_pagamento": "string",
          "observacoes": "string",
          "dados_incompletos": boolean,
          "score_qualidade": number,
          "score_confiabilidade": number,
          "pontos_fortes": ["string"],
          "pontos_fracos": ["string"]
        }
      ],
      "recomendacao": {
        "fornecedor_recomendado": "string",
        "motivo": "string",
        "economia_potencial": number,
        "riscos": ["string"],
        "alternativas": ["string"]
      }
    }
  ],
  "resumo": {
    "total_produtos": number,
    "total_fornecedores": number,
    "economia_potencial": number,
    "economia_percentual": number,
    "recomendacoes_gerais": ["string"],
    "alertas": ["string"],
    "melhor_custo_beneficio": [
      {
        "produto_id": "string",
        "fornecedor": "string",
        "motivo": "string",
        "economia": number
      }
    ]
  },
  "analise_detalhada": {
    "pontos_atencao": ["string"],
    "oportunidades": ["string"],
    "riscos_identificados": ["string"],
    "sugestoes_negociacao": ["string"]
  }
}

Seja preciso, objetivo e sempre identifique a melhor opção custo-benefício.
Se encontrar dados incompletos, marque "dados_incompletos": true e explique nas observações.
Forneça scores de qualidade e confiabilidade de 1-10 para cada fornecedor.
Identifique pontos fortes e fracos de cada proposta.
Inclua recomendações práticas e sugestões de negociação.`;
  }

  async analyzeDocument(content: string, fileName: string) {
    if (!this.client) {
      throw new Error('OpenAI não configurado. Configure na aba Configurações.');
    }

    if (!this.assistantId) {
      throw new Error('Assistente não criado. Configure na aba Configurações.');
    }

    try {
      const thread = await this.client.beta.threads.create();

      await this.client.beta.threads.messages.create(thread.id, {
        role: "user",
        content: `Analise este documento de cotação:

Arquivo: ${fileName}
Conteúdo:
${content}

Por favor, extraia todas as informações de produtos, preços, fornecedores e condições, e retorne no formato JSON estruturado conforme suas instruções.`
      });

      const run = await this.client.beta.threads.runs.create(thread.id, {
        assistant_id: this.assistantId
      });

      // Aguardar conclusão com timeout
      let runStatus = await this.client.beta.threads.runs.retrieve(thread.id, run.id);
      let attempts = 0;
      const maxAttempts = 30; // 30 segundos
      
      while ((runStatus.status === 'queued' || runStatus.status === 'in_progress') && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.client.beta.threads.runs.retrieve(thread.id, run.id);
        attempts++;
      }

      if (runStatus.status === 'completed') {
        const messages = await this.client.beta.threads.messages.list(thread.id);
        const lastMessage = messages.data[0];
        
        if (lastMessage.content[0].type === 'text') {
          const response = lastMessage.content[0].text.value;
          
          // Tentar extrair JSON da resposta
          try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              return JSON.parse(jsonMatch[0]);
            }
            return response;
          } catch {
            return response;
          }
        }
      } else if (runStatus.status === 'failed') {
        throw new Error('Análise falhou: ' + runStatus.last_error?.message);
      } else {
        throw new Error('Timeout na análise do documento');
      }

      throw new Error('Resposta inválida do assistente');
    } catch (error) {
      console.error('Erro na análise:', error);
      throw new Error('Falha na análise: ' + (error as Error).message);
    }
  }

  async analyzeDocumentWithCustomPrompt(content: string, fileName: string, customPrompt: string) {
    if (!this.client) {
      throw new Error('OpenAI não configurado');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          {
            role: "system",
            content: customPrompt
          },
          {
            role: "user",
            content: `Analise este documento de cotação:

Arquivo: ${fileName}
Conteúdo:
${content}

Por favor, extraia todas as informações de produtos, preços, fornecedores e condições, e retorne no formato JSON estruturado conforme suas instruções.`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      });

      const result = response.choices[0].message.content;
      
      // Tentar extrair JSON da resposta
      try {
        const jsonMatch = result?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return result;
      } catch {
        return result;
      }
    } catch (error) {
      console.error('Erro na análise com prompt customizado:', error);
      throw new Error('Falha na análise: ' + (error as Error).message);
    }
  }

  async compareQuotes(quotes: any[]) {
    if (!this.client || !this.assistantId) {
      throw new Error('OpenAI não configurado');
    }

    try {
      const thread = await this.client.beta.threads.create();

      await this.client.beta.threads.messages.create(thread.id, {
        role: "user",
        content: `Compare estas cotações e forneça recomendações:

${JSON.stringify(quotes, null, 2)}

Analise:
1. Melhor custo-benefício por produto
2. Fornecedores mais vantajosos
3. Oportunidades de economia
4. Riscos ou pontos de atenção
5. Recomendação final

Retorne análise estruturada em JSON.`
      });

      const run = await this.client.beta.threads.runs.create(thread.id, {
        assistant_id: this.assistantId
      });

      let runStatus = await this.client.beta.threads.runs.retrieve(thread.id, run.id);
      let attempts = 0;
      const maxAttempts = 30;
      
      while ((runStatus.status === 'queued' || runStatus.status === 'in_progress') && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.client.beta.threads.runs.retrieve(thread.id, run.id);
        attempts++;
      }

      if (runStatus.status === 'completed') {
        const messages = await this.client.beta.threads.messages.list(thread.id);
        const lastMessage = messages.data[0];
        
        if (lastMessage.content[0].type === 'text') {
          const response = lastMessage.content[0].text.value;
          
          try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              return JSON.parse(jsonMatch[0]);
            }
            return response;
          } catch {
            return response;
          }
        }
      }

      throw new Error('Falha na comparação das cotações');
    } catch (error) {
      console.error('Erro na comparação:', error);
      throw new Error('Falha na comparação: ' + (error as Error).message);
    }
  }

  isConfigured(): boolean {
    return this.client !== null && this.assistantId !== null;
  }

  getStatus(): string {
    if (!this.client) return 'API Key não configurada';
    if (!this.assistantId) return 'Assistente não criado';
    
    // Check if custom config is active
    const customConfig = localStorage.getItem('ai_assistant_config');
    if (customConfig) {
      const config = JSON.parse(customConfig);
      if (config.isActive) {
        return `Configurado com prompt personalizado: ${config.name}`;
      }
    }
    
    return 'Configurado com prompt padrão';
  }
}

export const openAIService = new OpenAIService();