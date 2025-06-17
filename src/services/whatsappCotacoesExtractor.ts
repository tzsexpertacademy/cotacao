interface WhatsAppMessage {
  id: string;
  from: string;
  body: string;
  timestamp: number;
  contact?: {
    name: string;
    number: string;
  };
}

interface ExtractedCotacao {
  id: string;
  messageId: string;
  fornecedor: string;
  produtos: Array<{
    descricao: string;
    quantidade: number;
    preco_unitario: number;
    preco_total: number;
    observacoes?: string;
  }>;
  prazo_entrega: string;
  condicao_pagamento: string;
  observacoes: string;
  data_cotacao: string;
  confidence: number;
  raw_message: string;
}

class WhatsAppCotacoesExtractor {
  private extractionPrompt = `
Você é um especialista em extração de dados de cotações comerciais do WhatsApp.
Analise a mensagem e extraia TODAS as informações de cotação presentes.

REGRAS DE EXTRAÇÃO:
1. Identifique TODOS os produtos/serviços cotados
2. Extraia preços, quantidades, prazos e condições
3. Se informação estiver faltando, marque como "Não informado"
4. Calcule totais quando possível
5. Identifique o fornecedor pelo nome do contato
6. Seja preciso com números e valores
7. Considere variações de escrita (ex: "R$", "reais", "cada", "unid")

FORMATO DE SAÍDA (JSON):
{
  "tem_cotacao": boolean,
  "fornecedor": "string",
  "produtos": [
    {
      "descricao": "string",
      "quantidade": number,
      "preco_unitario": number,
      "preco_total": number,
      "observacoes": "string"
    }
  ],
  "prazo_entrega": "string",
  "condicao_pagamento": "string",
  "validade_proposta": "string",
  "observacoes_gerais": "string",
  "valor_total_geral": number,
  "confidence": number (0-100)
}

EXEMPLOS DE PADRÕES A RECONHECER:
- "Notebook Dell - 10 unidades - R$ 2.500,00 cada"
- "Preço: R$ 450,00 por unidade"
- "Total: R$ 25.000,00"
- "Prazo: 7 dias úteis"
- "Pagamento: 30 dias"
- "À vista com desconto"
- "Frete incluso"
- "Garantia 12 meses"

Se não houver cotação na mensagem, retorne {"tem_cotacao": false}.
`;

