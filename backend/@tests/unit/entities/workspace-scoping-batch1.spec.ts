import { Branch } from '@/entities/branch.entity';
import { Tag } from '@/entities/tag.entity';
import { Wallet } from '@/entities/wallet.entity';
import { Workspace } from '@/entities/workspace.entity';
import { getMetadataArgsStorage } from 'typeorm';

type RelationTypeResolver = string | (() => unknown);

const resolveRelationType = (type: RelationTypeResolver) =>
  typeof type === 'function' ? type() : type;

describe('Batch 1 workspace entity scoping', () => {
  const metadata = getMetadataArgsStorage();

  describe('Wallet', () => {
    it('adds a workspaceId column mapped to workspace_id', () => {
      const column = metadata.columns.find(
        entry => entry.target === Wallet && entry.propertyName === 'workspaceId',
      );

      expect(column).toBeDefined();
      expect(column?.options.name).toBe('workspace_id');
      expect(column?.options.nullable).not.toBe(true);
    });

    it('adds a workspace relation', () => {
      const relation = metadata.relations.find(
        entry => entry.target === Wallet && entry.propertyName === 'workspace',
      );

      expect(relation).toBeDefined();
      expect(relation?.relationType).toBe('many-to-one');
      expect(resolveRelationType(relation?.type as RelationTypeResolver)).toBe(Workspace);
    });
  });

  describe('Branch', () => {
    it('adds a workspaceId column mapped to workspace_id', () => {
      const column = metadata.columns.find(
        entry => entry.target === Branch && entry.propertyName === 'workspaceId',
      );

      expect(column).toBeDefined();
      expect(column?.options.name).toBe('workspace_id');
      expect(column?.options.nullable).not.toBe(true);
    });

    it('adds a workspace relation', () => {
      const relation = metadata.relations.find(
        entry => entry.target === Branch && entry.propertyName === 'workspace',
      );

      expect(relation).toBeDefined();
      expect(relation?.relationType).toBe('many-to-one');
      expect(resolveRelationType(relation?.type as RelationTypeResolver)).toBe(Workspace);
    });
  });

  describe('Tag', () => {
    it('adds a workspaceId column mapped to workspace_id', () => {
      const workspaceColumn = metadata.columns.find(
        entry => entry.target === Tag && entry.propertyName === 'workspaceId',
      );

      expect(workspaceColumn).toBeDefined();
      expect(workspaceColumn?.options.name).toBe('workspace_id');
      expect(workspaceColumn?.options.nullable).not.toBe(true);
    });

    it('adds a workspace relation', () => {
      const relation = metadata.relations.find(
        entry => entry.target === Tag && entry.propertyName === 'workspace',
      );

      expect(relation).toBeDefined();
      expect(relation?.relationType).toBe('many-to-one');
      expect(resolveRelationType(relation?.type as RelationTypeResolver)).toBe(Workspace);
    });
  });
});
