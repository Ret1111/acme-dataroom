import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { File, Folder } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AccessLevel = 'owner' | 'shared';

export interface FolderAccess {
  access: AccessLevel;
  folder: Folder;
  /** Chain from the room's root folder down to (and including) this folder. */
  ancestors: Folder[];
  /** When access came through a folder share: the shared folder's id. */
  viaFolderId?: string | null;
}

/**
 * Central authorization logic. A user can read a resource when they own its
 * Data Room, or when a USER share targets the resource itself or any of its
 * ancestors (folder chain or the whole room). Roles live on the Share row, so
 * adding EDITOR later only extends this service, not the data model.
 */
@Injectable()
export class AccessService {
  constructor(private prisma: PrismaService) {}

  /** Folder chain from root to the given folder (inclusive). */
  async ancestorsOf(folderId: string): Promise<Folder[]> {
    const chain: Folder[] = [];
    let currentId: string | null = folderId;
    while (currentId) {
      const folder: Folder | null = await this.prisma.folder.findUnique({
        where: { id: currentId },
      });
      if (!folder) break;
      chain.unshift(folder);
      currentId = folder.parentId;
    }
    return chain;
  }

  async isSelfOrDescendant(
    folderId: string,
    rootFolderId: string,
  ): Promise<boolean> {
    const chain = await this.ancestorsOf(folderId);
    return chain.some((f) => f.id === rootFolderId);
  }

  async folderAccess(
    user: { id: string; email: string },
    folderId: string,
  ): Promise<FolderAccess> {
    const ancestors = await this.ancestorsOf(folderId);
    const folder = ancestors[ancestors.length - 1];
    if (!folder || folder.id !== folderId) {
      throw new NotFoundException('Folder not found');
    }

    const room = await this.prisma.dataRoom.findUnique({
      where: { id: folder.dataRoomId },
    });
    if (!room) throw new NotFoundException('Data Room not found');
    if (room.ownerId === user.id) return { access: 'owner', folder, ancestors };

    const share = await this.prisma.share.findFirst({
      where: {
        type: 'USER',
        granteeEmail: user.email,
        OR: [
          { dataRoomId: room.id },
          { folderId: { in: ancestors.map((f) => f.id) } },
        ],
      },
    });
    if (!share) throw new ForbiddenException('You do not have access');
    return { access: 'shared', folder, ancestors, viaFolderId: share.folderId };
  }

  async fileAccess(
    user: { id: string; email: string },
    fileId: string,
  ): Promise<{ access: AccessLevel; file: File }> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');

    const room = await this.prisma.dataRoom.findUnique({
      where: { id: file.dataRoomId },
    });
    if (!room) throw new NotFoundException('Data Room not found');
    if (room.ownerId === user.id) return { access: 'owner', file };

    const ancestors = await this.ancestorsOf(file.folderId);
    const share = await this.prisma.share.findFirst({
      where: {
        type: 'USER',
        granteeEmail: user.email,
        OR: [
          { fileId: file.id },
          { dataRoomId: room.id },
          { folderId: { in: ancestors.map((f) => f.id) } },
        ],
      },
    });
    if (!share) throw new ForbiddenException('You do not have access');
    return { access: 'shared', file };
  }

  /** Throws unless the user owns the folder's Data Room. */
  async assertFolderOwner(userId: string, folderId: string): Promise<Folder> {
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      include: { dataRoom: true },
    });
    if (!folder) throw new NotFoundException('Folder not found');
    if (folder.dataRoom.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can modify this Data Room');
    }
    return folder;
  }

  async assertFileOwner(userId: string, fileId: string): Promise<File> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { dataRoom: true },
    });
    if (!file) throw new NotFoundException('File not found');
    if (file.dataRoom.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can modify this Data Room');
    }
    return file;
  }

  async assertRoomOwner(userId: string, dataRoomId: string) {
    const room = await this.prisma.dataRoom.findUnique({
      where: { id: dataRoomId },
    });
    if (!room) throw new NotFoundException('Data Room not found');
    if (room.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can modify this Data Room');
    }
    return room;
  }

  /** Recursive subtree aggregates, used for delete warnings and folder stats. */
  async subtreeStats(folderId: string) {
    const rows = await this.prisma.$queryRaw<
      { folders: bigint; files: bigint; size: bigint }[]
    >`
      WITH RECURSIVE sub AS (
        SELECT id FROM "Folder" WHERE id = ${folderId}
        UNION ALL
        SELECT f.id FROM "Folder" f JOIN sub s ON f."parentId" = s.id
      )
      SELECT
        (SELECT COUNT(*) - 1 FROM sub) AS folders,
        COUNT(fi.id) AS files,
        COALESCE(SUM(fi.size), 0) AS size
      FROM "File" fi
      WHERE fi."folderId" IN (SELECT id FROM sub)
    `;
    const r = rows[0];
    return {
      folders: Number(r?.folders ?? 0),
      files: Number(r?.files ?? 0),
      size: Number(r?.size ?? 0),
    };
  }

  /** Storage keys of every file in a folder subtree (for blob cleanup). */
  async subtreeStorageKeys(folderId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ storageKey: string }[]>`
      WITH RECURSIVE sub AS (
        SELECT id FROM "Folder" WHERE id = ${folderId}
        UNION ALL
        SELECT f.id FROM "Folder" f JOIN sub s ON f."parentId" = s.id
      )
      SELECT fi."storageKey" FROM "File" fi
      WHERE fi."folderId" IN (SELECT id FROM sub)
    `;
    return rows.map((r) => r.storageKey);
  }
}
