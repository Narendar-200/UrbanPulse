import { useState } from 'react';

export type AppContextType = {
  selectedLocationId: string | null;
  startDate: Date;
  endDate: Date;
  setSelectedLocationId: (id: string | null) => void;
  setStartDate: (date: Date) => void;
  setEndDate: (date: Date) => void;
};

export const useAppContext = (): AppContextType => {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());

  return {
    selectedLocationId,
    startDate,
    endDate,
    setSelectedLocationId,
    setStartDate,
    setEndDate,
  };
};
