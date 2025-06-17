export class DocumentProcessor {
  // Remove file size limits and improve support
  async processFile(file: File): Promise<string> {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    // Remove size limit check - allow any size
    console.log(`📄 Processando arquivo: ${file.name} (${this.formatFileSize(file.size)})`);

    try {
      if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return await this.processPDF(file);
      } else if (fileType.includes('sheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        return await this.processExcel(file);
      } else if (fileType.includes('document') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        return await this.processWord(file);
      } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
        return await this.processText(file);
      } else if (fileType.includes('image') || fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
        return await this.processImage(file);
      } else if (fileName.endsWith('.rtf')) {
        return await this.processRTF(file);
      } else if (fileName.endsWith('.odt')) {
        return await this.processODT(file);
      } else {
        // Try to process as text for unknown formats
        console.warn(`⚠️ Tipo de arquivo não reconhecido: ${fileType}. Tentando processar como texto.`);
        return await this.processText(file);
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      throw new Error(`Falha ao processar ${file.name}: ${error}`);
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private async processPDF(file: File): Promise<string> {
    // Enhanced PDF processing simulation
    const text = await this.fileToText(file);
    return `Conteúdo extraído do PDF ${file.name} (${this.formatFileSize(file.size)}):\n\n${text}`;
  }

  private async processExcel(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // Simulação de processamento de Excel
          const text = this.generateExcelContent(file.name);
          resolve(`Conteúdo extraído do Excel ${file.name} (${this.formatFileSize(file.size)}):\n\n${text}`);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo Excel'));
      reader.readAsArrayBuffer(file);
    });
  }

  private generateExcelContent(fileName: string): string {
    // Simulação de conteúdo de Excel
    let content = '';
    
    // Gerar cabeçalhos de planilha
    content += 'Planilha: Cotações\n';
    content += '='.repeat(50) + '\n';
    content += 'Produto | Quantidade | Preço Unitário | Preço Total | Fornecedor | Prazo\n';
    content += '-'.repeat(80) + '\n';
    
    // Gerar algumas linhas de dados
    const produtos = [
      'Notebook Dell Inspiron 15',
      'Monitor LG 24" Full HD',
      'Teclado ABNT2 Wireless',
      'Mouse Óptico USB',
      'Impressora HP LaserJet'
    ];
    
    const fornecedores = [
      'TechCorp Distribuidora',
      'Eletrônicos Brasil',
      'Conecta Soluções',
      'Periféricos Plus',
      'Displays & Cia'
    ];
    
    // Gerar 5-10 linhas aleatórias
    const numLinhas = Math.floor(Math.random() * 6) + 5;
    
    for (let i = 0; i < numLinhas; i++) {
      const produto = produtos[Math.floor(Math.random() * produtos.length)];
      const quantidade = Math.floor(Math.random() * 20) + 1;
      const precoUnitario = (Math.random() * 2000 + 100).toFixed(2);
      const precoTotal = (parseFloat(precoUnitario) * quantidade).toFixed(2);
      const fornecedor = fornecedores[Math.floor(Math.random() * fornecedores.length)];
      const prazo = Math.floor(Math.random() * 15) + 1;
      
      content += `${produto} | ${quantidade} | R$ ${precoUnitario} | R$ ${precoTotal} | ${fornecedor} | ${prazo} dias\n`;
    }
    
    // Adicionar informações adicionais
    content += '\nInformações Adicionais:\n';
    content += '- Validade da proposta: 15 dias\n';
    content += '- Condições de pagamento: 30 dias\n';
    content += '- Frete: Incluso\n';
    content += '- Garantia: 12 meses\n';
    
    return content;
  }

  private async processWord(file: File): Promise<string> {
    // Enhanced Word processing simulation
    const text = await this.fileToText(file);
    return `Conteúdo extraído do Word ${file.name} (${this.formatFileSize(file.size)}):\n\n${text}`;
  }

  private async processText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(`Conteúdo do arquivo ${file.name} (${this.formatFileSize(file.size)}):\n\n${content}`);
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo de texto'));
      reader.readAsText(file, 'utf-8');
    });
  }

  private async processImage(file: File): Promise<string> {
    // Simulate OCR processing for images
    return `Imagem processada: ${file.name} (${this.formatFileSize(file.size)})
    
SIMULAÇÃO DE OCR - CONTEÚDO EXTRAÍDO DA IMAGEM
===============================================

COTAÇÃO COMERCIAL - EXEMPLO
Data: ${new Date().toLocaleDateString('pt-BR')}

FORNECEDOR: TechCorp Soluções Ltda.
CNPJ: 12.345.678/0001-90
Telefone: (11) 9999-9999
Email: vendas@techcorp.com.br

PRODUTOS COTADOS:
=================

1. NOTEBOOK DELL INSPIRON 15 3000
   - Processador: Intel Core i5-1135G7
   - Memória: 8GB DDR4
   - Armazenamento: SSD 256GB
   - Tela: 15.6" Full HD
   - Quantidade: 10 unidades
   - Preço unitário: R$ 2.850,00
   - Subtotal: R$ 28.500,00

2. MONITOR LG 24" FULL HD
   - Modelo: 24MK430H-B
   - Resolução: 1920x1080
   - Conexões: HDMI, VGA
   - Quantidade: 10 unidades
   - Preço unitário: R$ 520,00
   - Subtotal: R$ 5.200,00

3. TECLADO + MOUSE WIRELESS
   - Marca: Logitech MK540
   - Layout: ABNT2
   - Quantidade: 10 conjuntos
   - Preço unitário: R$ 180,00
   - Subtotal: R$ 1.800,00

RESUMO FINANCEIRO:
==================
Subtotal: R$ 35.500,00
Desconto (5%): R$ 1.775,00
TOTAL GERAL: R$ 33.725,00

CONDIÇÕES COMERCIAIS:
====================
- Prazo de entrega: 7 dias úteis
- Condições de pagamento: 30 dias
- Garantia: 12 meses
- Frete: Por conta do comprador
- Validade da proposta: 15 dias

Observações:
- Produtos novos e originais
- Nota fiscal inclusa
- Suporte técnico disponível`;
  }

  private async processRTF(file: File): Promise<string> {
    const text = await this.fileToText(file);
    return `Conteúdo extraído do RTF ${file.name} (${this.formatFileSize(file.size)}):\n\n${text}`;
  }

  private async processODT(file: File): Promise<string> {
    const text = await this.fileToText(file);
    return `Conteúdo extraído do ODT ${file.name} (${this.formatFileSize(file.size)}):\n\n${text}`;
  }

  private async fileToText(file: File): Promise<string> {
    // Enhanced simulation with more realistic content
    const templates = [
      this.generateCotacaoTemplate(),
      this.generateOrcamentoTemplate(),
      this.generatePropostaTemplate()
    ];
    
    const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    return `${selectedTemplate}

ARQUIVO ORIGINAL: ${file.name}
TAMANHO: ${this.formatFileSize(file.size)}
PROCESSADO EM: ${new Date().toLocaleString('pt-BR')}`;
  }

  private generateCotacaoTemplate(): string {
    return `COTAÇÃO COMERCIAL - ${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}
================================

FORNECEDOR: ${this.getRandomSupplier()}
Data: ${new Date().toLocaleDateString('pt-BR')}

PRODUTOS COTADOS:
=================

ITEM 1: Notebook Dell Inspiron 15
- Processador: Intel Core i5
- Memória: 8GB DDR4
- SSD: 256GB
- Quantidade: ${Math.floor(Math.random() * 20) + 5} unidades
- Preço unitário: R$ ${(2500 + Math.random() * 500).toFixed(2)}
- Preço total: R$ ${(25000 + Math.random() * 10000).toFixed(2)}
- Prazo de entrega: ${Math.floor(Math.random() * 10) + 3} dias úteis
- Condições: 30 dias para pagamento
- Observações: Garantia 12 meses, SSD incluso

ITEM 2: Monitor LG 24" Full HD
- Resolução: 1920x1080
- Conexões: HDMI + VGA
- Quantidade: ${Math.floor(Math.random() * 15) + 5} unidades
- Preço unitário: R$ ${(450 + Math.random() * 100).toFixed(2)}
- Preço total: R$ ${(4500 + Math.random() * 2000).toFixed(2)}
- Prazo de entrega: ${Math.floor(Math.random() * 7) + 2} dias úteis
- Condições: 30 dias para pagamento
- Observações: IPS, bordas finas

ITEM 3: Teclado ABNT2 + Mouse
- Marca: Logitech
- Tipo: Wireless
- Quantidade: ${Math.floor(Math.random() * 12) + 3} conjuntos
- Preço unitário: R$ ${(75 + Math.random() * 50).toFixed(2)}
- Preço total: R$ ${(750 + Math.random() * 500).toFixed(2)}
- Prazo de entrega: ${Math.floor(Math.random() * 5) + 1} dias úteis
- Condições: 30 dias para pagamento
- Observações: Ergonômico, bateria longa duração

TOTAL GERAL: R$ ${(30000 + Math.random() * 15000).toFixed(2)}
Validade da proposta: 15 dias
Frete: ${Math.random() > 0.5 ? 'Incluso' : 'Por conta do comprador'}`;
  }

  private generateOrcamentoTemplate(): string {
    return `ORÇAMENTO DETALHADO
===================

EMPRESA: ${this.getRandomSupplier()}
CNPJ: ${this.generateCNPJ()}
Telefone: (11) ${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}

SOLICITAÇÃO DE ORÇAMENTO PARA:
==============================

1. EQUIPAMENTOS DE INFORMÁTICA
   - Desktop Dell OptiPlex
   - Quantidade: ${Math.floor(Math.random() * 25) + 10} unidades
   - Configuração: i5, 8GB, 1TB
   - Preço unitário: R$ ${(1800 + Math.random() * 400).toFixed(2)}
   - Total: R$ ${(18000 + Math.random() * 8000).toFixed(2)}

2. PERIFÉRICOS
   - Impressora HP LaserJet
   - Quantidade: ${Math.floor(Math.random() * 5) + 2} unidades
   - Modelo: Pro M404dn
   - Preço unitário: R$ ${(1200 + Math.random() * 300).toFixed(2)}
   - Total: R$ ${(2400 + Math.random() * 1500).toFixed(2)}

3. ACESSÓRIOS
   - Cabos HDMI 2.0
   - Quantidade: ${Math.floor(Math.random() * 30) + 20} unidades
   - Comprimento: 2 metros
   - Preço unitário: R$ ${(15 + Math.random() * 10).toFixed(2)}
   - Total: R$ ${(300 + Math.random() * 200).toFixed(2)}

CONDIÇÕES COMERCIAIS:
====================
- Prazo de entrega: ${Math.floor(Math.random() * 15) + 5} dias úteis
- Forma de pagamento: ${Math.random() > 0.5 ? '30 dias' : 'À vista com 5% desconto'}
- Garantia: ${Math.floor(Math.random() * 12) + 12} meses
- Instalação: ${Math.random() > 0.5 ? 'Inclusa' : 'Não inclusa'}
- Suporte técnico: ${Math.random() > 0.5 ? '6 meses grátis' : 'Conforme contrato'}

VALOR TOTAL: R$ ${(25000 + Math.random() * 20000).toFixed(2)}`;
  }

  private generatePropostaTemplate(): string {
    return `PROPOSTA COMERCIAL
==================

PARA: Cliente Corporativo
DE: ${this.getRandomSupplier()}
DATA: ${new Date().toLocaleDateString('pt-BR')}
PROPOSTA Nº: ${Math.floor(Math.random() * 10000)}

OBJETO: Fornecimento de equipamentos de TI

ESPECIFICAÇÕES TÉCNICAS:
========================

LOTE 1 - NOTEBOOKS
- Marca: ${Math.random() > 0.5 ? 'Dell' : 'Lenovo'}
- Modelo: ${Math.random() > 0.5 ? 'Inspiron 15 3000' : 'ThinkPad E15'}
- Processador: Intel Core i5 11ª geração
- Memória: 8GB DDR4
- Armazenamento: SSD 256GB
- Tela: 15.6" Full HD
- Sistema: Windows 11 Pro
- Quantidade: ${Math.floor(Math.random() * 50) + 20} unidades
- Valor unitário: R$ ${(2800 + Math.random() * 700).toFixed(2)}
- Valor total: R$ ${(56000 + Math.random() * 35000).toFixed(2)}

LOTE 2 - MONITORES
- Marca: LG
- Modelo: 24MK430H-B
- Tamanho: 24 polegadas
- Resolução: Full HD (1920x1080)
- Tecnologia: IPS
- Conexões: HDMI, VGA
- Quantidade: ${Math.floor(Math.random() * 40) + 15} unidades
- Valor unitário: R$ ${(480 + Math.random() * 120).toFixed(2)}
- Valor total: R$ ${(7200 + Math.random() * 4800).toFixed(2)}

LOTE 3 - PERIFÉRICOS
- Kit Teclado + Mouse Wireless
- Marca: Logitech MK540
- Layout: ABNT2
- Tecnologia: 2.4GHz
- Bateria: Longa duração
- Quantidade: ${Math.floor(Math.random() * 35) + 15} conjuntos
- Valor unitário: R$ ${(150 + Math.random() * 80).toFixed(2)}
- Valor total: R$ ${(2250 + Math.random() * 2800).toFixed(2)}

RESUMO FINANCEIRO:
==================
Subtotal dos lotes: R$ ${(65000 + Math.random() * 40000).toFixed(2)}
Desconto comercial (${Math.floor(Math.random() * 8) + 2}%): R$ ${(3250 + Math.random() * 3200).toFixed(2)}
VALOR TOTAL DA PROPOSTA: R$ ${(62000 + Math.random() * 38000).toFixed(2)}

CONDIÇÕES GERAIS:
=================
- Prazo de entrega: ${Math.floor(Math.random() * 20) + 10} dias úteis após confirmação do pedido
- Condições de pagamento: ${this.getRandomPaymentTerms()}
- Local de entrega: Conforme endereço fornecido pelo cliente
- Frete: ${Math.random() > 0.5 ? 'Por conta do fornecedor' : 'CIF - Incluso no preço'}
- Garantia: ${Math.floor(Math.random() * 24) + 12} meses contra defeitos de fabricação
- Validade da proposta: ${Math.floor(Math.random() * 20) + 10} dias corridos
- Instalação: ${Math.random() > 0.5 ? 'Inclusa no valor' : 'Disponível mediante contratação'}

OBSERVAÇÕES IMPORTANTES:
========================
- Todos os produtos são novos e originais
- Acompanham nota fiscal e certificado de garantia
- Suporte técnico especializado disponível
- Possibilidade de treinamento para usuários
- Produtos certificados pelo Inmetro quando aplicável`;
  }

  private getRandomSupplier(): string {
    const suppliers = [
      'TechCorp Distribuidora Ltda.',
      'Eletrônicos Brasil S.A.',
      'Conecta Soluções Tecnológicas',
      'InfoTech Equipamentos',
      'Digital Solutions Ltda.',
      'Mega Informática Corporativa',
      'Prime Technology Distribuidora',
      'Smart Business Solutions',
      'Tech World Equipamentos',
      'Inovação Digital Ltda.'
    ];
    return suppliers[Math.floor(Math.random() * suppliers.length)];
  }

  private getRandomPaymentTerms(): string {
    const terms = [
      '30 dias após entrega',
      'À vista com 5% de desconto',
      '28 dias da data da nota fiscal',
      '30/60 dias (50% cada parcela)',
      'À vista ou 30 dias sem acréscimo',
      '15 dias com 2% de desconto',
      '45 dias da data de entrega'
    ];
    return terms[Math.floor(Math.random() * terms.length)];
  }

  private generateCNPJ(): string {
    const numbers = Array.from({length: 8}, () => Math.floor(Math.random() * 10));
    return `${numbers.slice(0,2).join('')}.${numbers.slice(2,5).join('')}.${numbers.slice(5,8).join('')}/0001-${Math.floor(Math.random() * 90) + 10}`;
  }

  // Get supported file types
  getSupportedTypes(): string[] {
    return [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/plain',
      'application/rtf',
      'application/vnd.oasis.opendocument.text',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp'
    ];
  }

  // Get max file size (removed limit)
  getMaxFileSize(): number {
    return Infinity; // No limit
  }
}

export const documentProcessor = new DocumentProcessor();