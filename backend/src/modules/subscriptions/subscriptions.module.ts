import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from '../../entities/subscription.entity';
import { Transaction } from '../../entities/transaction.entity';
import { Workspace } from '../../entities/workspace.entity';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionDetectionService } from './subscription-detection.service';
import { SubscriptionEventsListener } from './subscription-events.listener';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Transaction, Workspace]),
    NotificationsModule,
    ExchangeRatesModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionDetectionService, SubscriptionEventsListener],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
