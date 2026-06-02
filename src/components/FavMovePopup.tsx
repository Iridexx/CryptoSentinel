import type { FC } from 'react';
import type { FavAlertData } from '../hooks/useFavoritePriceAlerts';
import type { Currency } from '../hooks/useCurrency';

interface Props {
  alert: FavAlertData;
  currency: Currency;
  onDismiss: () => void;
}

const SYMBOL: Record<Currency, string> = { usd: '$', eur: '€', btc: '₿' };

function fmt(v: number, currency: Currency): string {
  if (currency === 'btc') return v.toFixed(8);
  if (v >= 1000) return v.toLocaleString('it-IT', { maximumFractionDigits: 0 });
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(6);
}

const FavMovePopup: FC<Props> = ({ alert, currency, onDismiss }) => {
  const sym = SYMBOL[currency];
  const isUp = alert.direction === 'up';

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onDismiss}
    >
      <div
        className="bg-dark-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-dark-600 flex flex-col"
        onClick={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm">{isUp ? '▲' : '▼'}</span>
            </span>
            <h2 className="text-white font-bold text-base">Movimento rilevato</h2>
          </div>
          <button onClick={onDismiss} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        {/* Coin info */}
        <div className="bg-dark-700 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">{alert.coinSymbol.toUpperCase()}</p>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              isUp ? 'text-accent-green bg-accent-green/10' : 'text-accent-red bg-accent-red/10'
            }`}>
              {isUp ? 'Rialzo' : 'Ribasso'}
            </span>
          </div>
          <p className="text-white font-bold text-lg leading-snug">{alert.coinName}</p>
          <p className={`text-2xl font-bold mt-1 ${isUp ? 'text-accent-green' : 'text-accent-red'}`}>
            {isUp ? '+' : '-'}{alert.pct.toFixed(2)}%
          </p>
        </div>

        {/* Price details */}
        <div className="flex gap-2 mb-5">
          <div className="flex-1 bg-dark-700 rounded-xl px-3 py-2.5">
            <p className="text-xs text-gray-500 mb-1">Prezzo attuale</p>
            <p className="text-sm font-semibold text-white">{sym}{fmt(alert.currentPrice, currency)}</p>
          </div>
          <div className="flex-1 bg-dark-700 rounded-xl px-3 py-2.5">
            <p className="text-xs text-gray-500 mb-1">Riferimento</p>
            <p className="text-sm font-semibold text-gray-300">{sym}{fmt(alert.refPrice, currency)}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 bg-dark-700 text-gray-300 text-sm rounded-xl hover:bg-dark-600 transition-colors"
          >
            Chiudi
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 active:opacity-80 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Ho capito
          </button>
        </div>
      </div>
    </div>
  );
};

export default FavMovePopup;
