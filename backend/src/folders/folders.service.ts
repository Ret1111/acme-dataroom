import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccessService } from '../common/access.service';
import { sanitizeName } from '../common/names';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class FoldersService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
    private storage: StorageService,
  ) {}

  /** Folder contents + breadcrumb, for owners and users it was shared with. */
  async view(user: { id: string; email: string }, folderId: string) {
    const { access, folder, ancestors, viaFolderId } =
      await this.access.folderAccess(user, folderId);

    // A grantee who got access via a folder share must not see the path
    // above that folder — trim the breadcrumb to the shared subtree.
    const start = viaFolderId
      ? Math.max(0, ancestors.findIndex((f) => f.id === viaFolderId))
      : 0;
    const visible = ancestors.slice(start);

    const [room, folders, files] = await Promise.all([
      this.prisma.dataRoom.findUnique({
        where: { id: folder.dataRoomId },
        select: { id: true, name: true },
      }),
      this.prisma.folder.findMany({
        where: { parentId: folderId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, createdAt: true, updatedAt: true },
      }),
      this.prisma.file.findMany({
        where: { folderId },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          size: true,
          mimeType: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      access,
      dataRoom: room,
      folder: { id: folder.id, name: folder.name, parentId: folder.parentId },
      // Root folder is displayed under the room's name.
      breadcrumb: visible.map((f, i) => ({
        id: f.id,
        name:
          i === 0 && !f.parentId ? (room?.name ?? 'Data Room') : f.name,
      })),
      folders,
      files,
    };
  }

  /** Subtree aggregates — shown in the delete confirmation dialog. */
  async stats(user: { id: string; email: string }, folderId: string) {
    await this.access.folderAccess(user, folderId);
    return this.access.subtreeStats(folderId);
  }

  async create(userId: string, parentId: string, name: string) {
    const parent = await this.access.assertFolderOwner(userId, parentId);
    try {
      return await this.prisma.folder.create({
        data: {
          name: sanitizeName(name),
          parentId: parent.id,
          dataRoomId: parent.dataRoomId,
        },
      });
    } catch (e) {
      throw this.conflictOrRethrow(e, name);
    }
  }

  async rename(userId: string, folderId: string, name: string) {
    const folder = await this.access.assertFolderOwner(userId, folderId);
    if (!folder.parentId) {
      throw new BadRequestException(
        'Rename the Data Room itself instead of its root folder',
      );
    }
    try {
      return await this.prisma.folder.update({
        where: { id: folderId },
        data: { name: sanitizeName(name) },
      });
    } catch (e) {
      throw this.conflictOrRethrow(e, name);
    }
  }

  async remove(userId: string, folderId: string) {
    const folder = await this.access.assertFolderOwner(userId, folderId);
    if (!folder.parentId) {
      throw new BadRequestException('The root folder cannot be deleted');
    }
    const keys = await this.access.subtreeStorageKeys(folderId);
    // DB cascade removes nested folders, files and any shares pointing at them.
    await this.prisma.folder.delete({ where: { id: folderId } });
    await this.storage.deleteMany(keys);
    return { ok: true };
  }

  private conflictOrRethrow(e: unknown, name: string): Error {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return new ConflictException(
        `A folder named "${sanitizeName(name)}" already exists here`,
      );
    }
    return e as Error;
  }
}
