import { resolve } from "path";
import { camelCase } from "camel-case";
import { outputFile, pathExists, remove } from "fs-extra";

export const camelPascalCase = (text?: string) => {
  if (!text) return "";
  return `${text.charAt(0).toUpperCase()}${camelCase(text.slice(1))}`;
};

export const writePartialModule = async <T>(
  dist: string,
  module: T,
  generator: (dist: string, module: T) => Promise<{ path: string; content?: string }>
) => {
  const file = await generator(dist, module);
  if (!file?.content) {
    if (await pathExists(resolve(file.path))) await remove(resolve(file.path));
    return;
  }
  return outputFile(resolve(file.path), file.content.trim(), { encoding: "utf8" });
};
