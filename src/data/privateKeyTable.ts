// privateKeyTable.ts

import { PrivateKey, User } from '@prisma/client';
import prisma from "./Client";

export class PrivateKeyTable {

  private static MAX_DROPS_PER_KEY = 10;


  dropsLeft(pk: PrivateKey): number {
    return pk.drops > PrivateKeyTable.MAX_DROPS_PER_KEY ? 0 : PrivateKeyTable.MAX_DROPS_PER_KEY - pk.drops;
  }

  public static async savePrivateKeyForUser(u: User, privateKeyId: string, address: string): Promise<PrivateKey> {
    return await prisma.privateKey.create({
      data: {
        userID: u.id,
        turnkeyUUID: privateKeyId,
        ethereumAddress: address,
      },
    });
  }

  public static async getPrivateKeyForUser(u: User): Promise<PrivateKey | null> {
    return await prisma.privateKey.findUnique({
      where: {
        id: u.id,
      },
    });
  }

  public static async recordDropForPrivateKey(pk: PrivateKey): Promise<PrivateKey> {
    const dropsCount = pk.drops + 1;
    return await prisma.privateKey.update({
      where: {
        id: pk.id,
      },
      data: {
        drops: dropsCount,
      },
    });
  }
}
