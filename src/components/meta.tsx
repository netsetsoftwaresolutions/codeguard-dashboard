'use client';

import type { MetaView } from '../contracts';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';

export const DEFAULT_PRODUCT_NAME = 'CodeGuard';

interface MetaCtx {
  meta: MetaView | null;
  productName: string;
  loading: boolean;
  /** True when /api/meta failed — features are then treated as unavailable. */
  failed: boolean;
}

const Ctx = createContext<MetaCtx>({ meta: null, productName: DEFAULT_PRODUCT_NAME, loading: true, failed: false });

export function MetaProvider({ children, initial }: { children: ReactNode; initial?: MetaView | null }) {
  const [meta, setMeta] = useState<MetaView | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (initial) return;
    let active = true;
    api
      .meta()
      .then((m) => active && setMeta(m))
      .catch(() => active && setFailed(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [initial]);
  const productName = meta?.productName?.trim() || DEFAULT_PRODUCT_NAME;
  return <Ctx.Provider value={{ meta, productName, loading, failed }}>{children}</Ctx.Provider>;
}

export const useMeta = () => useContext(Ctx);
