import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    REGISTRY_URL: z
      .string()
      .transform((val) => (!/^https?:\/\//i.test(val) ? `https://${val}` : val))
      .pipe(z.string().url()),
    DISPLAY_REGISTRY_URL: z.string().optional(),
    REGISTRY_USERNAME: z.string().optional(),
    REGISTRY_PASSWORD: z.string().optional(),
    SESSION_SECRET: z
      .string()
      .min(32, "SESSION_SECRET must be at least 32 characters"),
  },

  client: {},

  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    REGISTRY_URL: process.env.REGISTRY_URL,
    DISPLAY_REGISTRY_URL: process.env.DISPLAY_REGISTRY_URL,
    REGISTRY_USERNAME: process.env.REGISTRY_USERNAME,
    REGISTRY_PASSWORD: process.env.REGISTRY_PASSWORD,
    SESSION_SECRET: process.env.SESSION_SECRET,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})
