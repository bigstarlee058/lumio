import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('exchange_rates')
@Index(['baseCurrency', 'targetCurrency', 'rateDate'], { unique: true })
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'base_currency', type: 'varchar', length: 10 })
  baseCurrency: string;

  @Column({ name: 'target_currency', type: 'varchar', length: 10 })
  targetCurrency: string;

  @Column({ name: 'rate', type: 'decimal', precision: 18, scale: 8 })
  rate: number;

  @Column({ name: 'rate_date', type: 'date' })
  rateDate: Date;

  @Column({ name: 'source', type: 'varchar', length: 50 })
  source: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
