import type { CategorySortKey, TopCategoryFlowType } from '@/app/(main)/statements/components/top-categories.utils';
import { useStatementFilters, type UseStatementFiltersReturn } from '@/app/(main)/statements/hooks/useStatementFilters';
import { useEffect, useState } from 'react';

export type TopCategoriesStateReturn = {
  activeFlowType: TopCategoryFlowType;
  setActiveFlowType: React.Dispatch<React.SetStateAction<TopCategoryFlowType>>;
  sortKey: CategorySortKey;
  setSortKey: React.Dispatch<React.SetStateAction<CategorySortKey>>;
  selectedRowId: string | null;
  setSelectedRowId: React.Dispatch<React.SetStateAction<string | null>>;
  searchInput: string;
  setSearchInput: React.Dispatch<React.SetStateAction<string>>;
  workspaceFilter: string;
  setWorkspaceFilter: React.Dispatch<React.SetStateAction<string>>;
  filterState: UseStatementFiltersReturn;
};

export const useTopCategoriesState = (): TopCategoriesStateReturn => {
  const [activeFlowType, setActiveFlowType] = useState<TopCategoryFlowType>('spend');
  const [sortKey, setSortKey] = useState<CategorySortKey>('amount');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [workspaceFilter, setWorkspaceFilter] = useState<string>('current');
  const filterState = useStatementFilters('lumio-top-categories-filters');
  useEffect(() => { setSelectedRowId(null); }, [activeFlowType, workspaceFilter]);
  return { activeFlowType, setActiveFlowType, sortKey, setSortKey, selectedRowId, setSelectedRowId, searchInput, setSearchInput, workspaceFilter, setWorkspaceFilter, filterState };
};
