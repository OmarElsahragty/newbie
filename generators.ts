import { join } from "path";
import { plural } from "pluralize";
import kebabCase from "kebab-case";
import { ModuleInterface } from "./types";
import { camelPascalCase, writePartialModule } from "./utilities";
import { mongooseAttributesBuilder, zodBuilder, populationsBuilder } from "./helpers";

const routesGenerator = async (dist: string, module: ModuleInterface) => {
  const content = `
  import { Router } from "express";
  import { ${module.singularName}Controller } from "../controllers";
  import { validateMiddleware } from "../middleware";
  import { ${module.singularName}Schema } from "../types";

const router = Router();

router
  .route("/${kebabCase(module.pluralName!)}")
  .get(${module.singularName}Controller.list)
  .post(validateMiddleware(${module.singularName}Schema, { isArray: true }), ${
    module.singularName
  }Controller.bulkCreate);

router.route("/${kebabCase(module.singularName!)}").post(validateMiddleware(${module.singularName}Schema), ${
    module.singularName
  }Controller.create);

router
  .route("/${kebabCase(module.singularName!)}/:id")
  .get(${module.singularName}Controller.fetch)
  .put(validateMiddleware(${module.singularName}Schema), ${module.singularName}Controller.update)
  .delete(${module.singularName}Controller.delete);

export default router;`;

  return { path: join(dist, "src", "routes", `${kebabCase(module.singularName!)}.routes.ts`), content };
};

const controllerGenerator = async (dist: string, module: ModuleInterface) => {
  const content = `
  ${module.auth?.identifier && module.auth.password ? 'import { Request, Response, NextFunction } from "express";' : ""}
  import DefaultController from "./default.controller";
  import { ${module.singularName}Service } from "../services";
  import { ${camelPascalCase(module.singularName)}Interface } from "../types";
  
  class ${camelPascalCase(module.singularName)}Controller extends DefaultController<${camelPascalCase(
    module.singularName
  )}Interface> {
    constructor() {
      super(${module.singularName}Service);
    }

    ${
      module.auth?.identifier && module.auth.password
        ? `
      authenticate = async (req: Request, res: Response, next: NextFunction) => {
        return this.response(${module.singularName}Service.authenticate(req.body.${module.auth.identifier}, req.body.${module.auth.password}), res, next);
      };`
        : ""
    }
  }

  export default new ${camelPascalCase(module.singularName)}Controller();`;

  return { path: join(dist, "/src", "controllers", `/${kebabCase(module.singularName!)}.controller.ts`), content };
};

const serviceGenerator = async (dist: string, module: ModuleInterface) => {
  const importedTypes = [`${camelPascalCase(module.singularName)}Interface`];
  if (module.auth?.identifier && module.auth.password) importedTypes.push("UnauthorizedException");

  const content = `
  ${module.auth?.identifier && module.auth.password ? 'import { sign } from "jsonwebtoken";' : ""}
  import DefaultService from "./default.service";
  import { ${importedTypes.join(", ")} } from "../types";
  import { ${module.singularName}Repository } from "../database/repositories";
  ${
    module.auth?.identifier && module.auth.password
      ? 'import { verifyHash } from "../libraries"; import config from "../../config";'
      : ""
  }

  class ${camelPascalCase(module.singularName)}Service extends DefaultService<${camelPascalCase(
    module.singularName
  )}Interface> {
    constructor() {
      super(${module.singularName}Repository);
    }
    ${
      module.auth?.identifier && module.auth.password
        ? `
      // ************** authentication ************** //
      authenticate = async (email: string, password: string): Promise<{ client: Partial<UserInterface>; token: string }> => {
        const client = await ${module.singularName}Repository.findOne({ filter: { email, isDeleted: false } });
        if (!client || client.accessType === "DENIED" || !client.${module.auth.password} || !(await verifyHash(client.${module.auth.password}, password))) {
          throw new UnauthorizedException("Incorrect ${module.auth.identifier} or password");
        }
    
        return { client, token: \`Bearer \${sign({ _id: client._id }, config.jwt.secret, { expiresIn: config.jwt.lifeTime })}\` };
      };`
        : ""
    }
  }


  export const ${module.singularName}Service = new ${camelPascalCase(module.singularName)}Service();`;

  return { path: join(dist, "src", "services", `${kebabCase(module.singularName!)}.service.ts`), content };
};

const repositoryGenerator = async (dist: string, module: ModuleInterface) => {
  const content = `
  import DefaultRepository from "./default.repository";
  import { ${camelPascalCase(module.singularName)}Interface } from "../../types";
  import { ${module.singularName}Model } from "../models";
  
  class ${camelPascalCase(module.singularName)}Repository extends DefaultRepository<${camelPascalCase(
    module.singularName
  )}Interface> {
    constructor() {
      super(${module.singularName}Model, ${populationsBuilder(module)});
    }
  }
  export const ${module.singularName}Repository = new ${camelPascalCase(module.singularName)}Repository();`;

  return {
    path: join(dist, "src", "database", "repositories", `${kebabCase(module.singularName!)}.repository.ts`),
    content,
  };
};

const modelGenerator = async (dist: string, module: ModuleInterface) => {
  const attributes = module.auth?.identifier
    ? module.attributes.concat([
        { name: "accessType", type: "string", enum: ["ADMIN", "APPROVED", "DENIED"], default: "DENIED" },
      ])
    : module.attributes;

  const importedTypes = attributes
    ?.filter(attribute => attribute.enum)
    .map(({ name }) => `${camelPascalCase(plural(name))}`)
    .concat([`${camelPascalCase(module.singularName)}Interface`]);

  const content = `
  import { Schema, model } from "mongoose";
  import { schemas } from "../../../constants";
  import { ${importedTypes.join(", ")} } from "../../types";
  ${module.auth?.password ? 'import { createHash } from "../../libraries";' : ""}

  const ${module.singularName}Schema = new Schema<${camelPascalCase(module.singularName)}Interface>(
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
        const data = this.getUpdate() as ${camelPascalCase(module.singularName)}Interface;
        if (data?.${module.auth.password}) data.${module.auth.password} = await createHash(data.${
            module.auth.password
          });
        this.setUpdate(data);
        next();
      });`
        : ""
    }
    
    export const ${module.singularName}Model = model<${camelPascalCase(module.singularName)}Interface>(schemas.${
    module.singularName
  }, ${module.singularName}Schema);`;

  return { path: join(dist, "src", "database", "models", `${kebabCase(module.singularName!)}.model.ts`), content };
};

const schemasGenerator = async (dist: string, modules: ModuleInterface[]) => {
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
  ${zodBuilder(modules)}`;

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
