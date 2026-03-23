import {
  AuditAction,
  EntityType,
} from '@/entities/audit-event.entity';
import type { CreateAuditEventDto } from '@/modules/audit/interfaces/audit-event.interface';
import { AuditDescriptionService } from '@/modules/audit/description/audit-description.service';

describe('AuditDescriptionService', () => {
  const service = new AuditDescriptionService();

  it('describes custom table creation with entity name', () => {
    const description = service.generate({
      entityType: EntityType.CUSTOM_TABLE,
      entityId: 'table-1',
      action: AuditAction.CREATE,
      diff: {
        before: null,
        after: { id: 'table-1', name: 'Таблица продукции Fish Dream' },
      },
    } as CreateAuditEventDto);

    expect(description).toBe('Создана таблица "Таблица продукции Fish Dream"');
  });

  it('describes single workspace field update with human-readable field label', () => {
    const description = service.generate({
      entityType: EntityType.WORKSPACE,
      entityId: 'workspace-1',
      action: AuditAction.UPDATE,
      diff: {
        before: { backgroundImage: null },
        after: { backgroundImage: 'hero.jpg' },
      },
    } as CreateAuditEventDto);

    expect(description).toBe('Изменено: фоновое изображение рабочего пространства');
  });

  it('describes rollback using original action context', () => {
    const description = service.generate({
      entityType: EntityType.CATEGORY,
      entityId: 'category-1',
      action: AuditAction.ROLLBACK,
      meta: { originalAction: AuditAction.UPDATE },
      diff: {
        before: { name: 'Office' },
        after: { name: 'Marketing' },
      },
    } as CreateAuditEventDto);

    expect(description).toBe('Откат: изменение категории');
  });
});
