import { NotFoundException } from '@nestjs/common';
import type { DeepPartial, FindOptionsOrder, ObjectLiteral, Repository } from 'typeorm';

/**
 * Base service for workspace-scoped CRUD entities.
 *
 * Provides standard findAll, findOne, update, remove methods.
 * Subclasses typically only need to implement create() and
 * optionally override getDefaultOrder().
 */
export abstract class WorkspaceCrudBaseService<T extends ObjectLiteral> {
  constructor(
    protected readonly repository: Repository<T>,
    protected readonly entityName: string,
  ) {}

  protected getDefaultOrder(): FindOptionsOrder<T> {
    return { name: 'ASC' } as FindOptionsOrder<T>;
  }

  async findAll(workspaceId: string): Promise<T[]> {
    return this.repository.find({
      where: { workspaceId } as any,
      order: this.getDefaultOrder(),
    });
  }

  async findOne(id: string, workspaceId: string): Promise<T> {
    const entity = await this.repository.findOne({
      where: { id, workspaceId } as any,
    });

    if (!entity) {
      throw new NotFoundException(`${this.entityName} not found`);
    }

    return entity;
  }

  async update(id: string, workspaceId: string, dto: DeepPartial<T>): Promise<T> {
    const entity = await this.findOne(id, workspaceId);
    Object.assign(entity, dto);
    return this.repository.save(entity);
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    const entity = await this.findOne(id, workspaceId);
    await this.repository.remove(entity);
  }
}
