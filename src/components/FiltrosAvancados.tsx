import React, { useState } from 'react';
import { Filter, Search, Calendar, DollarSign, Clock, Star, Tag, X, RefreshCw } from 'lucide-react';

interface FiltrosAvancadosProps {
  filtros: any;
  onFiltrosChange: (filtros: any) => void;
  categorias?: string[];
  fornecedores?: string[];
  tags?: string[];
  showAdvanced?: boolean;
}

export const FiltrosAvancados: React.FC<FiltrosAvancadosProps> = ({
  filtros,
  onFiltrosChange,
  categorias = [],
  fornecedores = [],
  tags = [],
  showAdvanced = true
}) => {
  const [expandido, setExpandido] = useState(false);

  const resetarFiltros = () => {
    onFiltrosChange({
      busca: '',
      categoria: '',
      fornecedor: '',
      prioridade: '',
      status: '',
      faixaPreco: { min: 0, max: 100000 },
      dataInicio: '',
      dataFim: '',
      ordenarPor: 'economia',
      ordem: 'desc',
      mostrarApenas: 'todos',
      tags: [],
      scoreMinimo: 0,
      prazoMaximo: 365
    });
  };

  const adicionarTag = (tag: string) => {
    const tagsAtuais = filtros.tags || [];
    if (!tagsAtuais.includes(tag)) {
      onFiltrosChange({
        ...filtros,
        tags: [...tagsAtuais, tag]
      });
    }
  };

  const removerTag = (tag: string) => {
    const tagsAtuais = filtros.tags || [];
    onFiltrosChange({
      ...filtros,
      tags: tagsAtuais.filter((t: string) => t !== tag)
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filtros Avançados</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={resetarFiltros}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Limpar</span>
          </button>
          {showAdvanced && (
            <button
              onClick={() => setExpandido(!expandido)}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
            >
              {expandido ? 'Menos filtros' : 'Mais filtros'}
            </button>
          )}
        </div>
      </div>

      {/* Filtros Básicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Search className="w-4 h-4 inline mr-1" />
            Buscar
          </label>
          <input
            type="text"
            value={filtros.busca || ''}
            onChange={(e) => onFiltrosChange({...filtros, busca: e.target.value})}
            placeholder="Produto, fornecedor..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Tag className="w-4 h-4 inline mr-1" />
            Categoria
          </label>
          <select
            value={filtros.categoria || ''}
            onChange={(e) => onFiltrosChange({...filtros, categoria: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas as categorias</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fornecedor</label>
          <select
            value={filtros.fornecedor || ''}
            onChange={(e) => onFiltrosChange({...filtros, fornecedor: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos os fornecedores</option>
            {fornecedores.map(forn => (
              <option key={forn} value={forn}>{forn}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Ordenar por</label>
          <select
            value={filtros.ordenarPor || 'economia'}
            onChange={(e) => onFiltrosChange({...filtros, ordenarPor: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="economia">Maior Economia</option>
            <option value="preco">Menor Preço</option>
            <option value="prazo">Menor Prazo</option>
            <option value="qualidade">Maior Qualidade</option>
            <option value="data">Mais Recente</option>
            <option value="alfabetico">Alfabético</option>
          </select>
        </div>
      </div>

      {/* Filtros Avançados */}
      {expandido && showAdvanced && (
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Faixa de Preço
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={filtros.faixaPreco?.min || 0}
                  onChange={(e) => onFiltrosChange({
                    ...filtros, 
                    faixaPreco: {...(filtros.faixaPreco || {}), min: Number(e.target.value)}
                  })}
                  placeholder="Mín"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="number"
                  value={filtros.faixaPreco?.max || 100000}
                  onChange={(e) => onFiltrosChange({
                    ...filtros, 
                    faixaPreco: {...(filtros.faixaPreco || {}), max: Number(e.target.value)}
                  })}
                  placeholder="Máx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Período
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={filtros.dataInicio || ''}
                  onChange={(e) => onFiltrosChange({...filtros, dataInicio: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="date"
                  value={filtros.dataFim || ''}
                  onChange={(e) => onFiltrosChange({...filtros, dataFim: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Star className="w-4 h-4 inline mr-1" />
                Score Mínimo
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={filtros.scoreMinimo || 0}
                onChange={(e) => onFiltrosChange({...filtros, scoreMinimo: Number(e.target.value)})}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0</span>
                <span className="font-medium">{filtros.scoreMinimo || 0}</span>
                <span>10</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Prazo Máximo (dias)
              </label>
              <input
                type="number"
                value={filtros.prazoMaximo || 365}
                onChange={(e) => onFiltrosChange({...filtros, prazoMaximo: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
              <select
                value={filtros.prioridade || ''}
                onChange={(e) => onFiltrosChange({...filtros, prioridade: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas as prioridades</option>
                <option value="urgente">Urgente</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filtros.status || ''}
                onChange={(e) => onFiltrosChange({...filtros, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="aprovado">Aprovado</option>
                <option value="rejeitado">Rejeitado</option>
                <option value="solicitado">Solicitado</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags Disponíveis</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => adicionarTag(tag)}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      (filtros.tags || []).includes(tag)
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              
              {(filtros.tags || []).length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Tags Selecionadas:</p>
                  <div className="flex flex-wrap gap-2">
                    {(filtros.tags || []).map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                      >
                        {tag}
                        <button
                          onClick={() => removerTag(tag)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Opções de Exibição */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Opções de Exibição</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="mostrarApenas"
                  value="todos"
                  checked={(filtros.mostrarApenas || 'todos') === 'todos'}
                  onChange={(e) => onFiltrosChange({...filtros, mostrarApenas: e.target.value})}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Mostrar todos os itens</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="mostrarApenas"
                  value="recomendados"
                  checked={filtros.mostrarApenas === 'recomendados'}
                  onChange={(e) => onFiltrosChange({...filtros, mostrarApenas: e.target.value})}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Apenas recomendados pela IA</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="mostrarApenas"
                  value="economia"
                  checked={filtros.mostrarApenas === 'economia'}
                  onChange={(e) => onFiltrosChange({...filtros, mostrarApenas: e.target.value})}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Apenas com economia significativa</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="mostrarApenas"
                  value="alta-qualidade"
                  checked={filtros.mostrarApenas === 'alta-qualidade'}
                  onChange={(e) => onFiltrosChange({...filtros, mostrarApenas: e.target.value})}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Apenas alta qualidade (score ≥ 8)</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Resumo dos Filtros Ativos */}
      {Object.values(filtros).some(value => 
        value && value !== '' && value !== 'todos' && 
        !(Array.isArray(value) && value.length === 0) &&
        !(typeof value === 'object' && value.min === 0 && value.max === 100000)
      ) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Filtros Ativos:</p>
          <div className="flex flex-wrap gap-2">
            {filtros.busca && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                Busca: "{filtros.busca}"
                <button onClick={() => onFiltrosChange({...filtros, busca: ''})} className="ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filtros.categoria && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                Categoria: {filtros.categoria}
                <button onClick={() => onFiltrosChange({...filtros, categoria: ''})} className="ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filtros.fornecedor && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                Fornecedor: {filtros.fornecedor}
                <button onClick={() => onFiltrosChange({...filtros, fornecedor: ''})} className="ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filtros.prioridade && (
              <span className="inline-flex items-center px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                Prioridade: {filtros.prioridade}
                <button onClick={() => onFiltrosChange({...filtros, prioridade: ''})} className="ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};