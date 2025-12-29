
import React from 'react';

const OsunhiveLogo = () => (
  <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 5L90 27.5V72.5L50 95L10 72.5V27.5L50 5Z" fill="#F97316" />
    <path d="M50 35L70 50L50 65L30 50L50 35Z" fill="white" />
    <path d="M50 50L70 65L50 80L30 65L50 50Z" fill="white" fillOpacity="0.8" />
  </svg>
);

interface Props {
  onSelected: () => void;
}

const KeySelection: React.FC<Props> = ({ onSelected }) => {
  const handleOpenKeySelection = async () => {
    try {
      await window.aistudio.openSelectKey();
      onSelected();
    } catch (error) {
      console.error("Failed to open key selection:", error);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-950 p-6">
      <div className="max-w-md w-full glass-panel rounded-3xl p-10 text-center border-orange-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
        
        <div className="flex justify-center mb-6">
          <OsunhiveLogo />
        </div>
        
        <h1 className="text-3xl font-bold font-display mb-4 text-white">osunhive.name.ng</h1>
        <p className="text-gray-400 mb-8 text-sm leading-relaxed px-2">
          Multimodal Creative Studio. Access free-tier Gemini models or connect a paid key for Veo Video Generation.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={handleOpenKeySelection}
            className="w-full py-4 bg-orange-600 hover:bg-orange-500 transition-all rounded-xl font-black uppercase text-xs tracking-widest text-white shadow-lg shadow-orange-500/20"
          >
            Support Osunhive (Donate)
          </button>

          <div className="text-[9px] text-gray-500 mt-2 px-2 font-mono uppercase tracking-tighter">
            Osunhive is community-powered. Support development and receive updates, perks, and announcements via our Telegram channel.
            Note: Pro models (Veo) require an API key from a paid GCP project. 
            <a href="https://www.osunhive.name.ng" target="_blank" rel="noreferrer" className="text-orange-400 hover:underline ml-1">
              Get Paid API Key 
            </a>.
          </div>
          
          <button
            onClick={onSelected}
            className="w-full py-4 bg-white/5 hover:bg-white/10 transition-all rounded-xl font-black uppercase text-xs tracking-widest text-gray-300 border border-white/5"
          >
            Use Free Models Only
          </button>
          
          <div className="pt-8 border-t border-white/5">
             <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-4">Official Support Channels</p>
             <div className="grid grid-cols-2 gap-3">
                <a href="https://t.me/Osunhive" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-2.5 bg-gray-900 rounded-lg text-[10px] font-bold text-orange-400 hover:bg-gray-800 transition-all border border-white/5">
                  <i className="fab fa-telegram"></i> Telegram
                </a>
                <a href="https://wa.me/2349076129380" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-2.5 bg-gray-900 rounded-lg text-[10px] font-bold text-green-500 hover:bg-gray-800 transition-all border border-white/5">
                  <i className="fab fa-whatsapp"></i> WhatsApp
                </a>
                <a href="https://youtube.com/@osunhiveofficial" target="_blank" rel="noreferrer" className="col-span-2 flex items-center justify-center gap-2 py-2.5 bg-gray-900 rounded-lg text-[10px] font-bold text-red-500 hover:bg-gray-800 transition-all border border-white/5">
                  <i className="fab fa-youtube"></i> YouTube @osunhiveofficial
                </a>
             </div>
          </div>
        </div>
        
        <div className="mt-10 pt-6">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-black">Developed by <span className="text-white">Olajide Sherif Oyinlola</span></p>
        </div>
      </div>
    </div>
  );
};

export default KeySelection;
          
