import { NotificationsController } from '@/modules/notifications/notifications.controller';

describe('NotificationsController', () => {
  it('forwards mandatory workspaceId from guard instead of query param', async () => {
    const notificationsService = {
      findByRecipient: jest.fn(async () => ({ items: [], total: 0, limit: 30, offset: 0 })),
      getUnreadCount: jest.fn(async () => 5),
      markAsRead: jest.fn(async () => 2),
      markAllAsRead: jest.fn(async () => 8),
      getPreferences: jest.fn(async () => ({ userId: 'u1' })),
      updatePreferences: jest.fn(async () => ({ userId: 'u1', statementUploaded: false })),
    };
    const controller = new NotificationsController(notificationsService as any);
    const user = { id: 'u1' } as any;
    const workspaceId = 'ws-1';

    expect(await controller.list(user, workspaceId, '10', '20')).toEqual({
      items: [],
      total: 0,
      limit: 30,
      offset: 0,
    });
    expect(await controller.getUnreadCount(user, workspaceId)).toEqual({ count: 5 });
    expect(await controller.markAsRead(user, { ids: ['n1'] } as any)).toEqual({ updated: 2 });
    expect(await controller.markAllAsRead(user, workspaceId)).toEqual({ updated: 8 });

    expect(notificationsService.findByRecipient).toHaveBeenCalledWith('u1', workspaceId, 10, 20);
    expect(notificationsService.getUnreadCount).toHaveBeenCalledWith('u1', workspaceId);
    expect(notificationsService.markAllAsRead).toHaveBeenCalledWith('u1', workspaceId);
  });
});
