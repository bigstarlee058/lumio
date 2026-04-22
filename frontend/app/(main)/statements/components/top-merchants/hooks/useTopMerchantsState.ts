import type { AggregateSortKey, TopMerchantFlowType } from '@/app/(main)/statements/components/top-merchants/top-merchants.types';
import { useStatementFilters, type UseStatementFiltersReturn } from '@/app/(main)/statements/hooks/useStatementFilters';
import { useEffect, useState } from 'react';

export type TopMerchantsStateReturn = {
  activeFlowType: TopMerchantFlowType;
  setActiveFlowType: React.Dispatch<React.SetStateAction<TopMerchantFlowType>>;
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

export const useTopMerchantsState = (): TopMerchantsStateReturn => {
  const [activeFlowType, setActiveFlowType] = useState<TopMerchantFlowType>('spend');
  const [sortKey, setSortKey] = useState<AggregateSortKey>('amount');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [workspaceFilter, setWorkspaceFilter] = useState<string>('current');
  const filterState = useStatementFilters('lumio-top-merchants-filters');
  useEffect(() => { setSelectedRowId(null); }, [activeFlowType, workspaceFilter]);
  return { activeFlowType, setActiveFlowType, sortKey, setSortKey, selectedRowId, setSelectedRowId, searchInput, setSearchInput, workspaceFilter, setWorkspaceFilter, filterState };
};
