import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

type JsonObject = Record<string, unknown>;

@Entity('custom_table_column_styles')
@Index('IDX_custom_table_column_styles_table_id', ['tableId'])
@Index('IDX_custom_table_column_styles_table_column_key_unique', ['tableId', 'columnKey'], {
  unique: true,
})
export class CustomTableColumnStyle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'table_id', type: 'uuid' })
  tableId: string;

  @Column({ name: 'column_key', type: 'varchar' })
  columnKey: string;

  @Column({ name: 'style', type: 'jsonb', default: () => "'{}'::jsonb" })
  style: JsonObject;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
