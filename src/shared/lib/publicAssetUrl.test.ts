import { afterEach, describe, expect, it, vi } from "vitest";
import { publicAssetUrl } from "./publicAssetUrl";

afterEach(() => vi.unstubAllEnvs());
describe("publicAssetUrl", () => {
  it("keeps public images at the root in local development", () => {
    vi.stubEnv("BASE_URL", "/");
    expect(publicAssetUrl("/images/notes/books.webp")).toBe("/images/notes/books.webp");
  });
  it("pins static and dynamic image paths to the release directory", () => {
    vi.stubEnv("BASE_URL", "/releases/abc/");
    expect(publicAssetUrl("/images/hero.jpg")).toBe("/releases/abc/images/hero.jpg");
    const image = "books";
    expect(publicAssetUrl(`/images/notes/${image}.webp`)).toBe("/releases/abc/images/notes/books.webp");
  });
});
