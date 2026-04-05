export interface StorageViewFilters {
  search?: string;
  bankName?: string;
  availability?: 'disk' | 'db' | 'both' | 'missing';
  scope?: 'mine' | 'shared' | 'all';
  folderId?: string | null;
  tagIds?: string[];
  deleted?: 'only' | 'include';
}
