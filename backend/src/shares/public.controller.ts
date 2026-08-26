import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { FilesService } from '../files/files.service';
import { SharesService } from './shares.service';

/**
 * Anonymous, read-only access through a public link token.
 * The token in the URL is the only credential; every endpoint re-validates
 * that the requested item is inside the shared subtree.
 */
@Controller('public')
export class PublicController {
  constructor(
    private shares: SharesService,
    private files: FilesService,
  ) {}

  @Get(':token')
  root(@Param('token') token: string) {
    return this.shares.publicRoot(token);
  }

  @Get(':token/folders/:folderId')
  folder(@Param('token') token: string, @Param('folderId') folderId: string) {
    return this.shares.publicFolder(token, folderId);
  }

  @Get(':token/files/:fileId/content')
  async content(
    @Param('token') token: string,
    @Param('fileId') fileId: string,
    @Query('download') download = '',
    @Res() res: Response,
  ) {
    const file = await this.shares.publicFile(token, fileId);
    return this.files.send(file, download === '1', res);
  }
}
