import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

type JsonObject = Record<string, unknown>;

@Entity('custom_table_cell_styles')
@Index('IDX_custom_table_cell_styles_row_id', ['rowId'])
@Index('IDX_custom_table_cell_styles_row_id_column_key_unique', ['rowId', 'columnKey'], {
  unique: true,
})
export class CustomTableCellStyle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'row_id', type: 'uuid' })
  rowId: string;

  @Column({ name: 'column_key', type: 'varchar' })
  columnKey: string;

  @Column({ name: 'style', type: 'jsonb', default: () => "'{}'::jsonb" })
  style: JsonObject;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
