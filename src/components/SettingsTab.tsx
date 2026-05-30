import type { FC } from 'react';
import { getNotificationPermission, openNotificationSettings } from '../utils/notifications';

const INTERVALS = [
  { label: '30 sec', ms: 30_000 },
  { label: '1 min', ms: 60_000 },
  { label: '5 min', ms: 300_000 },
];

interface Props {
  refreshInterval: number;
  onIntervalChange: (ms: number) => void;
  favoritesCount: number;
  alertsCount: number;
  onClearFavorites: () => void;
  onClearAlerts: () => void;
}

const SettingsTab: FC<Props> = ({
  refreshInterval,
  onIntervalChange,
  favoritesCount,
  alertsCount,
  onClearFavorites,
  onClearAlerts,
}) => {
  const notifPerm = getNotificationPermission();

  const handleClearFavorites = () => {
    if (favoritesCount === 0) return;
    if (confirm(`Rimuovere tutti i ${favoritesCount} preferiti?`)) onClearFavorites();
  };

  const handleClearAlerts = () => {
    if (alertsCount === 0) return;
    if (confirm(`Eliminare tutti i ${alertsCount} allarmi?`)) onClearAlerts();
  };

  return (
    <div className="space-y-5">

      {/* Notifiche */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Notifiche</h2>
        <div className="bg-dark-800 rounded-xl divide-y divide-dark-700">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Stato permesso</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {notifPerm === 'granted' ? 'Notifiche attive' : 'Notifiche bloccate'}
              </p>
            </div>
            {notifPerm === 'granted' ? (
              <span className="text-xs font-semibold text-accent-green bg-accent-green/10 px-2.5 py-1 rounded-full">Attive</span>
            ) : (
              <span className="text-xs font-semibold text-accent-red bg-accent-red/10 px-2.5 py-1 rounded-full">Bloccate</span>
            )}
          </div>
          {notifPerm !== 'granted' && (
            <button
              onClick={openNotificationSettings}
              className="w-full px-4 py-3 flex items-center justify-between text-accent-blue hover:bg-dark-700 transition-colors rounded-b-xl"
            >
              <span className="text-sm">Apri impostazioni telefono</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </section>

      {/* Aggiornamento */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Aggiornamento prezzi</h2>
        <div className="bg-dark-800 rounded-xl px-4 py-3">
          <p className="text-sm text-white mb-3">Intervallo di aggiornamento</p>
          <div className="flex gap-2">
            {INTERVALS.map(({ label, ms }) => (
              <button
                key={ms}
                onClick={() => onIntervalChange(ms)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  refreshInterval === ms
                    ? 'bg-accent-blue text-white'
                    : 'bg-dark-700 text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Cancella dati */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Dati</h2>
        <div className="bg-dark-800 rounded-xl divide-y divide-dark-700">
          <button
            onClick={handleClearFavorites}
            disabled={favoritesCount === 0}
            className="w-full px-4 py-3 flex items-center justify-between disabled:opacity-40 hover:bg-dark-700 transition-colors rounded-t-xl"
          >
            <div className="text-left">
              <p className="text-sm text-white">Cancella preferiti</p>
              <p className="text-xs text-gray-500 mt-0.5">{favoritesCount} salvati</p>
            </div>
            <span className="text-accent-red text-sm font-medium">Cancella</span>
          </button>
          <button
            onClick={handleClearAlerts}
            disabled={alertsCount === 0}
            className="w-full px-4 py-3 flex items-center justify-between disabled:opacity-40 hover:bg-dark-700 transition-colors rounded-b-xl"
          >
            <div className="text-left">
              <p className="text-sm text-white">Cancella allarmi</p>
              <p className="text-xs text-gray-500 mt-0.5">{alertsCount} impostati</p>
            </div>
            <span className="text-accent-red text-sm font-medium">Cancella</span>
          </button>
        </div>
      </section>

      {/* Informazioni */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Informazioni</h2>
        <div className="bg-dark-800 rounded-xl divide-y divide-dark-700">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-400">Applicazione</span>
            <span className="text-sm text-white font-medium">CryptoWatch</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-400">Versione</span>
            <span className="text-sm text-white font-medium">1.0.0</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-400">Sviluppatore</span>
            <span className="text-sm text-white font-medium">Iridexx</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-400">Fonte dati</span>
            <span className="text-sm text-white font-medium">CoinGecko API</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-400">Dati personali</span>
            <span className="text-sm text-accent-green font-medium">Nessuno raccolto</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-400">Archiviazione</span>
            <span className="text-sm text-white font-medium">Solo locale</span>
          </div>
        </div>
      </section>

      <p className="text-center text-xs text-gray-600 pb-2">
        I dati di mercato sono forniti da CoinGecko API (gratuita).
      </p>

    </div>
  );
};

export default SettingsTab;
