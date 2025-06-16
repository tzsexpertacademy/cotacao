import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { DocumentoUpload } from '../types';

interface UploadAreaProps {
  onDocumentosUpload: (documentos: DocumentoUpload[]) => void;
  documentos: DocumentoUpload[];
}

export const UploadArea: React.FC<UploadAreaProps> = ({ onDocumentosUpload, documentos }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processarArquivos(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processarArquivos(Array.from(e.target.files));
    }
  }, []);

  const processarArquivos = (arquivos: File[]) => {
    const novosDocumentos: DocumentoUpload[] = arquivos.map((arquivo, index) => ({
      id: `doc_${Date.now()}_${index}`,
      nome: arquivo.name,
      tipo: arquivo.type,
      tamanho: arquivo.size,
      status: 'pendente',
      progresso: 0
    }));

    onDocumentosUpload([...documentos, ...novosDocumentos]);
    
    // Simular processamento
    novosDocumentos.forEach((doc, index) => {
      setTimeout(() => {
        simularProcessamento(doc.id);
      }, index * 500);
    });
  };

  const simularProcessamento = (docId: string) => {
    const atualizarStatus = (status: DocumentoUpload['status'], progresso: number) => {
      onDocumentosUpload(docs => 
        docs.map(doc => 
          doc.id === docId ? { ...doc, status, progresso } : doc
        )
      );
    };

    atualizarStatus('processando', 0);
    
    const intervalos = [20, 40, 60, 80, 100];
    intervalos.forEach((progresso, index) => {
      setTimeout(() => {
        if (progresso === 100) {
          atualizarStatus('concluido', progresso);
        } else {
          atualizarStatus('processando', progresso);
        }
      }, (index + 1) * 800);
    });
  };

  const removerDocumento = (docId: string) => {
    onDocumentosUpload(docs => docs.filter(doc => doc.id !== docId));
  };

  const getStatusIcon = (status: DocumentoUpload['status']) => {
    switch (status) {
      case 'concluido':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'erro':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'processando':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatarTamanho = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-blue-100 rounded-full">
            <Upload className="w-8 h-8 text-blue-600" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Envie suas cotações
            </h3>
            <p className="text-gray-600 mb-4">
              Arraste e solte os arquivos aqui ou clique para selecionar
            </p>
            <p className="text-sm text-gray-500">
              Suporte para PDF, Word, Excel e arquivos de texto
            </p>
          </div>
        </div>
      </div>

      {documentos.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-lg font-medium text-gray-900">
            Documentos Enviados ({documentos.length})
          </h4>
          
          {documentos.map((doc) => (
            <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  {getStatusIcon(doc.status)}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.nome}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatarTamanho(doc.tamanho)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {doc.status === 'processando' && (
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${doc.progresso}%` }}
                      />
                    </div>
                  )}
                  
                  <button
                    onClick={() => removerDocumento(doc.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};