import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { AccessService } from '../common/access.service';
import { resolveUniqueName, sanitizeName } from '../common/names';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
    private storage: StorageService,
    private jwt: JwtService,
  ) {}

  async upload(
    userId: string,
    folderId: string,
    upload: Express.Multer.File,
  ) {
    const folder = await this.access.assertFolderOwner(userId, folderId);
    if (upload.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('File exceeds the 50 MB limit');
    }

    // Multer decodes latin1 by default; recover UTF-8 names (e.g. Cyrillic).
    const rawName = Buffer.from(upload.originalname, 'latin1').toString('utf8');
    const desired = sanitizeName(rawName || 'file');

    const key = this.storage.newKey(folder.dataRoomId);
    await this.storage.put(key, upload.buffer, upload.mimetype);

    // Same-name uploads get an auto suffix; retry covers concurrent uploads.
    for (let attempt = 0; attempt < 5; attempt++) {
      const siblings = await this.prisma.file.findMany({
        where: { folderId },
        select: { name: true },
      });
      const name = resolveUniqueName(new Set(siblings.map((s) => s.name)), desired);
      try {
        return await this.prisma.file.create({
          data: {
            name,
            size: upload.size,
            mimeType: upload.mimetype || 'application/octet-stream',
            storageKey: key,
            folderId,
            dataRoomId: folder.dataRoomId,
          },
        });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          continue;
        }
        throw e;
      }
    }
    throw new ConflictException('Could not store the file under a unique name');
  }

  async rename(userId: string, fileId: string, name: string) {
    await this.access.assertFileOwner(userId, fileId);
    try {
      return await this.prisma.file.update({
        where: { id: fileId },
        data: { name: sanitizeName(name) },
      });
    } catch (e) {
      throw this.conflictOrRethrow(e, name, 'here');
    }
  }

  async move(userId: string, fileId: string, targetFolderId: string) {
    const file = await this.access.assertFileOwner(userId, fileId);
    const target = await this.access.assertFolderOwner(userId, targetFolderId);
    if (target.dataRoomId !== file.dataRoomId) {
      throw new BadRequestException(
        'Files can only be moved within the same Data Room',
      );
    }
    try {
      return await this.prisma.file.update({
        where: { id: fileId },
        data: { folderId: targetFolderId },
      });
    } catch (e) {
      throw this.conflictOrRethrow(e, file.name, 'in the destination folder');
    }
  }

  async remove(userId: string, fileId: string) {
    const file = await this.access.assertFileOwner(userId, fileId);
    await this.prisma.file.delete({ where: { id: fileId } });
    await this.storage.deleteMany([file.storageKey]);
    return { ok: true };
  }

  /** Short-lived token so <iframe>/<a> can fetch content without headers. */
  async issueViewToken(user: { id: string; email: string }, fileId: string) {
    await this.access.fileAccess(user, fileId);
    return { token: this.jwt.sign({ fileId, scope: 'view' }) };
  }

  async streamContent(
    fileId: string,
    viewToken: string,
    download: boolean,
    res: Response,
  ) {
    let payload: { fileId: string; scope: string };
    try {
      payload = this.jwt.verify(viewToken);
    } catch {
      throw new UnauthorizedException('The view link has expired');
    }
    if (payload.scope !== 'view' || payload.fileId !== fileId) {
      throw new UnauthorizedException('Invalid view token');
    }
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');
    await this.send(file, download, res);
  }

  /** Shared with the public-link controller, which does its own access check. */
  async send(
    file: { name: string; mimeType: string; size: number; storageKey: string },
    download: boolean,
    res: Response,
  ) {
    const stream = await this.storage.getStream(file.storageKey);
    const encoded = encodeURIComponent(file.name);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.size);
    res.setHeader(
      'Content-Disposition',
      `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encoded}`,
    );
    stream.pipe(res);
  }

  private conflictOrRethrow(e: unknown, name: string, where: string): Error {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return new ConflictException(
        `A file named "${sanitizeName(name)}" already exists ${where}`,
      );
    }
    return e as Error;
  }
}
