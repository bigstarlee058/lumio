import type { AggregateSortKey, TopSpenderFlowType } from '@/app/(main)/statements/components/top-spenders/top-spenders.types';
import { useStatementFilters, type UseStatementFiltersReturn } from '@/app/(main)/statements/hooks/useStatementFilters';
import { useEffect, useState } from 'react';

export type TopSpendersStateReturn = {
  activeFlowType: TopSpenderFlowType;
  setActiveFlowType: React.Dispatch<React.SetStateAction<TopSpenderFlowType>>;
  sortKey: AggregateSortKey;
  setSortKey: React.Dispatch<React.SetStateAction<AggregateSortKey>>;
  selectedRowId: string | null;
  setSelectedRowId: React.Dispatch<React.SetStateAction<string | null>>;
  searchInput: string;
  setSearchInput: React.Dispatch<React.SetStateAction<string>>;
  workspaceFilter: string;
  setWorkspaceFilter: React.Dispatch<React.SetStateAction<string>>;
  filterState: UseStatementFiltersReturn;
};

export const useTopSpendersState = (): TopSpendersStateReturn => {
  const [activeFlowType, setActiveFlowType] = useState<TopSpenderFlowType>('spend');
  const [sortKey, setSortKey] = useState<AggregateSortKey>('amount');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [workspaceFilter, setWorkspaceFilter] = useState<string>('current');
  const filterState = useStatementFilters('lumio-top-spenders-filters');
  useEffect(() => { setSelectedRowId(null); }, [activeFlowType, workspaceFilter]);
  return { activeFlowType, setActiveFlowType, sortKey, setSortKey, selectedRowId, setSelectedRowId, searchInput, setSearchInput, workspaceFilter, setWorkspaceFilter, filterState };
};
