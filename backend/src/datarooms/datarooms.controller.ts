import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DataRoomsService } from './datarooms.service';

class NameDto {
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255)
  name!: string;
}

@UseGuards(JwtAuthGuard)
@Controller('datarooms')
export class DataRoomsController {
  constructor(private rooms: DataRoomsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.rooms.listOwned(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: NameDto) {
    return this.rooms.create(user.id, dto.name);
  }

  @Patch(':id')
  rename(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: NameDto,
  ) {
    return this.rooms.rename(user.id, id, dto.name);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.rooms.remove(user.id, id);
  }

  @Get(':id/tree')
  tree(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.rooms.folderTree(user.id, id);
  }

  @Get(':id/search')
  search(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('q') q = '',
  ) {
    return this.rooms.search(user.id, id, q);
  }
}
