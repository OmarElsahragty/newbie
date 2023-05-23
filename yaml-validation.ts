import { parse, stringify } from "yaml";
import { promises as fs } from "fs";
import { resolve } from "path";

interface Attribute {
  name: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  array?: boolean;
  attributes?: Attribute[];
  Default?: string | number;
  Enum?: (string | number)[];
}

interface Model {
  [modelName: string]: {
    attributes?: Attribute[];
    auth?: Record<string, string>;
    line?: number;
  };
}

export async function validateAndConvertYaml(yamlFilePath: string): Promise<Model> {
  try {
    // Read the YAML file
    const yamlString = await fs.readFile(resolve(yamlFilePath), "utf8");

    // Parse YAML string to JavaScript object
    const yamlObject = (await parse(yamlString, { lineCounter: true } as any)) as Model;

    // Validate the existence of models
    if (Object.keys(yamlObject).length === 0) {
      throw new Error("Invalid YAML file: No models found.");
    }

    // Validate and convert the YAML object
    const validatedObject: Model = {};

    for (const modelName in yamlObject) {
      const model = yamlObject[modelName];

      // Validate the existence of the 'attributes' property
      if (!model.attributes) {
        const lineNumber = model.line || 0;
        throw new Error(
          `Invalid YAML file: Missing 'attributes' property in model '${modelName}' (Line ${lineNumber}).`
        );
      }

      const validatedAttributes: Attribute[] = validateAttributes(model.attributes);

      const validatedModelName = validateModelName(modelName);

      validatedObject[validatedModelName] = {
        ...model,
        attributes: validatedAttributes,
      };
    }

    return validatedObject;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error("An error occurred while processing the YAML file.");
    }
  }
}

function validateAttributes(attributes: Attribute[]): Attribute[] {
  const validatedAttributes: Attribute[] = [];

  for (const attribute of attributes) {
    if (attribute.attributes) {
      const validatedNestedAttributes = validateAttributes(attribute.attributes);
      validatedAttributes.push({ ...attribute, attributes: validatedNestedAttributes });
    } else {
      const validatedAttribute: Attribute = {
        ...attribute,
        type: convertToNumberType(attribute.type),
      };
      validatedAttributes.push(validatedAttribute);
    }
  }

  return validatedAttributes;
}

function convertToNumberType(type: string): string {
  // Convert numerical types to "number"
  if (type === "number" || type === "int" || type === "float" || type === "double" || type === "decimal") {
    return "number";
  }

  return type;
}

function validateModelName(modelName: string): string {
  // Convert everything to lowercase except the first letter
  const lowercasedModelName = modelName.toLowerCase();
  const validatedModelName = lowercasedModelName.charAt(0).toUpperCase() + lowercasedModelName.slice(1);

  return validatedModelName;
}
