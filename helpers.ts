import kebabCase from "kebab-case";
import { camelCase } from "camel-case";
import { plural, singular } from "pluralize";
import { camelPascalCase } from "./utilities";
import { AttributeInterface, ModuleInterface } from "./types";

const setAttributesRef = (attributes: AttributeInterface[], modulesNames: string[]): AttributeInterface[] => {
  return attributes.map(attribute => ({
    ...attribute,
    isRef: modulesNames.includes(attribute.type),
    attributes: attribute.attributes ? setAttributesRef(attribute.attributes, modulesNames) : undefined,
  }));
};

export const setModulesRef = (modules: ModuleInterface[]) => {
  const modulesNames = modules.reduce(
    (acc: string[], model) =>
      model.singularName && model.pluralName ? acc.concat([model.singularName, model.pluralName]) : acc,
    []
  );

  return modules.map(module => ({ ...module, attributes: setAttributesRef(module.attributes, modulesNames) }));
};

const zodAttributesBuilder = (attribute: AttributeInterface) => {
  let type = attribute.isRef ? `z.union([${singular(attribute.type)}Schema, z.string()])` : `z.${attribute.type}()`;

  if (attribute.enum) type = `z.enum(enums.${camelPascalCase(plural(attribute.name))})`;
  if (attribute.type === "object" && attribute.attributes) {
    type = `z.object({ ${attribute.attributes.map(attribute => zodAttributesBuilder(attribute)).join(", ")} })`;
  }

  if (attribute.array) type = `${type}.array()`;
  if (!attribute.required) type = `${type}.optional()`;

  return `${camelCase(attribute.name)}: ${type}`;
};

export const zodBuilder = (modules: ModuleInterface[]) => {
  return modules
    .map(({ attributes, ...module }) => ({
      ...module,
      attributes:
        module.auth?.identifier && module.auth.password
          ? attributes.filter(
              attribute =>
                module?.auth && module.auth.identifier !== attribute.name && module.auth.password !== attribute.name
            )
          : attributes,
    }))
    .map(module => {
      const isAuthModule = module.auth?.identifier && module.auth.password;

      return `export const ${module.singularName}Schema = ${
        isAuthModule ? "authSchema.merge(" : ""
      }z.object({ ${module.attributes.map(attribute => zodAttributesBuilder(attribute)).join(", ")} })${
        isAuthModule ? ")" : ""
      };`;
    })
    .join("\n\n");
};

export const mongooseAttributesBuilder = (attributes: AttributeInterface[]) => {
  return attributes
    .map(attribute => {
      let type = `${attribute.isRef ? "Schema.Types.ObjectId" : camelPascalCase(attribute.type)}`;
      if (attribute.type === "object" && attribute.attributes) {
        type = `new Schema({ ${mongooseAttributesBuilder(attribute.attributes)} },
      { _id: true, versionKey: false, timestamps: true }
        )`;
      }
      if (attribute.type === "string") type = `${type}, trim: true`;
      if (attribute.array) type = `[ ${type} ]`;

      let unique = attribute.unique ? "unique: true" : "";
      if (attribute.unique && !attribute.required) unique = `${unique}, sparse: true`;

      return `${camelCase(attribute.name)}:  { ${[
        `type: ${type}`,
        unique,
        attribute.required ? "required: true" : "",
        attribute.default ? `default: ${JSON.stringify(attribute.default)}` : "",
        attribute.isRef ? `ref: schemas.${camelCase(singular(attribute.type))}` : "",
        attribute.enum ? `enum: ${camelPascalCase(plural(attribute.name))}` : "",
      ]
        .filter(item => item)
        .join(", ")} }`;
    })
    .join(",\n");
};

const flattenAttributes = (moduleAttributes: AttributeInterface[], parent?: string) => {
  let attributes: AttributeInterface[] = [];

  moduleAttributes.forEach(({ name, ...attribute }) => {
    if (attribute?.attributes?.length)
      attributes = attributes.concat(flattenAttributes(attribute.attributes, camelCase(name)));
    else return attributes.push({ ...attribute, name: parent ? `${parent}.${camelCase(name)}` : camelCase(name) });
  });

  return attributes;
};

export const populationsBuilder = (module: ModuleInterface) => {
  const populations = flattenAttributes(module.attributes)
    .filter(attribute => attribute.isRef)
    .map(({ name }) => `{ path: "${name}" }`);

  return `[ ${populations.join(", ").trim()} ]`;
};

