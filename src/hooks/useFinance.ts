import { useState, useCallback, useEffect } from 'react';
import type { EngineState } from '../../engine/types';

interface ActionItem {
  id: string;
  description: string;
  status: string;
  dueDate: string | null;
  amount: number | null;
  createdAt: string;
  completedAt: string | null;
}

export function useFinance() {
  const [state, setState] = useState<EngineState | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const processResult = useCallback((result: unknown) => {
    if (!result || typeof result !== 'object') return;
    const data = result as EngineState & { actionItems?: ActionItem[] };
    const { actionItems: items, ...engine } = data;
    setState(engine as EngineState);
    if (Array.isArray(items)) setActionItems(items);
  }, []);

  const fetchState = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.api.finance.getState();
      processResult(result);
    } catch (error) {
      console.error('Failed to fetch finance state:', error);
    } finally {
      setLoading(false);
    }
  }, [processResult]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.api.finance.refresh();
      processResult(result);
    } catch (error) {
      console.error('Failed to refresh finance state:', error);
    } finally {
      setLoading(false);
    }
  }, [processResult]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  return { state, actionItems, loading, refresh };
}
