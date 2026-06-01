import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { Coin } from './types';
import { useCryptoData } from './hooks/useCryptoData';
import { useFavorites } from './hooks/useFavorites';
import { useAlerts } from './hooks/useAlerts';
import { useRangeAlerts } from './hooks/useRangeAlerts';
import { useCurrency } from './hooks/useCurrency';
import { getNotificationPermission, initNotifications } from './utils/notifications';
import { isBatteryBannerDismissed } from './utils/energySaving';
import { onDownloadComplete, triggerImmediateCheck, checkForUpdates, type UpdateResult } from './utils/update';
import { useSearch } from './hooks/useSearch';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { hapticLight } from './utils/haptics';
import UpdateNotification from './components/UpdateNotification';
import Navbar, { type Tab } from './components/Navbar';
import LogoLighthouse from './components/LogoLighthouse';
import CoinCard from './components/CoinCard';
import AlertModal from './components/AlertModal';
import AlertsTab from './components/AlertsTab';
import NotificationBanner from './components/NotificationBanner';
import EnergySavingBanner from './components/EnergySavingBanner';
import SettingsTab from './components/SettingsTab';

const INTERVAL_KEY = 'cryptosentinel_refresh_interval';
const SLIDER_RANGE_KEY = 'cryptosentinel_alert_slider_range';

