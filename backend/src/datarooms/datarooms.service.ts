import { Injectable, NotFoundException } from '@nestjs/common';
import { AccessService } from '../common/access.service';
import { sanitizeName } from '../common/names';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class DataRoomsService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
    private storage: StorageService,
  ) {}

  private async withRootFolder(room: { id: string; name: string; createdAt: Date }) {
    const root = await this.prisma.folder.findFirst({
      where: { dataRoomId: room.id, parentId: null },
      select: { id: true },
    });
    if (!root) throw new NotFoundException('Data Room root folder missing');
    return { ...room, rootFolderId: root.id };
  }

  async listOwned(userId: string) {
    const rooms = await this.prisma.dataRoom.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, createdAt: true },
    });
    return Promise.all(rooms.map((r) => this.withRootFolder(r)));
  }

  async create(userId: string, name: string) {
    const room = await this.prisma.dataRoom.create({
      data: {
        name: sanitizeName(name),
        ownerId: userId,
        folders: { create: { name: 'Root' } },
      },
      select: { id: true, name: true, createdAt: true },
    });
    return this.withRootFolder(room);
  }

  async rename(userId: string, roomId: string, name: string) {
    await this.access.assertRoomOwner(userId, roomId);
    const room = await this.prisma.dataRoom.update({
      where: { id: roomId },
      data: { name: sanitizeName(name) },
      select: { id: true, name: true, createdAt: true },
    });
    return this.withRootFolder(room);
  }

  async remove(userId: string, roomId: string) {
    await this.access.assertRoomOwner(userId, roomId);
    const files = await this.prisma.file.findMany({
      where: { dataRoomId: roomId },
      select: { storageKey: true },
    });
    await this.prisma.dataRoom.delete({ where: { id: roomId } });
    await this.storage.deleteMany(files.map((f) => f.storageKey));
    return { ok: true };
  }

  /** Full folder tree of a room — used by the "Move file" dialog. */
  async folderTree(userId: string, roomId: string) {
    await this.access.assertRoomOwner(userId, roomId);
    const folders = await this.prisma.folder.findMany({
      where: { dataRoomId: roomId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, parentId: true },
    });

    type Node = { id: string; name: string; children: Node[] };
    const nodes = new Map<string, Node>(
      folders.map((f) => [f.id, { id: f.id, name: f.name, children: [] }]),
    );
    let root: Node | null = null;
    for (const f of folders) {
      if (f.parentId && nodes.has(f.parentId)) {
        nodes.get(f.parentId)!.children.push(nodes.get(f.id)!);
      } else {
        root = nodes.get(f.id)!;
      }
    }
    return root;
  }

  /** Owner-only search across a whole Data Room by name. */
  async search(userId: string, roomId: string, query: string) {
    await this.access.assertRoomOwner(userId, roomId);
    const q = query.trim();
    if (!q) return { folders: [], files: [] };

    const [folders, files] = await Promise.all([
      this.prisma.folder.findMany({
        where: {
          dataRoomId: roomId,
          parentId: { not: null },
          name: { contains: q, mode: 'insensitive' },
        },
        orderBy: { name: 'asc' },
        take: 50,
      }),
      this.prisma.file.findMany({
        where: {
          dataRoomId: roomId,
          name: { contains: q, mode: 'insensitive' },
        },
        orderBy: { name: 'asc' },
        take: 50,
      }),
    ]);

    // Attach a readable path to each hit so results are navigable.
    const withPath = async (folderId: string) => {
      const chain = await this.access.ancestorsOf(folderId);
      return chain.map((f, i) => (i === 0 ? 'Data Room' : f.name)).join(' / ');
    };

    return {
      folders: await Promise.all(
        folders.map(async (f) => ({
          id: f.id,
          name: f.name,
          path: await withPath(f.parentId!),
        })),
      ),
      files: await Promise.all(
        files.map(async (f) => ({
          id: f.id,
          name: f.name,
          size: f.size,
          folderId: f.folderId,
          path: await withPath(f.folderId),
        })),
      ),
    };
  }
}
