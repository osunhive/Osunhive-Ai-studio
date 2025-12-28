
import React from 'react';
import { GenerationStatus } from '../types';

interface Props { status: GenerationStatus; }

const LoadingState: React.FC<Props> = ({ status }) => {
  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in duration-700">
      <div className="text-center">
        <div className="relative inline-block">
          <div className="w-24 h-24 border-4 border-orange-500/20 rounded-full animate-ping absolute"></div>
          <div className="w-24 h-24 border-t-4 border-orange-500 rounded-full animate-spin"></div>
        </div>
        <h3 className="mt-8 text-2xl font-display font-bold text-white">Synthesizing Asset</h3>
        <p className="text-orange-400 text-sm font-mono mt-2 animate-pulse uppercase tracking-widest">{status.message}</p>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-xs font-mono text-gray-500 uppercase">
          <span>Processing Power</span>
          <span>{status.progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-white/5">
          <div className="h-full bg-gradient-to-r from-orange-600 to-red-400 transition-all duration-500 ease-out" style={{ width: `${status.progress}%` }}></div>
        </div>
      </div>

      <div className="glass-panel p-4 rounded-xl border-orange-500/20">
        <div className="flex items-start space-x-3">
          <i className="fas fa-microchip text-orange-400 mt-1"></i>
          <p className="text-xs text-gray-400 leading-relaxed">
            Osunhive's neural network is currently rendering your request. High-complexity tasks may require additional cycles. 
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingState;