export const postmanCollectionBuilder = (modules: ModuleInterface[]) => {
  const authModule = modules.find(module => module.auth?.identifier && module.auth.password);

  const collection = modules.map(module => {
    return `
  {
    "name": "${kebabCase(module.singularName!)}",
    "item": [
      {
        "name": "fetch list",
        "request": {
          "method": "GET",
          "header": [],
          "url": {
            "raw": "{{base-URL}}/${kebabCase(module.pluralName!)}",
            "host": ["{{base-URL}}"],
            "path": ["${kebabCase(module.pluralName!)}"],
            "query": [
              {
                "key": "limit",
                "value": "10",
                "description": "(default: 10)"
              },
              {
                "key": "page",
                "value": "0",
                "description": "(default: 0)"
              },
              {
                "key": "sort",
                "value": "",
                "disabled": true
              },
              {
                "key": "direction",
                "value": "1",
                "description": "{ direction: -1; asc => 1 } (default: 1)",
                "disabled": true
              },
              {
                "key": "showAll",
                "value": "true",
                "description": "(default: false)",
                "disabled": true
              },
              {
                "key": "projection",
                "description": "selected felids comma separated",
                "disabled": true
              },
              {
                "key": "filter",
                "description": "stringified search filter",
                "disabled": true
              },
              {
                "key": "operation",
                "description": "search filter operation { operation: and | or } (default: and)",
                "disabled": true
              },
              {
                "key": "intervals",
                "description": "intervals search filter { filed: string;  minimum?: number;  maximum?: number; }[]",
                "disabled": true
              }
            ]
          }
        },
        "response": []
      },
      {
        "name": "fetch item",
        "request": {
          "method": "GET",
          "header": [],
          "url": {
            "raw": "{{base-URL}}/${kebabCase(module.singularName!)}/:id",
            "host": ["{{base-URL}}"],
            "path": ["${kebabCase(module.singularName!)}", ":id"],
            "variable": [
              {
                "key": "id",
                "value": ""
              }
            ]
          }
        },
        "response": []
      },
      {
        "name": "create",
        "request": {
          "method": "POST",
          "header": [],
          "body": {},
          "url": {
            "raw": "{{base-URL}}/${kebabCase(module.singularName!)}",
            "host": ["{{base-URL}}"],
            "path": ["${kebabCase(module.singularName!)}"]
            }
          },
          "response": []
        },
        {
          "name": "bulk-create",
          "request": {
            "method": "POST",
            "header": [],
            "body": {},
            "url": {
              "raw": "{{base-URL}}/${kebabCase(module.pluralName!)}",
              "host": ["{{base-URL}}"],
              "path": ["${kebabCase(module.pluralName!)}"]
            }
          },
          "response": []
        },
        {
          "name": "update",
          "request": {
            "method": "PUT",
            "header": [],
            "body": {},
            "url": {
              "raw": "{{base-URL}}/${kebabCase(module.singularName!)}/:id",
              "host": ["{{base-URL}}"],
              "path": ["${kebabCase(module.singularName!)}", ":id"],
              "variable": [
                {
                  "key": "id",
                  "value": ""
                  }
                ]
              }
            },
            "response": []
          },
          {
            "name": "delete",
            "request": {
            "method": "DELETE",
            "header": [],
            "url": {
              "raw": "{{base-URL}}/${kebabCase(module.singularName!)}/:id",
              "host": ["{{base-URL}}"],
              "path": ["${kebabCase(module.singularName!)}", ":id"],
              "variable": [
                {
                  "key": "id",
                  "value": ""
                }
              ]
            }
          },
          "response": []
        }
      ]
    }`;
  });

  if (authModule) {
    collection.unshift(
      `
      {
        "name": "auth",
        "items": [
          {
            "name": "authenticate",
            "request": {
              "method": "POST",
              "header": [],
              "url": {
                "raw": "{{base-URL}}/authenticate",
                "host": ["{{base-URL}}"],
                "path": ["authenticate"]
              }
            },
            "response": []
          },
          {
            "name": "register",
            "request": {
              "method": "POST",
              "header": [],
              "url": {
                "raw": "{{base-URL}}/register",
                "host": ["{{base-URL}}"],
                "path": ["register"]
              }
            },
            "response": []
          }
        ]
      }`
    );
  }

  return collection.join(",\n");
};
