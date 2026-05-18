import React from "react";

const OsunhiveLogo = () => (
  <svg width="70" height="70" viewBox="0 0 100 100" fill="none">
    <path d="M50 5L90 27.5V72.5L50 95L10 72.5V27.5L50 5Z" fill="#F97316"/>
    <path d="M50 35L70 50L50 65L30 50L50 35Z" fill="white"/>
    <path d="M50 50L70 65L50 80L30 65L50 50Z" fill="white" fillOpacity="0.8"/>
  </svg>
);

interface Props {
  onSelected: () => void;
}

const KeySelection: React.FC<Props> = ({ onSelected }) => {

  const openWebsite = () => {
    window.open("https://www.osunhive.name.ng","_blank");
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 text-white">

      <div className="max-w-xl w-full bg-gray-900 rounded-3xl p-10 shadow-2xl border border-orange-500/20 text-center">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <OsunhiveLogo/>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold mb-4">
          Osunhive AI
        </h1>

        {/* Subtitle */}
        <p className="text-gray-400 mb-8 text-sm leading-relaxed">
          AI Creative Studio built for modern creators.  
          Generate viral content ideas, scripts and automation tools
          for YouTube, TikTok and Facebook.
        </p>

        {/* CTA Buttons */}
        <div className="space-y-4">

          <button
            onClick={onSelected}
            className="w-full py-4 bg-orange-600 hover:bg-orange-500 transition rounded-xl font-bold uppercase text-sm tracking-widest shadow-lg"
          >
            Start Using Osunhive
          </button>

          <button
            onClick={openWebsite}
            className="w-full py-4 bg-white/10 hover:bg-white/20 transition rounded-xl font-bold uppercase text-sm tracking-widest"
          >
            Visit Official Website
          </button>

        </div>

        {/* Features */}
        <div className="mt-10 text-left">

          <h2 className="text-lg font-semibold mb-4 text-white">
            What Osunhive Can Do
          </h2>

          <ul className="space-y-2 text-gray-400 text-sm list-disc list-inside">
            <li>Create TikTok viral content ideas</li>
            <li>Generate YouTube video scripts</li>
            <li>Automate Facebook post creation</li>
            <li>Build AI powered creative projects</li>
            <li>Boost productivity for content creators</li>
          </ul>

        </div>

        {/* Social Media */}
        <div className="mt-10 border-t border-gray-800 pt-6">

          <p className="text-xs text-gray-500 mb-4 uppercase tracking-widest">
            Join The Community
          </p>

          <div className="grid grid-cols-2 gap-3">

            <a
              href="https://www.facebook.com/osunhive.name.ng"
              target="_blank"
              rel="noreferrer"
              className="bg-gray-800 hover:bg-gray-700 rounded-lg py-3 text-blue-400 font-bold text-sm text-center"
            >
              Facebook
            </a>

            <a
              href="https://t.me/Osunhive"
              target="_blank"
              rel="noreferrer"
              className="bg-gray-800 hover:bg-gray-700 rounded-lg py-3 text-cyan-400 font-bold text-sm text-center"
            >
              Telegram
            </a>

            <a
              href="https://youtube.com/@osunhive_official"
              target="_blank"
              rel="noreferrer"
              className="bg-gray-800 hover:bg-gray-700 rounded-lg py-3 text-red-500 font-bold text-sm text-center"
            >
              YouTube
            </a>

            <a
              href="https://wa.me/2349076129380"
              target="_blank"
              rel="noreferrer"
              className="bg-gray-800 hover:bg-gray-700 rounded-lg py-3 text-green-500 font-bold text-sm text-center"
            >
              WhatsApp
            </a>

          </div>

        </div>

        {/* Footer */}
        <div className="mt-10 text-xs text-gray-600 uppercase tracking-widest">
          Developed by <span className="text-white">Olajide Sherif Oyinlola</span>
        </div>

      </div>

    </div>
  );
};

export default KeySelection;
