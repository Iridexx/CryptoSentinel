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
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8 bg-black/50" onClick={onDismiss}>
      <div
        className="bg-dark-800 rounded-2xl p-5 w-full max-w-sm border border-orange-500/40 shadow-[0_0_40px_rgba(249,115,22,0.2)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse flex-shrink-0" />
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Movimento rilevato</p>
        </div>

        {/* Coin */}
        <div className="mb-4">
          <p className="text-white font-bold text-lg leading-tight">{alert.coinName}</p>
          <p className="text-gray-400 text-xs uppercase mt-0.5">{alert.coinSymbol}</p>
        </div>

        {/* Movement block */}
        <div className={`rounded-xl p-4 mb-4 ${isUp ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
          <p className={`text-3xl font-bold ${isUp ? 'text-accent-green' : 'text-accent-red'}`}>
            {isUp ? '▲' : '▼'} {alert.pct.toFixed(2)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isUp ? 'Rialzo' : 'Ribasso'} dal prezzo di riferimento
          </p>
        </div>

        {/* Price details */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1 bg-dark-700 rounded-lg px-3 py-2.5">
            <p className="text-xs text-gray-500 mb-1">Prezzo attuale</p>
            <p className="text-sm font-semibold text-white">{sym}{fmt(alert.currentPrice, currency)}</p>
          </div>
          <div className="flex-1 bg-dark-700 rounded-lg px-3 py-2.5">
            <p className="text-xs text-gray-500 mb-1">Riferimento</p>
            <p className="text-sm font-semibold text-gray-300">{sym}{fmt(alert.refPrice, currency)}</p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 active:opacity-80 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          Ho capito
        </button>
      </div>
    </div>
  );
};

export default FavMovePopup;
