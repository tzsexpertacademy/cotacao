export interface Cotacao {
  fornecedor: string;
  preco_unitario: number;
  preco_total: number;
  prazo_entrega_dias: number;
  condicao_pagamento: string;
  observacoes: string;
  dados_incompletos?: boolean;
}

export interface Produto {
  id: string;
  descricao: string;
  quantidade: number;
  cotacoes: Cotacao[];
}

export interface AnaliseCompleta {
  id: string;
  nome_analise: string;
  data_criacao: string;
  produtos: Produto[];
  total_fornecedores: number;
  melhor_custo_beneficio?: {
    produto_id: string;
    fornecedor: string;
    motivo: string;
  }[];
}

export interface DocumentoUpload {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  status: 'pendente' | 'processando' | 'concluido' | 'erro';
  progresso: number;
}

export interface FiltrosComparacao {
  ordenar_por: 'preco' | 'prazo' | 'condicao_pagamento';
  mostrar_apenas_completos: boolean;
  fornecedores_selecionados: string[];
}