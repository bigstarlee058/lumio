import type { Repository } from 'typeorm';

type MockRepository<T> = {
  [K in keyof Repository<T>]: K extends
    | 'find'
    | 'findOne'
    | 'findAndCount'
    | 'findOneBy'
    | 'findBy'
    | 'create'
    | 'save'
    | 'remove'
    | 'delete'
    | 'update'
    | 'count'
    | 'createQueryBuilder'
    | 'merge'
    | 'preload'
    | 'softRemove'
    | 'softDelete'
    ? jest.Mock
    : Repository<T>[K];
};

/**
 * Creates a mock TypeORM Repository with common methods stubbed as jest.fn().
 * Use this instead of manually creating mock objects in each test file.
 */
export function createRepoMock<T = any>(): MockRepository<T> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    findBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    merge: jest.fn(),
    preload: jest.fn(),
    softRemove: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as MockRepository<T>;
}
