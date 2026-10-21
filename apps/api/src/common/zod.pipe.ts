import { BadRequestException, PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

/** Gövdeyi zod şemasıyla doğrular, hataları alan bazında Türkçe döner. */
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "_";
      fields[key] ??= issue.message;
    }
    throw new BadRequestException({ message: "Lütfen formdaki hataları düzeltin.", fields });
  }
}
