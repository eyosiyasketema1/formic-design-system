// Strict flat config, deliberately with NO `ignores`: the vendored Formic
// folder is linted like everything else, which is what an existing project
// does until someone adds an ignore. Raw useEffect is banned (a house rule
// some teams have; Formic's components use useEffect).
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='useEffect']",
          message: "Raw useEffect is banned in this codebase; use a named hook.",
        },
        {
          selector: "MemberExpression[object.name='React'][property.name='useEffect']",
          message: "Raw React.useEffect is banned in this codebase; use a named hook.",
        },
      ],
      "no-console": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    },
  },
);
