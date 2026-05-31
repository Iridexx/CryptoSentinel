import { useState, useCallback, useEffect, useRef } from 'react';
import type { Coin, PriceAlert, AlertDirection, AlertHistoryEntry } from '../types';
import { sendAlertNotification } from '../utils/notifications';
import { playAlertBeep } from '../utils/audio';
import { syncAlertsToNative } from '../utils/update';

const STORAGE_KEY = 'cryptosentinel_alerts';
const HISTORY_KEY = 'cryptosentinel_alert_history';
const MAX_HISTORY = 50;

function loadAlerts(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PriceAlert[];
  } catch {
    return [];
  }
}

function saveAlerts(alerts: PriceAlert[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch { /* quota */ }
  syncAlertsToNative(alerts);
}

function loadHistory(): AlertHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AlertHistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(history: AlertHistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch { /* quota */ }
}

export function useAlerts(coins: Coin[]) {
  const [alerts, setAlerts] = useState<PriceAlert[]>(loadAlerts);
  const [history, setHistory] = useState<AlertHistoryEntry[]>(loadHistory);
  const lastTriggeredRef = useRef<Set<string>>(new Set());
  const alertsRef = useRef<PriceAlert[]>(alerts);
  alertsRef.current = alerts;

  const addAlert = useCallback((alert: Omit<PriceAlert, 'id' | 'triggered' | 'createdAt'>) => {
    const newAlert: PriceAlert = {
      ...alert,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      triggered: false,
      createdAt: Date.now(),
    };
    setAlerts((prev) => {
      const next = [...prev, newAlert];
      saveAlerts(next);
      return next;
    });
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveAlerts(next);
      lastTriggeredRef.current.delete(id);
      return next;
    });
  }, []);

  const resetAlert = useCallback((id: string) => {
    setAlerts((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, triggered: false } : a));
      saveAlerts(next);
      lastTriggeredRef.current.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (coins.length === 0) return;

    type FireItem = { alert: PriceAlert; coinName: string; direction: 'above' | 'below'; threshold: number; currentPrice: number };
    const toFire: FireItem[] = [];
    const toTriggerIds = new Set<string>();

    for (const alert of alertsRef.current) {
      const coin = coins.find((c) => c.id === alert.coinId);
      if (!coin || alert.triggered || lastTriggeredRef.current.has(alert.id)) continue;

      const price = coin.current_price;
      const fires =
        (alert.direction === 'above' && price >= alert.threshold) ||
        (alert.direction === 'below' && price <= alert.threshold);

      if (fires) {
        lastTriggeredRef.current.add(alert.id);
        toTriggerIds.add(alert.id);
        toFire.push({ alert, coinName: alert.coinName, direction: alert.direction, threshold: alert.threshold, currentPrice: price });
      }
    }

    if (toFire.length === 0) return;

    setAlerts((prev) => {
      const next = prev.map((a) => toTriggerIds.has(a.id) ? { ...a, triggered: true } : a);
      saveAlerts(next);
      return next;
    });

    const now = Date.now();
    const newEntries: AlertHistoryEntry[] = toFire.map(({ alert, currentPrice }) => ({
      id: `${now}-${alert.id}`,
      coinId: alert.coinId,
      coinName: alert.coinName,
      coinSymbol: alert.coinSymbol,
      coinImage: alert.coinImage,
      direction: alert.direction,
      threshold: alert.threshold,
      triggeredPrice: currentPrice,
      triggeredAt: now,
    }));

    setHistory((prev) => {
      const next = [...newEntries, ...prev].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });

    playAlertBeep();
    toFire.forEach((params) => sendAlertNotification(params));
  }, [coins]);

  const editAlert = useCallback((id: string, threshold: number, direction: AlertDirection, percentChange?: number) => {
    setAlerts((prev) => {
      const next = prev.map((a) => a.id === id ? { ...a, threshold, direction, percentChange, triggered: false } : a);
      saveAlerts(next);
      return next;
    });
    lastTriggeredRef.current.delete(id);
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    localStorage.removeItem(STORAGE_KEY);
    syncAlertsToNative([]);
    lastTriggeredRef.current.clear();
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  useEffect(() => {
    const initial = loadAlerts();
    if (initial.length > 0) syncAlertsToNative(initial);
  }, []);

  return { alerts, addAlert, removeAlert, resetAlert, editAlert, clearAlerts, history, clearHistory };
}
