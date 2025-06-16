import * as XLSX from 'xlsx';

export class DocumentProcessor {
  async processFile(file: File): Promise<string> {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    try {
      if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return await this.processPDF(file);
      } else if (fileType.includes('sheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        return await this.processExcel(file);
      } else if (fileType.includes('document') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        return await this.processWord(file);
      } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
        return await this.processText(file);
      } else {
        throw new Error('Tipo de arquivo não suportado');
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      throw new Error(`Falha ao processar ${file.name}: ${error}`);
    }
  }

  private async processPDF(file: File): Promise<string> {
    // Simulação de extração de PDF (em produção usaria pdf-parse)
    const text = await this.fileToText(file);
    return `Conteúdo extraído do PDF ${file.name}:\n\n${text}`;
  }

  private async processExcel(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          let content = `Conteúdo extraído do Excel ${file.name}:\n\n`;
          
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            content += `Planilha: ${sheetName}\n`;
            jsonData.forEach((row: any, index) => {
              if (row.length > 0) {
                content += `Linha ${index + 1}: ${row.join(' | ')}\n`;
              }
            });
            content += '\n';
          });
          
          resolve(content);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo Excel'));
      reader.readAsArrayBuffer(file);
    });
  }

  private async processWord(file: File): Promise<string> {
    // Simulação de extração de Word (em produção usaria mammoth)
    const text = await this.fileToText(file);
    return `Conteúdo extraído do Word ${file.name}:\n\n${text}`;
  }

  private async processText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(`Conteúdo do arquivo ${file.name}:\n\n${content}`);
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo de texto'));
      reader.readAsText(file, 'utf-8');
    });
  }

  private async fileToText(file: File): Promise<string> {
    // Simulação básica - em produção usaria bibliotecas específicas
    return `[Simulação] Conteúdo extraído de ${file.name}
    
COTAÇÃO DE PRODUTOS - EXEMPLO
================================

Fornecedor: TechCorp Distribuidora
Data: ${new Date().toLocaleDateString()}

ITEM 1: Cabo HDMI 2.0 - 2 metros
Quantidade: 100 unidades
Preço unitário: R$ 12,50
Preço total: R$ 1.250,00
Prazo de entrega: 5 dias úteis
Condições: 30 dias para pagamento
Observações: Frete incluso, garantia 12 meses

ITEM 2: Mouse Óptico USB 1200 DPI
Quantidade: 50 unidades
Preço unitário: R$ 25,90
Preço total: R$ 1.295,00
Prazo de entrega: 5 dias úteis
Condições: 30 dias para pagamento
Observações: Garantia 24 meses, ergonômico

Total Geral: R$ 2.545,00
Validade da proposta: 15 dias`;
  }
}

export const documentProcessor = new DocumentProcessor();