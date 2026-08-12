import { useState, useEffect } from "react";

const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [items, setItems] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(items));
  }, [key, items]);
  return [items, setItems] as const;
};

export default useLocalStorage;