  async extractFromMessage(message: WhatsAppMessage, openAIService: any): Promise<ExtractedCotacao | null> {
    try {
      const fullPrompt = `${this.extractionPrompt}

MENSAGEM PARA ANÁLISE:
Remetente: ${message.contact?.name || message.from}
Data: ${new Date(message.timestamp).toLocaleString('pt-BR')}
Conteúdo: ${message.body}

Analise e extraia as informações de cotação:`;

      const result = await openAIService.analyzeDocumentWithCustomPrompt(
        message.body,
        `whatsapp_message_${message.id}.txt`,
        fullPrompt
      );

      if (result.tem_cotacao) {
        const cotacao: ExtractedCotacao = {
          id: `cotacao_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          messageId: message.id,
          fornecedor: result.fornecedor || message.contact?.name || 'Fornecedor não identificado',
          produtos: result.produtos || [],
          prazo_entrega: result.prazo_entrega || 'Não informado',
          condicao_pagamento: result.condicao_pagamento || 'Não informado',
          observacoes: result.observacoes_gerais || '',
          data_cotacao: new Date(message.timestamp).toISOString(),
          confidence: result.confidence || 85,
          raw_message: message.body
        };

        return cotacao;
      }

      return null;
    } catch (error) {
      console.error('Erro ao extrair cotação:', error);
      throw error;
    }
  }

  async extractFromMultipleMessages(messages: WhatsAppMessage[], openAIService: any): Promise<ExtractedCotacao[]> {
    const cotacoes: ExtractedCotacao[] = [];

    for (const message of messages) {
      try {
        const cotacao = await this.extractFromMessage(message, openAIService);
        if (cotacao) {
          cotacoes.push(cotacao);
        }
      } catch (error) {
        console.error(`Erro ao extrair cotação da mensagem ${message.id}:`, error);
      }
    }

    return cotacoes;
  }

  convertToAnalysisFormat(cotacoes: ExtractedCotacao[]): any {
    // Agrupar produtos por descrição similar
    const produtosAgrupados = new Map();

    cotacoes.forEach(cotacao => {
      cotacao.produtos.forEach(produto => {
        const key = produto.descricao.toLowerCase().trim();
        
        if (!produtosAgrupados.has(key)) {
          produtosAgrupados.set(key, {
            id: `produto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            descricao: produto.descricao,
            quantidade: produto.quantidade,
            cotacoes: []
          });
        }

        const produtoAgrupado = produtosAgrupados.get(key);
        produtoAgrupado.cotacoes.push({
          fornecedor: cotacao.fornecedor,
          preco_unitario: produto.preco_unitario,
          preco_total: produto.preco_total,
          prazo_entrega_dias: this.parsePrazoToDays(cotacao.prazo_entrega),
          condicao_pagamento: cotacao.condicao_pagamento,
          observacoes: produto.observacoes || cotacao.observacoes,
          dados_incompletos: this.checkIncompleteData(produto, cotacao),
          score_qualidade: this.calculateQualityScore(produto, cotacao),
          score_confiabilidade: this.calculateReliabilityScore(cotacao),
          pontos_fortes: this.identifyStrengths(produto, cotacao),
          pontos_fracos: this.identifyWeaknesses(produto, cotacao)
        });
      });
    });

    const produtos = Array.from(produtosAgrupados.values());

    return {
      produtos,
      resumo: {
        total_produtos: produtos.length,
        total_fornecedores: new Set(cotacoes.map(c => c.fornecedor)).size,
        economia_potencial: this.calculatePotentialSavings(produtos),
        economia_percentual: this.calculateSavingsPercentage(produtos),
        recomendacoes_gerais: this.generateGeneralRecommendations(produtos),
        alertas: this.generateAlerts(cotacoes),
        melhor_custo_beneficio: this.identifyBestValueOptions(produtos)
      },
      analise_detalhada: {
        pontos_atencao: this.identifyAttentionPoints(cotacoes),
        oportunidades: this.identifyOpportunities(produtos),
        riscos_identificados: this.identifyRisks(cotacoes),
        sugestoes_negociacao: this.generateNegotiationSuggestions(produtos)
      }
    };
  }

  private parsePrazoToDays(prazo: string): number {
    const prazoLower = prazo.toLowerCase();
    
    if (prazoLower.includes('dia')) {
      const match = prazoLower.match(/(\d+)\s*dias?/);
      return match ? parseInt(match[1]) : 7;
    }
    
    if (prazoLower.includes('semana')) {
      const match = prazoLower.match(/(\d+)\s*semanas?/);
      return match ? parseInt(match[1]) * 7 : 7;
    }
    
    if (prazoLower.includes('mês') || prazoLower.includes('mes')) {
      const match = prazoLower.match(/(\d+)\s*m[eê]s/);
      return match ? parseInt(match[1]) * 30 : 30;
    }
    
    return 7; // Default
  }

  private checkIncompleteData(produto: any, cotacao: ExtractedCotacao): boolean {
    return !produto.preco_unitario || 
           !produto.quantidade || 
           cotacao.prazo_entrega === 'Não informado' ||
           cotacao.condicao_pagamento === 'Não informado';
  }

  private calculateQualityScore(produto: any, cotacao: ExtractedCotacao): number {
    let score = 7; // Base score
    
    // Increase score for complete information
    if (produto.preco_unitario && produto.quantidade) score += 1;
    if (cotacao.prazo_entrega !== 'Não informado') score += 0.5;
    if (cotacao.condicao_pagamento !== 'Não informado') score += 0.5;
    if (produto.observacoes || cotacao.observacoes) score += 0.5;
    if (cotacao.confidence > 90) score += 0.5;
    
    return Math.min(10, Math.max(1, score));
  }

  private calculateReliabilityScore(cotacao: ExtractedCotacao): number {
    let score = 7; // Base score
    
    // Increase score based on confidence and completeness
    if (cotacao.confidence > 95) score += 1.5;
    else if (cotacao.confidence > 85) score += 1;
    else if (cotacao.confidence > 70) score += 0.5;
    
    if (cotacao.produtos.length > 1) score += 0.5; // Multiple products show detailed quote
    if (cotacao.raw_message.length > 100) score += 0.5; // Detailed message
    
    return Math.min(10, Math.max(1, score));
  }

  private identifyStrengths(produto: any, cotacao: ExtractedCotacao): string[] {
    const strengths: string[] = [];
    
    if (cotacao.confidence > 90) strengths.push('Informações claras e precisas');
    if (produto.observacoes) strengths.push('Detalhes técnicos fornecidos');
    if (cotacao.condicao_pagamento.includes('vista')) strengths.push('Opção de pagamento à vista');
    if (cotacao.prazo_entrega.includes('rápid') || cotacao.prazo_entrega.includes('express')) {
      strengths.push('Entrega rápida');
    }
    if (cotacao.raw_message.includes('garantia')) strengths.push('Garantia mencionada');
    if (cotacao.raw_message.includes('frete')) strengths.push('Informações sobre frete');
    
    return strengths;
  }

  private identifyWeaknesses(produto: any, cotacao: ExtractedCotacao): string[] {
    const weaknesses: string[] = [];
    
    if (cotacao.confidence < 70) weaknesses.push('Informações pouco claras');
    if (!produto.preco_unitario) weaknesses.push('Preço unitário não especificado');
    if (cotacao.prazo_entrega === 'Não informado') weaknesses.push('Prazo de entrega não informado');
    if (cotacao.condicao_pagamento === 'Não informado') weaknesses.push('Condições de pagamento não especificadas');
    if (!produto.observacoes && !cotacao.observacoes) weaknesses.push('Falta de detalhes técnicos');
    
    return weaknesses;
  }

  private calculatePotentialSavings(produtos: any[]): number {
    let totalSavings = 0;
    
    produtos.forEach(produto => {
      if (produto.cotacoes.length > 1) {
        const precos = produto.cotacoes.map((c: any) => c.preco_total);
        const menorPreco = Math.min(...precos);
        const maiorPreco = Math.max(...precos);
        totalSavings += (maiorPreco - menorPreco);
      }
    });
    
    return totalSavings;
  }

  private calculateSavingsPercentage(produtos: any[]): number {
    let totalMaior = 0;
    let totalMenor = 0;
    
    produtos.forEach(produto => {
      if (produto.cotacoes.length > 1) {
        const precos = produto.cotacoes.map((c: any) => c.preco_total);
        totalMaior += Math.max(...precos);
        totalMenor += Math.min(...precos);
      }
    });
    
    return totalMaior > 0 ? ((totalMaior - totalMenor) / totalMaior) * 100 : 0;
  }

  private generateGeneralRecommendations(produtos: any[]): string[] {
    const recommendations: string[] = [];
    
    if (produtos.length > 3) {
      recommendations.push('Considere negociar desconto por volume');
    }
    
    const fornecedoresComMultiplosProdutos = new Map();
    produtos.forEach(produto => {
      produto.cotacoes.forEach((cotacao: any) => {
        const count = fornecedoresComMultiplosProdutos.get(cotacao.fornecedor) || 0;
        fornecedoresComMultiplosProdutos.set(cotacao.fornecedor, count + 1);
      });
    });
    
    const fornecedorPrincipal = Array.from(fornecedoresComMultiplosProdutos.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (fornecedorPrincipal && fornecedorPrincipal[1] > 2) {
      recommendations.push(`Considere consolidar compras com ${fornecedorPrincipal[0]}`);
    }
    
    return recommendations;
  }

  private generateAlerts(cotacoes: ExtractedCotacao[]): string[] {
    const alerts: string[] = [];
    
    const lowConfidenceCotacoes = cotacoes.filter(c => c.confidence < 70);
    if (lowConfidenceCotacoes.length > 0) {
      alerts.push(`${lowConfidenceCotacoes.length} cotação(ões) com informações pouco claras`);
    }
    
    const incompleteCotacoes = cotacoes.filter(c => 
      c.prazo_entrega === 'Não informado' || c.condicao_pagamento === 'Não informado'
    );
    if (incompleteCotacoes.length > 0) {
      alerts.push(`${incompleteCotacoes.length} cotação(ões) com dados incompletos`);
    }
    
    return alerts;
  }

  private identifyBestValueOptions(produtos: any[]): any[] {
    return produtos.map(produto => {
      if (produto.cotacoes.length > 1) {
        const melhorCotacao = produto.cotacoes.reduce((best: any, current: any) => {
          const bestScore = (10 - best.preco_total / 1000) + best.score_qualidade + best.score_confiabilidade;
          const currentScore = (10 - current.preco_total / 1000) + current.score_qualidade + current.score_confiabilidade;
          return currentScore > bestScore ? current : best;
        });
        
        return {
          produto_id: produto.id,
          fornecedor: melhorCotacao.fornecedor,
          motivo: 'Melhor relação custo-benefício considerando preço e qualidade',
          economia: produto.cotacoes.reduce((max: number, c: any) => Math.max(max, c.preco_total), 0) - melhorCotacao.preco_total
        };
      }
      return null;
    }).filter(Boolean);
  }

  private identifyAttentionPoints(cotacoes: ExtractedCotacao[]): string[] {
    const points: string[] = [];
    
    if (cotacoes.some(c => c.confidence < 80)) {
      points.push('Algumas cotações podem ter informações imprecisas');
    }
    
    if (cotacoes.some(c => c.prazo_entrega === 'Não informado')) {
      points.push('Confirmar prazos de entrega com fornecedores');
    }
    
    return points;
  }

  private identifyOpportunities(produtos: any[]): string[] {
    const opportunities: string[] = [];
    
    if (produtos.length > 1) {
      opportunities.push('Possibilidade de negociar pacote completo');
    }
    
    return opportunities;
  }

  private identifyRisks(cotacoes: ExtractedCotacao[]): string[] {
    const risks: string[] = [];
    
    const lowConfidenceCount = cotacoes.filter(c => c.confidence < 70).length;
    if (lowConfidenceCount > 0) {
      risks.push('Informações incompletas podem afetar a decisão');
    }
    
    return risks;
  }

  private generateNegotiationSuggestions(produtos: any[]): string[] {
    const suggestions: string[] = [];
    
    if (produtos.length > 2) {
      suggestions.push('Solicitar desconto por volume');
    }
    
    suggestions.push('Confirmar todas as condições por escrito');
    suggestions.push('Negociar prazos de pagamento mais favoráveis');
    
    return suggestions;
  }
}

export const whatsappCotacoesExtractor = new WhatsAppCotacoesExtractor();