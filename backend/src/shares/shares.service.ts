import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Share } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AccessService } from '../common/access.service';
import { PrismaService } from '../prisma/prisma.service';

export type ResourceType = 'DATAROOM' | 'FOLDER' | 'FILE';

@Injectable()
export class SharesService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  private targetFor(resourceType: ResourceType, resourceId: string) {
    return {
      dataRoomId: resourceType === 'DATAROOM' ? resourceId : null,
      folderId: resourceType === 'FOLDER' ? resourceId : null,
      fileId: resourceType === 'FILE' ? resourceId : null,
    };
  }

  private async assertOwnsResource(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
  ) {
    if (resourceType === 'DATAROOM') {
      await this.access.assertRoomOwner(userId, resourceId);
    } else if (resourceType === 'FOLDER') {
      const folder = await this.access.assertFolderOwner(userId, resourceId);
      if (!folder.parentId) {
        throw new BadRequestException(
          'Share the Data Room itself instead of its root folder',
        );
      }
    } else {
      await this.access.assertFileOwner(userId, resourceId);
    }
  }

  async createLink(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
  ) {
    await this.assertOwnsResource(userId, resourceType, resourceId);
    const existing = await this.prisma.share.findFirst({
      where: { type: 'LINK', ...this.targetFor(resourceType, resourceId) },
    });
    if (existing) return existing;

    return this.prisma.share.create({
      data: {
        type: 'LINK',
        token: randomBytes(24).toString('base64url'),
        createdById: userId,
        ...this.targetFor(resourceType, resourceId),
      },
    });
  }

  async createUserShare(
    user: { id: string; email: string },
    resourceType: ResourceType,
    resourceId: string,
    email: string,
  ) {
    await this.assertOwnsResource(user.id, resourceType, resourceId);
    const granteeEmail = email.trim().toLowerCase();
    if (granteeEmail === user.email) {
      throw new BadRequestException('You already own this Data Room');
    }

    const existing = await this.prisma.share.findFirst({
      where: {
        type: 'USER',
        granteeEmail,
        ...this.targetFor(resourceType, resourceId),
      },
    });
    if (existing) return existing;

    return this.prisma.share.create({
      data: {
        type: 'USER',
        granteeEmail,
        createdById: user.id,
        ...this.targetFor(resourceType, resourceId),
      },
    });
  }

  async listForResource(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
  ) {
    await this.assertOwnsResource(userId, resourceType, resourceId);
    return this.prisma.share.findMany({
      where: this.targetFor(resourceType, resourceId),
      orderBy: { createdAt: 'asc' },
    });
  }

  async revoke(userId: string, shareId: string) {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
    });
    if (!share) throw new NotFoundException('Share not found');
    if (share.createdById !== userId) {
      throw new ForbiddenException('Only the owner can revoke access');
    }
    await this.prisma.share.delete({ where: { id: shareId } });
    return { ok: true };
  }

  /** Everything shared to the current user's email, with display metadata. */
  async sharedWithMe(email: string) {
    const shares = await this.prisma.share.findMany({
      where: { type: 'USER', granteeEmail: email },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { name: true, email: true } },
        dataRoom: { select: { id: true, name: true } },
        folder: { select: { id: true, name: true } },
        file: { select: { id: true, name: true, size: true, mimeType: true } },
      },
    });

    return Promise.all(
      shares.map(async (s) => {
        let item;
        if (s.dataRoom) {
          const root = await this.prisma.folder.findFirst({
            where: { dataRoomId: s.dataRoom.id, parentId: null },
            select: { id: true },
          });
          item = {
            kind: 'DATAROOM' as const,
            name: s.dataRoom.name,
            folderId: root?.id,
          };
        } else if (s.folder) {
          item = {
            kind: 'FOLDER' as const,
            name: s.folder.name,
            folderId: s.folder.id,
          };
        } else if (s.file) {
          item = { kind: 'FILE' as const, name: s.file.name, file: s.file };
        } else {
          return null; // target was deleted; cascades normally prevent this
        }
        return {
          id: s.id,
          sharedBy: s.createdBy,
          sharedAt: s.createdAt,
          ...item,
        };
      }),
    ).then((rows) => rows.filter(Boolean));
  }

  // ---------- Public link resolution ----------

  async resolveToken(token: string): Promise<Share> {
    const share = await this.prisma.share.findUnique({ where: { token } });
    if (!share || share.type !== 'LINK') {
      throw new NotFoundException(
        'This link is invalid or its access has been revoked',
      );
    }
    return share;
  }

  /** Root descriptor for the public share page. */
  async publicRoot(token: string) {
    const share = await this.resolveToken(token);

    if (share.fileId) {
      const file = await this.prisma.file.findUnique({
        where: { id: share.fileId },
        select: { id: true, name: true, size: true, mimeType: true },
      });
      if (!file) throw new NotFoundException('The shared file was deleted');
      return { type: 'FILE' as const, name: file.name, file };
    }

    if (share.folderId) {
      const folder = await this.prisma.folder.findUnique({
        where: { id: share.folderId },
        select: { id: true, name: true },
      });
      if (!folder) throw new NotFoundException('The shared folder was deleted');
      return { type: 'FOLDER' as const, name: folder.name, rootFolderId: folder.id };
    }

    const room = await this.prisma.dataRoom.findUnique({
      where: { id: share.dataRoomId! },
      select: { id: true, name: true },
    });
    if (!room) throw new NotFoundException('The shared Data Room was deleted');
    const root = await this.prisma.folder.findFirst({
      where: { dataRoomId: room.id, parentId: null },
      select: { id: true },
    });
    return { type: 'DATAROOM' as const, name: room.name, rootFolderId: root?.id };
  }

  /** Read-only listing of a folder inside a shared subtree. */
  async publicFolder(token: string, folderId: string) {
    const share = await this.resolveToken(token);
    if (share.fileId) {
      throw new ForbiddenException('This link only shares a single file');
    }

    const ancestors = await this.access.ancestorsOf(folderId);
    const folder = ancestors[ancestors.length - 1];
    if (!folder || folder.id !== folderId) {
      throw new NotFoundException('Folder not found');
    }
    this.assertInScope(share, folder.dataRoomId, ancestors.map((f) => f.id));

    const rootId = share.folderId ?? ancestors[0].id;
    const rootIndex = ancestors.findIndex((f) => f.id === rootId);

    const [folders, files, root] = await Promise.all([
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
      this.publicRoot(token),
    ]);

    return {
      folder: { id: folder.id, name: folder.name },
      breadcrumb: ancestors
        .slice(rootIndex)
        .map((f, i) => ({ id: f.id, name: i === 0 ? root.name : f.name })),
      folders,
      files,
    };
  }

  /** Access check before streaming a file through a public link. */
  async publicFile(token: string, fileId: string) {
    const share = await this.resolveToken(token);
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');

    if (share.fileId) {
      if (share.fileId !== file.id) {
        throw new ForbiddenException('This link does not cover that file');
      }
      return file;
    }
    const ancestors = await this.access.ancestorsOf(file.folderId);
    this.assertInScope(share, file.dataRoomId, ancestors.map((f) => f.id));
    return file;
  }

  private assertInScope(
    share: Share,
    dataRoomId: string,
    ancestorFolderIds: string[],
  ) {
    const ok = share.dataRoomId
      ? share.dataRoomId === dataRoomId
      : share.folderId
        ? ancestorFolderIds.includes(share.folderId)
        : false;
    if (!ok) {
      throw new ForbiddenException('This link does not cover that folder');
    }
  }
}
