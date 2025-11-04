import { PartialType } from '@nestjs/swagger';
import { CreateNisitRequestDto } from './create-nisit.dto';

export class UpdateNisitDto extends PartialType(CreateNisitRequestDto) {}