type SortBy = 'rank' | 'change' | '7d' | 'volume' | 'price';
type TimeFrame = '1h' | '24h' | '7d';

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [search, setSearch] = useState('');
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');
  const [batteryDismissed, setBatteryDismissed] = useState(isBatteryBannerDismissed);
  const [dlState, setDlState] = useState<'idle' | 'downloading' | 'done'>('idle');
  const [perPage, setPerPage] = useState<50 | 100>(50);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('24h');
  const [page, setPage] = useState(1);
  const [availableUpdate, setAvailableUpdate] = useState<UpdateResult | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('rank');
  const [sortDesc, setSortDesc] = useState(true);
  const lastUpdateCheckRef = useRef<number>(0);

  // — Update dismiss/snooze —
  const [dismissedBuild, setDismissedBuild] = useState<string | null>(() =>
    localStorage.getItem('cs_dismissed_build')
  );
  const [snoozedBuild, setSnoozedBuild] = useState<string | null>(() =>
    localStorage.getItem('cs_snoozed_build')
  );
  const [snoozedUntil, setSnoozedUntil] = useState<number>(() =>
    Number(localStorage.getItem('cs_snoozed_until') ?? 0)
  );

  // Re-mostra il popup quando lo snooze scade (senza bisogno di riaprire l'app)
  useEffect(() => {
    if (!snoozedUntil || Date.now() > snoozedUntil) return;
    const t = setTimeout(() => setSnoozedUntil(0), snoozedUntil - Date.now());
    return () => clearTimeout(t);
  }, [snoozedUntil]);

  const isUpdateVisible = useMemo(() =>
    availableUpdate != null &&
    availableUpdate.buildNumber !== dismissedBuild &&
    (snoozedBuild !== availableUpdate.buildNumber || Date.now() > snoozedUntil),
    [availableUpdate, dismissedBuild, snoozedBuild, snoozedUntil]
  );

  // "Ignora": nasconde questa versione specifica per sempre (fino a build più nuovo)
  const handleIgnoreUpdate = useCallback(() => {
    const build = availableUpdate?.buildNumber ?? '_';
    localStorage.setItem('cs_dismissed_build', build);
    setDismissedBuild(build);
  }, [availableUpdate]);

  // "Dopo": riappare dopo 4 ore, oppure subito se esce un build più nuovo
  const handleSnoozeUpdate = useCallback(() => {
    const build = availableUpdate?.buildNumber ?? '_';
    const until = Date.now() + 4 * 60 * 60 * 1000;
    localStorage.setItem('cs_snoozed_build', build);
    localStorage.setItem('cs_snoozed_until', String(until));
    setSnoozedBuild(build);
    setSnoozedUntil(until);
  }, [availableUpdate]);

  // Dopo download completato: resetta tutto
  const handleUpdateDone = useCallback(() => {
    setAvailableUpdate(null);
    localStorage.removeItem('cs_dismissed_build');
    localStorage.removeItem('cs_snoozed_build');
    localStorage.removeItem('cs_snoozed_until');
    setDismissedBuild(null);
    setSnoozedBuild(null);
    setSnoozedUntil(0);
  }, []);

  const runUpdateCheck = useCallback(async () => {
    lastUpdateCheckRef.current = Date.now();
    try {
      const result = await checkForUpdates(__APP_BUILD_NUMBER__);
      if (result.available) setAvailableUpdate(result);
    } catch {
      // Rete non ancora pronta (primo avvio post-installazione): riprova dopo 15s
      lastUpdateCheckRef.current = 0;
      setTimeout(async () => {
        try {
          const result = await checkForUpdates(__APP_BUILD_NUMBER__);
          if (result.available) setAvailableUpdate(result);
        } catch { /* silent */ }
      }, 15_000);
    }
  }, []);

  useEffect(() => {
    initNotifications();
    getNotificationPermission().then(setNotifPerm);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        getNotificationPermission().then(setNotifPerm);
        if (Date.now() - lastUpdateCheckRef.current > 30 * 60 * 1000) {
          runUpdateCheck();
        }
      } else {
        triggerImmediateCheck();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let unsubDl: (() => void) | null = null;
    onDownloadComplete(() => setDlState('done')).then((fn) => { unsubDl = fn; });

    const updateTimer = setTimeout(runUpdateCheck, 3000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      unsubDl?.();
      clearTimeout(updateTimer);
    };
  }, [runUpdateCheck]);

  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    return parseInt(localStorage.getItem(INTERVAL_KEY) || '30000', 10);
  });

  const [sliderRange, setSliderRange] = useState<number>(() => {
    return parseInt(localStorage.getItem(SLIDER_RANGE_KEY) || '20', 10);
  });

  const handleSliderRangeChange = useCallback((n: number) => {
    setSliderRange(n);
    localStorage.setItem(SLIDER_RANGE_KEY, String(n));
  }, []);

  const { currency, changeCurrency } = useCurrency();
  const { coins, loading, error, lastUpdated, refresh } = useCryptoData(refreshInterval, perPage, page, currency);
  const { results: searchResults, searching } = useSearch(search, currency);
  const { favorites, toggle: toggleFavorite, isFavorite, clear: clearFavorites } = useFavorites();
  const { alerts, addAlert, removeAlert, resetAlert, editAlert, clearAlerts, history, clearHistory } = useAlerts(coins);
  const { rangeAlerts, addRangeAlert, removeRangeAlert, editRangeAlert } = useRangeAlerts(coins);

  const [refreshFlash, setRefreshFlash] = useState(false);

  const handleRefresh = useCallback(async () => {
    await refresh();
    setRefreshFlash(true);
    setTimeout(() => setRefreshFlash(false), 1500);
  }, [refresh]);

  const { containerRef: mainRef, indicatorRef: ptrRef, isRefreshing: ptrRefreshing } = usePullToRefresh(handleRefresh, isUpdateVisible);

  const handleIntervalChange = useCallback((ms: number) => {
    setRefreshInterval(ms);
    localStorage.setItem(INTERVAL_KEY, String(ms));
  }, []);

  const handlePerPageChange = useCallback((n: 50 | 100) => {
    setPerPage(n);
    setPage(1);
  }, []);

  const handleSort = useCallback((key: SortBy) => {
    setSortBy((prev) => {
      if (prev === key) { setSortDesc((d) => !d); return key; }
      setSortDesc(true);
      return key;
    });
  }, []);

  const sortedCoins = useMemo(() => {
    const arr = [...coins];
    arr.sort((a, b) => {
      let av = 0, bv = 0;
      if (sortBy === 'rank')   { av = a.rank;   bv = b.rank; }
      if (sortBy === 'change') { av = a.change24h ?? 0; bv = b.change24h ?? 0; }
      if (sortBy === '7d')     { av = a.change7d ?? 0;  bv = b.change7d ?? 0; }
      if (sortBy === 'volume') { av = a.volume24h ?? 0; bv = b.volume24h ?? 0; }
      if (sortBy === 'price')  { av = a.price;  bv = b.price; }
      return sortDesc ? bv - av : av - bv;
    });
    return arr;
  }, [coins, sortBy, sortDesc]);

  const isSearching = search.trim().length > 0;

  const handleCoinTap = useCallback((coin: Coin) => {
    hapticLight();
    setSelectedCoin(coin);
  }, []);

  const handleTabChange = useCallback((newTab: Tab) => {
    setTab(newTab);
    if (newTab !== 'dashboard') setSearch('');
  }, []);

  const favoriteCoins = useMemo(() =>
    sortedCoins.filter(c => isFavorite(c.id)),
    [sortedCoins, isFavorite]
  );

  const activeAlertCount = useMemo(() =>
    alerts.filter(a => a.active).length,
    [alerts]
  );

  return (
    <div className="min-h-screen text-white" style={{ background: '#060E1A' }}>
      <header className="px-4 pt-safe sticky top-0 z-40"
        style={{
          background: 'linear-gradient(180deg, #07101F 0%, #0A1628 70%, #0D1A2E 100%)',
          borderBottom: '1px solid rgba(59,130,246,0.18)',
        }}>
        <div className="max-w-lg mx-auto flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <LogoLighthouse />
            <div>
              <h1 className="text-white font-bold text-xl tracking-tight leading-none"
                style={{ textShadow: '0 0 22px rgba(96,165,250,0.38), 0 0 48px rgba(59,130,246,0.12)' }}>
                CryptoSentinel
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ background: '#3B82F6', boxShadow: '0 0 6px rgba(59,130,246,0.9)' }} />
                <span className="text-xs font-mono"
                  style={{ color: 'rgba(148,163,184,0.7)', letterSpacing: '0.03em' }}>
                  {lastUpdated
                    ? lastUpdated.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : '--:--:--'}
                </span>
              </div>
            </div>
          </div>

          {tab === 'dashboard' && (
            <div className="flex items-center gap-2">
              {(['1h', '24h', '7d'] as TimeFrame[]).map(tf => (
                <button
                  key={tf}
                  onClick={() => { hapticLight(); setTimeFrame(tf); }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150"
                  style={{
                    background: timeFrame === tf ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.05)',
                    color: timeFrame === tf ? '#60A5FA' : '#8B95A7',
                    border: timeFrame === tf ? '1px solid rgba(59,130,246,0.35)' : '1px solid transparent',
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div
        ref={mainRef}
        className="overflow-y-auto"
        style={{ height: 'calc(100dvh - 56px - 72px)', paddingBottom: '0' }}
      >
        {/* PTR indicator */}
        <div ref={ptrRef} style={{ height: 0, overflow: 'hidden' }} className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-1">
            <svg data-ptr-arrow width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: 'transform 220ms, color 220ms', color: 'rgb(156 163 175)' }}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
            {ptrRefreshing && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6"
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                className="animate-spin">
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
            )}
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-3">
          <NotificationBanner permission={notifPerm} onPermissionChange={setNotifPerm} />
          <EnergySavingBanner dismissed={batteryDismissed} onDismiss={() => setBatteryDismissed(true)} />

          {error && (
            <div className="bg-accent-red/10 border border-accent-red/30 rounded-xl px-4 py-2 text-xs text-accent-red mb-3">
              {error}
            </div>
          )}

          {availableUpdate && isUpdateVisible && (
            <UpdateNotification
              update={availableUpdate}
              dlState={dlState}
              onIgnore={handleIgnoreUpdate}
              onSnooze={handleSnoozeUpdate}
              onDismiss={handleUpdateDone}
              onDownloadStart={() => setDlState('downloading')}
            />
          )}

          {tab === 'dashboard' && (
            <div>
              {!isSearching && (
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {(['rank','change','7d','volume','price'] as SortBy[]).map(key => (
                      <button
                        key={key}
                        onClick={() => { hapticLight(); handleSort(key); }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: sortBy === key ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                          color: sortBy === key ? '#60A5FA' : '#8B95A7',
                          border: sortBy === key ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                        }}
                      >
                        {key === 'rank' ? '#' : key === 'change' ? '24h%' : key === '7d' ? '7d%' : key === 'volume' ? 'Vol' : '$'}
                        {sortBy === key && (
                          <span className="ml-1">{sortDesc ? '↓' : '↑'}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => { hapticLight(); setPerPage(p => p === 50 ? 100 : 50); setPage(1); }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#8B95A7' }}
                  >
                    {perPage}
                  </button>
                </div>
              )}

              <div className="relative mb-3">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cerca coin..."
                  className="w-full bg-dark-800 border border-dark-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">×</button>
                )}
              </div>

              {isSearching ? (
                searching ? (
                  <div className="text-center text-gray-500 py-8 text-sm">Ricerca...</div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center text-gray-500 py-8 text-sm">Nessun risultato</div>
                ) : (
                  searchResults.map(coin => (
                    <CoinCard
                      key={coin.id}
                      coin={coin}
                      isFavorite={isFavorite(coin.id)}
                      onFavorite={() => toggleFavorite(coin.id)}
                      onTap={handleCoinTap}
                      timeFrame={timeFrame}
                    />
                  ))
                )
              ) : loading && coins.length === 0 ? (
                <div className="text-center text-gray-500 py-12 text-sm">Caricamento...</div>
              ) : (
                sortedCoins.map(coin => (
                  <CoinCard
                    key={coin.id}
                    coin={coin}
                    isFavorite={isFavorite(coin.id)}
                    onFavorite={() => toggleFavorite(coin.id)}
                    onTap={handleCoinTap}
                    timeFrame={timeFrame}
                  />
                ))
              )}

              {!isSearching && coins.length > 0 && (
                <div className="flex justify-center gap-3 mt-4 mb-2">
                  <button
                    onClick={() => { hapticLight(); setPage(p => Math.max(1, p - 1)); }}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-30"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#8B95A7' }}
                  >
                    ←
                  </button>
                  <span className="flex items-center text-xs text-gray-500">Pag. {page}</span>
                  <button
                    onClick={() => { hapticLight(); setPage(p => p + 1); }}
                    disabled={coins.length < perPage}
                    className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-30"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#8B95A7' }}
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'favorites' && (
            <div>
              {favoriteCoins.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <p className="text-sm">Nessun preferito</p>
                  <p className="text-xs mt-1 text-gray-600">Tocca ★ su una coin per aggiungerla</p>
                </div>
              ) : (
                favoriteCoins.map(coin => (
                  <CoinCard
                    key={coin.id}
                    coin={coin}
                    isFavorite={true}
                    onFavorite={() => toggleFavorite(coin.id)}
                    onTap={handleCoinTap}
                    timeFrame={timeFrame}
                  />
                ))
              )}
            </div>
          )}

          {tab === 'alerts' && (
            <AlertsTab
              coins={coins}
              alerts={alerts}
              rangeAlerts={rangeAlerts}
              onAdd={addAlert}
              onRemove={removeAlert}
              onReset={resetAlert}
              onEdit={editAlert}
              onClear={clearAlerts}
              onAddRange={addRangeAlert}
              onRemoveRange={removeRangeAlert}
              onEditRange={editRangeAlert}
              history={history}
              onClearHistory={clearHistory}
              sliderRange={sliderRange}
            />
          )}

          {tab === 'settings' && (
            <SettingsTab
              refreshInterval={refreshInterval}
              onIntervalChange={handleIntervalChange}
              perPage={perPage}
              onPerPageChange={handlePerPageChange}
              sliderRange={sliderRange}
              onSliderRangeChange={handleSliderRangeChange}
              onClearFavorites={clearFavorites}
              onClearAlerts={clearAlerts}
            />
          )}
        </div>
      </div>

      <Navbar
        activeTab={tab}
        onTabChange={handleTabChange}
        alertCount={activeAlertCount}
        favoriteCount={favorites.length}
      />

      {selectedCoin && (
        <AlertModal
          coin={selectedCoin}
          onClose={() => setSelectedCoin(null)}
          onConfirm={(price, pct, note) => {
            addAlert(selectedCoin, price, pct, note);
            setSelectedCoin(null);
          }}
          onConfirmRange={(low, high) => {
            addRangeAlert(selectedCoin, low, high);
            setSelectedCoin(null);
          }}
          existingAlert={alerts.find(a => a.coinId === selectedCoin.id)}
          currentPrice={selectedCoin.price}
          sliderRange={sliderRange}
        />
      )}
    </div>
  );
}
