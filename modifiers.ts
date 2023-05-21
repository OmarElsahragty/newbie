import { join } from "path";
import { plural } from "pluralize";
import { readFile } from "fs-extra";
import { capitalizeFirstLetter, writePartialModule } from "./utilities";
import { ModuleInterface } from "./types";

export const typesModifier = async (dist: string, modules: ModuleInterface[]) => {
  const path = join(dist, "src", "types", "types.ts");
  const file = (await readFile(path, "utf8")).trim();

  const authModule = modules.find(({ auth }) => auth?.identifier && auth?.password);

  const content = `${file.replaceAll(
    "$$$ request authorization $$$",
    !authModule?.singularName
      ? ""
      : `declare module "express-serve-static-core" {
  interface Request {
    client?: ${authModule.singularName}Interface;
  }
}`
  )}
\n\n${modules
    .map(
      ({ singularName }) =>
        `export interface ${capitalizeFirstLetter(
          singularName
        )}Interface extends EntityInformationInterface, z.infer<typeof schemas.${singularName}Schema> {};`
    )
    .join("\n")}`;

  return { path, content };
};

export const enumsModifier = async (dist: string, modules: ModuleInterface[]) => {
  const path = join(dist, "src", "types", "enums.ts");
  const file = (await readFile(path, "utf8")).trim();

  const authModule = modules.find(({ auth }) => auth?.identifier && auth?.password);

  const content = `${file.replaceAll(
    "$$$ authorization types $$$",
    !authModule
      ? ""
      : `export const AccessTypes = ["ADMIN", "APPROVED", "DENIED"] as const;
export type AccessTypesEnum = (typeof AccessTypes)[number];`
  )}\n\n
${modules
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
  .filter(item => item)}`;

  return { path, content };
};

export const routesModifier = async (dist: string, modules: ModuleInterface[]) => {
  const path = join(dist, "src", "routes", "index.ts");
  const file = (await readFile(path, "utf8")).trim();

  const authModule = modules.find(({ auth }) => auth?.identifier && auth?.password);

  const content = file
    .replaceAll(
      "$$$ import controllers $$$",
      modules.map(({ singularName }) => `${singularName?.toLocaleLowerCase()}Controller`).join(", ")
    )
    .replaceAll(
      "$$$ import routes $$$",
      modules
        .map(({ singularName }) =>
          singularName
            ? `import ${singularName.toLocaleLowerCase()}Routes from "./${singularName.toLocaleLowerCase()}.routes";`
            : ""
        )
        .join("\n")
    )
    .replaceAll(
      "$$$ use routes $$$",
      modules
        .map(({ singularName }) => (singularName ? `router.use(${singularName.toLocaleLowerCase()}Routes);` : ""))
        .join("\n")
    )
    .replaceAll(
      "$$$ import authentication schema $$$",
      authModule?.singularName
        ? `import { authSchema, ${authModule.singularName.toLocaleLowerCase()}Schema } from "../types";`
        : ""
    )
    .replaceAll(
      "$$$ authentication routes $$$",
      authModule?.singularName
        ? `router.route("/register").post(validateMiddleware(${authModule.singularName.toLocaleLowerCase()}Schema), ${authModule.singularName.toLocaleLowerCase()}Controller.create);
router.route("/authenticate").post(validateMiddleware(authSchema), ${authModule.singularName.toLocaleLowerCase()}Controller.authenticate);`
        : ""
    );

  return { path, content };
};

export default async (distPath: string, modules: ModuleInterface[]) => {
  await Promise.all([
    writePartialModule(distPath, modules, enumsModifier),
    writePartialModule(distPath, modules, typesModifier),
    writePartialModule(distPath, modules, routesModifier),
  ]);
};
