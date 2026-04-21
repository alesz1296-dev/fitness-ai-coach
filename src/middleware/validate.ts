import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Express middleware factory — validates request data against a Zod schema.
 * @param schema  Zod schema to validate against
 * @param source  Which part of the request to validate (default: "body")
 */
export const validate =
  (schema: ZodSchema, source: "body" | "query" | "params" = "body") =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      // Replace with parsed (coerced) values so controllers get clean data
      req[source] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));

        res.status(400).json({
          error: "Validation failed",
          details: errors,
        });
        return;
      }
      next(error);
    }
  };

/**
 * Validates that a route param is a valid integer ID.
 * Converts string → number and replaces req.params with parsed values.
 */
export const validateIdParam =
  (paramName = "id") =>
  (req: Request, res: Response, next: NextFunction): void => {
    const raw = req.params[paramName];
    const parsed = Number(raw);

    if (!raw || isNaN(parsed) || !Number.isInteger(parsed) || parsed < 1) {
      res.status(400).json({
        error: `Invalid ${paramName}: must be a positive integer`,
      });
      return;
    }

    // Store as number for controllers to use
    (req as any).validatedParams = {
      ...(req as any).validatedParams,
      [paramName]: parsed,
    };
    next();
  };
