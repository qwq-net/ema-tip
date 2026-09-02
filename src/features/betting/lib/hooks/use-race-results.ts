import { BetType } from '@/entities/bet';
import { getPayoutResults } from '@/entities/race/actions';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface PayoutResult {
  type: BetType;
  combinations: {
    numbers: number[];
    payout: number;
    popularity?: number;
    guaranteed?: boolean;
  }[];
}

export function useRaceResults(raceId: string, initialResults: PayoutResult[] = [], isFinalized: boolean) {
  const [results, setResults] = useState<PayoutResult[]>(initialResults);
  const hasFetched = useRef(initialResults.length > 0);

  const fetchResults = useCallback(async () => {
    try {
      const data = await getPayoutResults(raceId);
      setResults(data);
    } catch (e) {
      console.error('Failed to fetch payout results:', e);
    }
  }, [raceId]);

  useEffect(() => {
    if (isFinalized && !hasFetched.current) {
      hasFetched.current = true;
      const timer = setTimeout(() => fetchResults(), 0);
      return () => clearTimeout(timer);
    }
  }, [isFinalized, fetchResults]);

  return { results, fetchResults };
}
