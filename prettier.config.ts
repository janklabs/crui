import type { Config } from "prettier"

const config: Config = {
  semi: false,
  singleQuote: false,
  trailingComma: "all",
  tabWidth: 2,
  printWidth: 80,
  plugins: [
    "@ianvs/prettier-plugin-sort-imports",
    "prettier-plugin-tailwindcss",
  ],
  importOrder: [
    "^react$",
    "",
    "^next",
    "",
    "<THIRD_PARTY_MODULES>",
    "",
    "^@/(.*)$",
    "^[./]",
  ],
  importOrderTypeScriptVersion: "5.8.2",
}

export default config
