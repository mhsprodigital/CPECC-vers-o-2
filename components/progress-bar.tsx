import React from 'react';

interface ProgressBarProps {
  status: string;
}

export default function ProgressBar({ status }: ProgressBarProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'Rascunho':
        return { color: 'bg-gray-400', width: 'w-1/4', text: 'Rascunho' };
      case 'Em Análise':
        return { color: 'bg-blue-500', width: 'w-2/4', text: 'Em Análise' };
      case 'Pendência':
        return { color: 'bg-yellow-500', width: 'w-3/4', text: 'Pendência' };
      case 'Aprovado':
        return { color: 'bg-green-500', width: 'w-full', text: 'Aprovado' };
      default:
        return { color: 'bg-gray-200', width: 'w-0', text: status };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="w-full mt-3">
      <div className="flex justify-between text-xs text-on-surface-variant mb-1 font-medium">
        <span>Progresso</span>
        <span className={config.color.replace('bg-', 'text-')}>{config.text}</span>
      </div>
      <div className="w-full bg-surface-container-low rounded-full h-2 overflow-hidden">
        <div 
          className={`${config.color} ${config.width} h-2 rounded-full transition-all duration-500 ease-in-out`}
        ></div>
      </div>
    </div>
  );
}
