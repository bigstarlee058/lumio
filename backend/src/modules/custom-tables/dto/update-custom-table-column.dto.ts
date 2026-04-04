import { PartialType } from '@nestjs/swagger';
import { CreateCustomTableColumnDto } from './create-custom-table-column.dto';

export class UpdateCustomTableColumnDto extends PartialType(CreateCustomTableColumnDto) {}
