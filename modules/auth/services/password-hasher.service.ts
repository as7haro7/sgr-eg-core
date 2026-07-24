import {
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";

const KEY_LENGTH = 64;
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const HASH_PREFIX = "scrypt";

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      {
        N: COST,
        r: BLOCK_SIZE,
        p: PARALLELIZATION,
        maxmem: 64 * 1024 * 1024,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

export class PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const derivedKey = await deriveKey(password, salt);

    return [
      HASH_PREFIX,
      COST,
      BLOCK_SIZE,
      PARALLELIZATION,
      salt.toString("base64url"),
      derivedKey.toString("base64url"),
    ].join("$");
  }

  async verify(password: string, encodedHash: string): Promise<boolean> {
    const [prefix, cost, blockSize, parallelization, salt, storedKey] =
      encodedHash.split("$");

    if (
      prefix !== HASH_PREFIX ||
      Number(cost) !== COST ||
      Number(blockSize) !== BLOCK_SIZE ||
      Number(parallelization) !== PARALLELIZATION ||
      !salt ||
      !storedKey
    ) {
      return false;
    }

    const expectedKey = Buffer.from(storedKey, "base64url");
    const derivedKey = await deriveKey(
      password,
      Buffer.from(salt, "base64url"),
    );

    return (
      expectedKey.length === derivedKey.length &&
      timingSafeEqual(expectedKey, derivedKey)
    );
  }
}
