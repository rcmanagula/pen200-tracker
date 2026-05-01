// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  // For a user/organization site repo named USERNAME.github.io, set base to "/".
  // For a project repo, set base to "/repo-name" such as "/pen200-tracker".
  site: "https://rcmanagula.github.io",
  base: "/pen200-tracker",
  output: "static",
  integrations: [],
});
