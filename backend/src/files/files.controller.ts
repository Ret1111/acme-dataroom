import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { Response } from 'express';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FilesService } from './files.service';

class UpdateFileDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  folderId?: string;
}

@Controller('files')
export class FilesController {
  constructor(private files: FilesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: AuthUser,
    @Body('folderId') folderId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!folderId) throw new BadRequestException('folderId is required');
    return this.files.upload(user.id, folderId, file);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateFileDto,
  ) {
    if (dto.folderId) return this.files.move(user.id, id, dto.folderId);
    if (dto.name) return this.files.rename(user.id, id, dto.name);
    throw new BadRequestException('Nothing to update');
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.files.remove(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/view-token')
  viewToken(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.files.issueViewToken(user, id);
  }

  // No auth guard: authorization is the short-lived signed token itself,
  // so this URL works inside an <iframe> or a direct download link.
  @Get(':id/content')
  content(
    @Param('id') id: string,
    @Query('st') st = '',
    @Query('download') download = '',
    @Res() res: Response,
  ) {
    return this.files.streamContent(id, st, download === '1', res);
  }
}
