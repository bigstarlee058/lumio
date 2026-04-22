'use client';
import type { JSX } from 'react';

import type { useTopSpendersViewModel } from '@/app/(main)/statements/components/top-spenders/hooks/useTopSpendersViewModel';
import { Search } from 'lucide-react';

type Props = { vm: ReturnType<typeof useTopSpendersViewModel> };

export function TopSpendersSearchRow({ vm }: Props): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#9ca3af', pointerEvents: 'none' }} />
        <input type="text" value={vm.searchInput} onChange={e => vm.setSearchInput(e.target.value)}
          placeholder={vm.labels.searchPlaceholder} aria-label={vm.labels.searchPlaceholder} className="lumio-view-page__search-input" />
      </div>
      <div style={{ width: 240 }}>
        <label htmlFor="top-spenders-workspace-filter" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>{vm.labels.workspace}</label>
        <select
          id="top-spenders-workspace-filter"
          value={vm.workspaceFilter}
          onChange={e => vm.setWorkspaceFilter(e.target.value)}
          className="lumio-view-page__workspace-filter"
        >
          <option value="current">{vm.labels.currentWorkspace}</option>
          <option value="all">{vm.labels.allWorkspaces}</option>
          {vm.workspaces.map(ws => (
            <option key={ws.id} value={ws.id}>{ws.name ?? ws.id}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
