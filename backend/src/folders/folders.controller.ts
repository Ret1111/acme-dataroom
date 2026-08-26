import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FoldersService } from './folders.service';

class CreateFolderDto {
  @IsString()
  parentId!: string;

  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255)
  name!: string;
}

class RenameDto {
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255)
  name!: string;
}

@UseGuards(JwtAuthGuard)
@Controller('folders')
export class FoldersController {
  constructor(private folders: FoldersService) {}

  @Get(':id')
  view(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.folders.view(user, id);
  }

  @Get(':id/stats')
  stats(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.folders.stats(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFolderDto) {
    return this.folders.create(user.id, dto.parentId, dto.name);
  }

  @Patch(':id')
  rename(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RenameDto,
  ) {
    return this.folders.rename(user.id, id, dto.name);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.folders.remove(user.id, id);
  }
}
