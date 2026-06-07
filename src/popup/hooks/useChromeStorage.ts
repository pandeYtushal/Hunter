import { useEffect, useState } from "react";
import { storage } from "../../shared/storage";
import type { StorageSchema } from "../../shared/types/storage";

export const useChromeStorage = <K extends keyof StorageSchema>(key: K) => {
  const [value, setValue] = useState<StorageSchema[K] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    storage.get(key).then((storedValue) => {
      if (active) {
        setValue(storedValue);
        setIsLoading(false);
      }
    });

    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === "sync" && changes[key]) {
        setValue(changes[key].newValue as StorageSchema[K]);
      }
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(listener);
    };
  }, [key]);

  const updateValue = async (nextValue: StorageSchema[K]) => {
    await storage.set(key, nextValue);
    setValue(nextValue);
  };

  return { value, setValue: updateValue, isLoading };
};
