import { AnaliseCompleta, Produto, Cotacao } from '../types';

export const gerarDadosMock = (): AnaliseCompleta => {
  const produtos: Produto[] = [
    {
      id: 'prod_1',
      descricao: 'Cabo HDMI 2.0 - 2 metros',
      quantidade: 100,
      cotacoes: [
        {
          fornecedor: 'TechCorp Distribuidora',
          preco_unitario: 12.50,
          preco_total: 1250.00,
          prazo_entrega_dias: 5,
          condicao_pagamento: '30 dias',
          observacoes: 'Frete incluso, garantia 12 meses'
        },
        {
          fornecedor: 'Eletrônicos Brasil',
          preco_unitario: 11.00,
          preco_total: 1100.00,
          prazo_entrega_dias: 7,
          condicao_pagamento: 'À vista',
          observacoes: 'Desconto 5% para pagamento antecipado'
        },
        {
          fornecedor: 'Conecta Soluções',
          preco_unitario: 13.80,
          preco_total: 1380.00,
          prazo_entrega_dias: 3,
          condicao_pagamento: '15 dias',
          observacoes: 'Entrega expressa, suporte técnico incluso'
        }
      ]
    },
    {
      id: 'prod_2',
      descricao: 'Mouse Óptico USB 1200 DPI',
      quantidade: 50,
      cotacoes: [
        {
          fornecedor: 'TechCorp Distribuidora',
          preco_unitario: 25.90,
          preco_total: 1295.00,
          prazo_entrega_dias: 5,
          condicao_pagamento: '30 dias',
          observacoes: 'Garantia 24 meses, ergonômico'
        },
        {
          fornecedor: 'Eletrônicos Brasil',
          preco_unitario: 22.50,
          preco_total: 1125.00,
          prazo_entrega_dias: 10,
          condicao_pagamento: 'À vista',
          observacoes: 'Modelo básico, sem fio opcional +R$ 5,00',
          dados_incompletos: true
        },
        {
          fornecedor: 'Periféricos Plus',
          preco_unitario: 28.00,
          preco_total: 1400.00,
          prazo_entrega_dias: 2,
          condicao_pagamento: '28 dias',
          observacoes: 'Premium, LED RGB, software incluído'
        }
      ]
    },
    {
      id: 'prod_3',
      descricao: 'Teclado ABNT2 USB',
      quantidade: 75,
      cotacoes: [
        {
          fornecedor: 'TechCorp Distribuidora',
          preco_unitario: 45.00,
          preco_total: 3375.00,
          prazo_entrega_dias: 5,
          condicao_pagamento: '30 dias',
          observacoes: 'Resistente à água, teclas silenciosas'
        },
        {
          fornecedor: 'Conecta Soluções',
          preco_unitario: 38.90,
          preco_total: 2917.50,
          prazo_entrega_dias: 6,
          condicao_pagamento: '15 dias',
          observacoes: 'Compacto, ideal para escritório'
        },
        {
          fornecedor: 'Periféricos Plus',
          preco_unitario: 52.00,
          preco_total: 3900.00,
          prazo_entrega_dias: 1,
          condicao_pagamento: '21 dias',
          observacoes: 'Mecânico, switches Blue, retroiluminado'
        }
      ]
    },
    {
      id: 'prod_4',
      descricao: 'Monitor LED 21.5" Full HD',
      quantidade: 20,
      cotacoes: [
        {
          fornecedor: 'Eletrônicos Brasil',
          preco_unitario: 289.90,
          preco_total: 5798.00,
          prazo_entrega_dias: 12,
          condicao_pagamento: 'À vista',
          observacoes: 'IPS, bordas finas, HDMI + VGA'
        },
        {
          fornecedor: 'Conecta Soluções',
          preco_unitario: 315.00,
          preco_total: 6300.00,
          prazo_entrega_dias: 4,
          condicao_pagamento: '15 dias',
          observacoes: 'Ajuste de altura, pivot, USB hub'
        },
        {
          fornecedor: 'Displays & Cia',
          preco_unitario: 275.00,
          preco_total: 5500.00,
          prazo_entrega_dias: 8,
          condicao_pagamento: '45 dias',
          observacoes: 'Certificado ENERGY STAR, garantia 3 anos'
        }
      ]
    }
  ];

  const analise: AnaliseCompleta = {
    id: 'analise_001',
    nome_analise: 'Cotação Equipamentos de TI - Dezembro 2024',
    data_criacao: new Date().toISOString(),
    produtos,
    total_fornecedores: 5,
    melhor_custo_beneficio: [
      {
        produto_id: 'prod_1',
        fornecedor: 'Eletrônicos Brasil',
        motivo: 'Melhor preço unitário com desconto para pagamento à vista'
      },
      {
        produto_id: 'prod_3',
        fornecedor: 'Conecta Soluções',
        motivo: 'Ótimo custo-benefício com prazo de pagamento flexível'
      },
      {
        produto_id: 'prod_4',
        fornecedor: 'Displays & Cia',
        motivo: 'Menor preço com maior prazo de pagamento e melhor garantia'
      }
    ]
  };

  return analise;
};