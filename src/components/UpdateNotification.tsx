import { useState, type FC } from 'react';
import type { UpdateResult } from '../utils/update';
import { APK_PAGES_URL, downloadAndInstall, openDownloadsFolder } from '../utils/update';

interface Props {
  update: UpdateResult;
  dlState: 'idle' | 'downloading' | 'done';
  onIgnore: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
  onDownloadStart: () => void;
}

const UpdateNotification: FC<Props> = ({ update, dlState, onIgnore, onSnooze, onDismiss, onDownloadStart }) => {
  const [showModal, setShowModal] = useState(false);

  const apkUrl = update.downloadUrl ?? APK_PAGES_URL;

  const handleDownload = async () => {
    setShowModal(false);
    onDownloadStart();
    await downloadAndInstall(apkUrl);
  };

  const handleOpenDownloads = async () => {
    await openDownloadsFolder();
    onDismiss();
  };

  const modalBox = "bg-dark-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-dark-600 flex flex-col max-h-[85vh]";
  const backdrop = "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4";

  return (
    <>
      {/* Floating indicator — solo quando in attesa */}
      {dlState === 'idle' && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed bottom-24 right-4 z-30 w-12 h-12 flex items-center justify-center"
          aria-label="Aggiornamento disponibile"
        >
          <span className="absolute w-full h-full rounded-full bg-accent-green/25 animate-ping" />
          <span className="absolute w-full h-full rounded-full bg-accent-green/15 border border-accent-green/40" />
          <svg className="relative z-10 w-5 h-5 text-accent-green drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      )}

      {/* Banner di stato — stessa grafica del SettingsTab */}
      {dlState !== 'idle' && (
        <div className={`fixed bottom-24 left-4 right-4 z-30 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 shadow-xl ${
          dlState === 'done'
            ? 'bg-dark-800 border border-accent-green/30'
            : 'bg-dark-800 border border-accent-blue/30'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            {dlState === 'downloading' ? (
              <svg className="w-4 h-4 text-accent-blue flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <span className="text-accent-green text-sm flex-shrink-0">✓</span>
            )}
            <p className="text-xs text-gray-300 truncate">
              {dlState === 'downloading' ? 'Download in corso…' : 'Download completato'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={handleOpenDownloads}
              className="text-xs text-accent-blue underline underline-offset-2 whitespace-nowrap"
            >
              📁 Apri Download
            </button>
            {dlState === 'done' && (
              <button onClick={onDismiss} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
            )}
          </div>
        </div>
      )}

      {/* Modal aggiornamento disponibile */}
      {showModal && dlState === 'idle' && (
        <div className={backdrop} onClick={() => { setShowModal(false); onSnooze(); }}>
          <div className={modalBox} onClick={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-accent-green/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </span>
                <h2 className="text-white font-bold text-base">Aggiornamento disponibile</h2>
              </div>
              <button onClick={() => { setShowModal(false); onSnooze(); }} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-white font-medium">CryptoSentinel</p>
                <p className="text-xs text-gray-500 mt-0.5">{update.releaseDate}</p>
              </div>
              <span className="text-xs font-semibold text-accent-blue bg-accent-blue/10 px-2.5 py-1 rounded-full flex-shrink-0">
                Disponibile
              </span>
            </div>

            {(update.releaseName ?? update.buildNumber) && (
              <div className="bg-accent-blue/10 border border-accent-blue/20 rounded-lg px-3 py-2 flex items-center justify-between mb-3">
                <p className="text-xs text-gray-300 truncate">
                  {update.releaseName ?? 'Nuova versione'}
                </p>
                {update.buildNumber && (
                  <span className="text-xs text-gray-400 font-mono ml-2 flex-shrink-0">#{update.buildNumber}</span>
                )}
              </div>
            )}

            {update.releaseNotes && (
              <div className="mb-4 flex flex-col min-h-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex-shrink-0">Note di rilascio</p>
                <div className="overflow-y-auto max-h-40 overscroll-contain">
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{update.releaseNotes}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleDownload}
              className="w-full py-2.5 bg-accent-green text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity mb-3"
            >
              Scarica e installa
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowModal(false); onIgnore(); }}
                className="flex-1 py-2 rounded-xl text-xs text-gray-500 hover:text-gray-300 transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                Ignora
              </button>
              <button
                onClick={() => { setShowModal(false); onSnooze(); }}
                className="flex-1 py-2 bg-dark-700 text-gray-300 text-sm rounded-xl hover:bg-dark-600 transition-colors"
              >
                Dopo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UpdateNotification;
