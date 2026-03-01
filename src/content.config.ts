import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const manhattanChallenge = defineCollection({
  loader: glob({
    pattern: "**/*.mdx",
    base: "./src/content/manhattan-challenge",
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    slug: z.string(),
    distance_miles: z.number(),
    duration_minutes: z.number(),
    neighborhoods: z.array(z.string()),
    gpx_file: z.string(),
  }),
});

export const collections = {
  "manhattan-challenge": manhattanChallenge,
};
