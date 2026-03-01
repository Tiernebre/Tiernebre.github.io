import { describe, it, expect } from "vitest";
import { SITE_TITLE, SITE_URL, pageTitle } from "./meta";

describe("meta", () => {
  it("exports the site title", () => {
    expect(SITE_TITLE).toBe("Brendan Tierney");
  });

  it("exports the site URL", () => {
    expect(SITE_URL).toBe("https://tiernebre.github.io");
  });

  describe("pageTitle", () => {
    it("formats a page title with the site title", () => {
      expect(pageTitle("About")).toBe("About | Brendan Tierney");
    });
  });
});
