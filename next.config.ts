import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // base-ds is a `file:` link to ../../../node/base-ds, a directory
    // outside this project root. Turbopack won't resolve files outside its
    // root unless told to — widen the root to the common ancestor.
    //
    // base-ds also shipped its own node_modules/react, a duplicate React
    // instance that broke hooks used by base-ds components (e.g. lucide-react
    // icons). Fixed by symlinking base-ds's node_modules/react(-dom) to this
    // project's copies instead of aliasing here (Turbopack's resolveAlias
    // doesn't accept absolute paths — it treats them as server-relative
    // imports and fails to resolve).
    root: path.resolve(__dirname, "..", "..", ".."),
  },
};

export default nextConfig;
