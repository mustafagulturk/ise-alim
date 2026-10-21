import { Global, Injectable, Module } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { config } from "./config";

/** CV dosyalarını diskte saklar. Anahtar tahmin edilemez, dosyalar dışarı doğrudan açılmaz. */
@Injectable()
export class StorageService {
  private readonly root = resolve(config().STORAGE_DIR);

  async save(buffer: Buffer, originalName: string) {
    const now = new Date();
    const dir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
    const key = `${dir}/${randomUUID()}${extname(originalName).toLowerCase()}`;
    await mkdir(join(this.root, dir), { recursive: true });
    await writeFile(join(this.root, key), buffer);
    return key;
  }

  read(key: string) {
    if (key.includes("..")) throw new Error("Geçersiz dosya anahtarı");
    return readFile(join(this.root, key));
  }
}

@Global()
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
