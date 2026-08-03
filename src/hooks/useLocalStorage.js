import { useState, useEffect } from "react";

const useLocalStorage = (key, initialValue) => {
  const [items, setItems] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(items));
  }, [key, items]);
  return [items, setItems];
};

export default useLocalStorage;
