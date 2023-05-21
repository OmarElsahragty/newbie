import { join } from "path";
import { plural } from "pluralize";
import { ModuleInterface } from "./types";
import { mongooseAttributesBuilder, zodBuilder } from "./helpers";
import { capitalizeFirstLetter, writePartialModule } from "./utilities";

export const routesGenerator = async (dist: string, module: ModuleInterface) => {
  const content = `
  import { Router } from "express";
  import { ${module.singularName}Controller } from "../controllers";
  import { validateMiddleware } from "../middleware";
  import { ${module.singularName}Schema } from "../types";

const router = Router();

router
  .route("/${module.pluralName}")
  .get(${module.singularName}Controller.list)
  .post(validateMiddleware(${module.singularName}Schema, { isArray: true }), ${module.singularName}Controller.bulkCreate);

router.route("/${module.singularName}.").post(validateMiddleware(${module.singularName}Schema), ${module.singularName}Controller.create);

router
  .route("/${module.singularName}./:id")
  .get(${module.singularName}Controller.get)
  .put(validateMiddleware(${module.singularName}Schema), ${module.singularName}Controller.update)
  .delete(${module.singularName}Controller.delete);

export default router;`;

  return { path: join(dist, "src", "routes", `${module.singularName}.routes.ts`), content };
};

export const controllerGenerator = async (dist: string, module: ModuleInterface) => {
  const content = `
  import { Request, Response, NextFunction } from "express";
  import DefaultController from "./default.controller";
  import { ${module.singularName}Service } from "../services";
  import { ${capitalizeFirstLetter(module.singularName)}Interface } from "../types";
  
  class ${capitalizeFirstLetter(module.singularName)}Controller extends DefaultController<${capitalizeFirstLetter(
    module.singularName
  )}Interface> {
    constructor() {
      super(${module.singularName}Service);
    }
  }

  export default new ${capitalizeFirstLetter(module.singularName)}Controller();`;

  return { path: join(dist, "/src", "controllers", `/${module.singularName}.controller.ts`), content };
};

export const serviceGenerator = async (dist: string, module: ModuleInterface) => {
  const content = `
  import DefaultRepository from "./default.repository";
  import { ${capitalizeFirstLetter(module.singularName)}Interface } from "../../types";
  import { ${module.singularName}Model } from "../models";

  class ${capitalizeFirstLetter(module.singularName)}Repository extends DefaultRepository<${capitalizeFirstLetter(
    module.singularName
  )}Interface> {
    constructor() {
      super(${module.singularName}Model);
    }
  }
  export const ${module.singularName}Repository = new ${capitalizeFirstLetter(module.singularName)}Repository();`;

  return { path: join(dist, "src", "services", `${module.singularName}.service.ts`), content };
};

export const repositoryGenerator = async (dist: string, module: ModuleInterface) => {
  const content = `
  import DefaultRepository from "./default.repository";
  import { ${capitalizeFirstLetter(module.singularName)}Interface } from "../../types";
  import { ${module.singularName}Model } from "../models";
  
  class ${capitalizeFirstLetter(module.singularName)}Repository extends DefaultRepository<${capitalizeFirstLetter(
    module.singularName
  )}Interface> {
    constructor() {
      super(${module.singularName}Model);
    }
  }
  export const ${module.singularName}Repository = new ${capitalizeFirstLetter(module.singularName)}Repository();`;

  return { path: join(dist, "src", "repositories", `${module.singularName}.repository.ts`), content };
};

export const modelGenerator = async (dist: string, module: ModuleInterface) => {
  const attributes = module.auth?.identifier
    ? module.attributes.concat([
        { name: "accessType", type: "string", enum: ["ADMIN", "APPROVED", "DENIED"], default: "DENIED" },
      ])
    : module.attributes;

  const importedTypes = attributes
    ?.filter(attribute => attribute.enum)
    .map(({ name }) => `${capitalizeFirstLetter(plural(name))}`)
    .concat([`${capitalizeFirstLetter(module.singularName)}Interface`]);

  const content = `
  import { Schema, model } from "mongoose";
  import { schemas } from "../../../constants";
  import { ${importedTypes.join(", ")} } from "../../types";
  ${module.auth?.password ? 'import { createHash } from "../../libraries";' : ""}

  const ${module.singularName}Schema = new Schema<${capitalizeFirstLetter(module.singularName)}Interface>(
    {
      ${mongooseAttributesBuilder(attributes)},
      isDeleted: { type: Boolean, default: false, required: false },
    },
    { timestamps: true, versionKey: false }
    )
    ${module.auth?.identifier ? `.index({ ${module.auth.identifier}: 1 })\n.index({ accessType: 1 })` : ""}
    .index({ isDeleted: 1 });
    
    ${
      module.auth?.password
        ? `// ************** hash ************** //
      ${module.singularName}Schema.pre("save", async function (next) {
        if (!this.isModified("${module.auth.password}")) return next();
        if (this.${module.auth.password}) this.${module.auth.password} = await createHash(this.${module.auth.password});
        next();
      });
      
      ${module.singularName}Schema.pre("findOneAndUpdate", async function (next) {
        const data = this.getUpdate() as ${capitalizeFirstLetter(module.singularName)}Interface;
        if (data?.${module.auth.password}) data.${module.auth.password} = await createHash(data.${
            module.auth.password
          });
        this.setUpdate(data);
        next();
      });`
        : ""
    }
    
    export const ${module.singularName}Model = model<${capitalizeFirstLetter(module.singularName)}Interface>(schemas.${
    module.singularName
  }, ${module.singularName}Schema);`;

  return { path: join(dist, "src", "database", "models", `${module.singularName}.model.ts`), content };
};

export const schemasGenerator = async (dist: string, modules: ModuleInterface[]) => {
  const authModule = modules.find(({ auth }) => auth?.identifier && auth?.password);
  const content = `
  import { z } from "zod";
  import * as enums from "./enums";
  
  ${
    !authModule?.auth?.identifier || !authModule?.auth?.password
      ? ""
      : `export const authSchema = z.object({
      ${authModule.auth.identifier}: z.string().email(),
      ${authModule.auth.password}: z.string(),
      accessType: z.enum(enums.AccessTypes).optional(),
    });\n`
  }
  \n// ********************************* //\n
  ${zodBuilder(modules, { authModule })}`;

  return { path: join(dist, "src", "types", "schemas.ts"), content };
};

export default async (distPath: string, modules: ModuleInterface[]) => {
  await writePartialModule(distPath, modules, schemasGenerator);

  await Promise.all(
    modules.map(module => {
      return Promise.all([
        writePartialModule(distPath, module, routesGenerator),
        writePartialModule(distPath, module, controllerGenerator),
        writePartialModule(distPath, module, serviceGenerator),
        writePartialModule(distPath, module, repositoryGenerator),
        writePartialModule(distPath, module, modelGenerator),
      ]);
    })
  );
};
