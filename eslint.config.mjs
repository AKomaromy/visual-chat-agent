// eslint-config-next ships native flat-config presets — importing them
// directly avoids the legacy FlatCompat bridge, which threw a circular-JSON
// error with this dependency combination (a real ecosystem incompatibility
// discovered while scaffolding, not a design choice).
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "node_modules/**", ".claude/**"],
  },
];

export default eslintConfig;
