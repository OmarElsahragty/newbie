import { z } from "zod";
import { camelCase } from "camel-case";
import { plural, singular } from "pluralize";
import { fromZodError } from "zod-validation-error";
import { AttributeInterface, ModuleInterface } from "./types";

export const attributeSchema: z.ZodSchema<AttributeInterface> = z.lazy(() =>
  z.object({
    name: z.string(),
    type: z.string(),
    unique: z.boolean().optional(),
    required: z.boolean().optional(),
    default: z.string().optional(),
    enum: z.array(z.string()).optional(),
    array: z.boolean().optional(),
    attributes: z.array(attributeSchema).optional(),
  })
);

export const moduleSchema = z.object({
  singularName: z.string().optional(),
  pluralName: z.string().optional(),
  attributes: z.array(attributeSchema),
  auth: z.object({ identifier: z.string(), password: z.string() }).optional(),
});

export default async (data: any[]) => {
  try {
    return Promise.all(
      data.map(async item => {
        const moduleName = Object.keys(item)[0];
        const module = await moduleSchema.parseAsync(item[moduleName]);
        // TODO: Add extra validation

        return Object.assign(module, {
          singularName: camelCase(singular(moduleName)),
          pluralName: camelCase(plural(moduleName)),
        }) as ModuleInterface;
      })
    );
  } catch (error) {
    throw error instanceof z.ZodError ? new Error(fromZodError(error).message) : error;
  }
};
