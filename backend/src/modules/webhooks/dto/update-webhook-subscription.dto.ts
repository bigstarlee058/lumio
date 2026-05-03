import { PartialType } from '@nestjs/mapped-types';
import { CreateWebhookSubscriptionDto } from './create-webhook-subscription.dto';

export class UpdateWebhookSubscriptionDto extends PartialType(CreateWebhookSubscriptionDto) {}
