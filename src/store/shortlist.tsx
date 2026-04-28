import { createContext, useContext, useState, ReactNode } from "react";

type Ctx = {
  shortlist: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  clear: () => void;
};

const ShortlistContext = createContext<Ctx | null>(null);

export const ShortlistProvider = ({ children }: { children: ReactNode }) => {
  const [shortlist, setShortlist] = useState<string[]>([]);
  const toggle = (id: string) =>
    setShortlist((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const has = (id: string) => shortlist.includes(id);
  const clear = () => setShortlist([]);
  return (
    <ShortlistContext.Provider value={{ shortlist, toggle, has, clear }}>
      {children}
    </ShortlistContext.Provider>
  );
};

export const useShortlist = () => {
  const ctx = useContext(ShortlistContext);
  if (!ctx) throw new Error("useShortlist must be used inside ShortlistProvider");
  return ctx;
};
