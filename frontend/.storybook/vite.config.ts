import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const storybookDirectory = path.dirname(fileURLToPath(import.meta.url));
const mightyMikeRaceCarFixture = path.resolve(
  storybookDirectory,
  "fixtures/mightyMikeRaceCar.c",
);

export default defineConfig({
  publicDir: path.resolve(storybookDirectory, "../public"),
  plugins: [
    {
      name: "storybook-item-screenshot-mount",
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          if (request.url?.startsWith("/PangeaRSEdit/item-screenshots/")) request.url = request.url.slice("/PangeaRSEdit".length);
          next();
        });
      },
    },
    {
      name: "storybook-mighty-mike-source-fixture",
      enforce: "pre",
      resolveId(source) {
        return source.endsWith("games/mightymike/src/Enemies/Bargain/RaceCar.c?raw")
          ? `${mightyMikeRaceCarFixture}?raw`
          : null;
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(storybookDirectory, "../src"),
    },
  },
});
