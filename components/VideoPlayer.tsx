
import React from 'react';
import { AspectRatio } from '../types';

interface Props {
  url: string;
  aspectRatio: AspectRatio;
}

const VideoPlayer: React.FC<Props> = ({ url, aspectRatio }) => {
  const containerStyle = aspectRatio === "9:16" 
    ? { aspectRatio: '9/16', maxHeight: '80vh' } 
    : { aspectRatio: '16/9', width: '100%' };

  return (
    <div className="flex flex-col items-center w-full animate-in zoom-in duration-500">
      <div 
        className="relative bg-gray-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl neon-glow flex items-center justify-center"
        style={containerStyle}
      >
        <video 
          src={url} 
          controls 
          autoPlay 
          loop 
          className="w-full h-full object-cover"
        />
        
        <div className="absolute top-4 right-4 flex space-x-2">
          <a 
            href={url} 
            download="Osunhive-ai-video.mp4"
            className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-blue-600 transition-all text-white border border-white/10"
            title="Download Video"
          >
            <i className="fas fa-download"></i>
          </a>
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <h4 className="text-lg font-display font-bold text-white mb-2">Generation Complete</h4>
        <p className="text-sm text-gray-500">Video rendered in {aspectRatio} format. Use the button to download.</p>
      </div>
    </div>
  );
};

export default VideoPlayer;
