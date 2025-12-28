
import React, { useState, useEffect } from 'react';
import { AppState } from './types';
import VideoGenerator from './components/VideoGenerator';
import KeySelection from './components/KeySelection';

// Extend window for AI Studio helpers
declare global {
  /* Fix: Define AIStudio interface to match the environment's pre-existing window.aistudio declaration */
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // Fix: Added readonly modifier to match the pre-existing global declaration of aistudio and avoid identical modifier error
    readonly aistudio: AIStudio;
  }
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.KEY_SELECTION);

  useEffect(() => {
    const checkKey = async () => {
      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) {
          setAppState(AppState.GENERATOR);
        }
      } catch (error) {
        console.error("Error checking API key status:", error);
      }
    };
    checkKey();
  }, []);

  const handleKeySelected = () => {
    setAppState(AppState.GENERATOR);
  };

  const handleKeyError = () => {
    setAppState(AppState.KEY_SELECTION);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {appState === AppState.KEY_SELECTION ? (
        <KeySelection onSelected={handleKeySelected} />
      ) : (
        <VideoGenerator onKeyError={handleKeyError} />
      )}
    </div>
  );
};

export default App;
