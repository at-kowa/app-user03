"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { repo } from "./repository";

// サーバーの HTML をブラウザが引き継ぎ終えたら true。
// ログイン状態はブラウザにしかないので、それまでは未ログインと同じ表示にして食い違いを防ぐ
const subscribeNothing = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(subscribeNothing, () => true, () => false);
}

// 非同期でデータを読み込む。reload() で読み直す
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; error: string }>({ data: null, error: "" });
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    fn().then(
      (data) => alive && setState({ data, error: "" }),
      (e: Error) => alive && setState({ data: null, error: e.message }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, count]);
  return { ...state, reload: () => setCount((c) => c + 1) };
}

// 一定間隔での取得（自動更新）。画面を離れると止まる
export function usePolling(fn: () => void) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;
    repo.getSettings().then((s) => {
      if (!stopped) timer = setInterval(() => ref.current(), s.pollSeconds * 1000);
    });
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);
}
