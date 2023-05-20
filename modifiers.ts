import { join } from "path";
import { plural } from "pluralize";
import { readFile } from "fs-extra";
import { capitalizeFirstLetter, writePartialModule } from "./utilities";
import { ModuleInterface } from "./types";

export const typesGenerator = async (dist: string, modules: ModuleInterface[]) => {
  const path = join(dist, "src", "types", "types.ts");
  const file = (await readFile(path, "utf8")).trim();

  const content = `${file.replace(
    "$$$$$$$$$$$  authorization $$$$$$$$$$$",
    modules.findIndex(({ auth }) => auth?.identifier && auth?.password) !== -1
      ? `declare module "express-serve-static-core" {
  interface Request {
    client?: ${modules
      .filter(({ auth }) => auth?.identifier && auth?.password)
      .map(({ singularName }) => `${singularName}Interface`)
      .join(" | ")};
  }
}`
      : ""
  )}\n\n${modules
    .map(
      ({ singularName }) =>
        `export interface ${capitalizeFirstLetter(
          singularName
        )}Interface extends EntityInformationInterface, z.infer<typeof schemas.${singularName}Schema> {};`
    )
    .join("\n")}`.trim();

  return { path, content };
};

export const enumsGenerator = async (dist: string, modules: ModuleInterface[]) => {
  const path = join(dist, "src", "types", "enums.ts");
  const file = (await readFile(path, "utf8")).trim();

  const content = `${file}\n\n${modules
    .reduce((acc: string[], module) => {
      return acc.concat(
        module.attributes.map(attribute => {
          if (!attribute.enum?.length) return "";

          return `export const ${capitalizeFirstLetter(plural(attribute.name))} = [${attribute.enum.map(value =>
            JSON.stringify(value)
          )}] as const;
export type ${capitalizeFirstLetter(attribute.name)}Enum = (typeof ${capitalizeFirstLetter(
            plural(attribute.name)
          )})[number];`;
        })
      );
    }, [])
    .filter(item => item)}`.trim();

  return { path, content };
};

export const schemasGenerator = async (dist: string, modules: ModuleInterface[]) => {
  const path = join(dist, "src", "types", "schemas.ts");
  const file = (await readFile(path, "utf8")).trim();
  const content = `${file}\n\n`;
  return { path, content };
};

export default async (distPath: string, modules: ModuleInterface[]) => {
  await Promise.all([
    writePartialModule(distPath, modules, enumsGenerator),
    writePartialModule(distPath, modules, schemasGenerator),
    writePartialModule(distPath, modules, typesGenerator),
  ]);
};
