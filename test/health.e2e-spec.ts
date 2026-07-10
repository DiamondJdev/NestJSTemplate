import request from "supertest";
import { createTestApp, closeTestApp, TestAppContext } from "./support/test-app";

describe("Health (e2e)", () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it("GET /health returns 200 with healthy database and cache", async () => {
    const response = await request(ctx.app.getHttpServer()).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.database.status).toBe("healthy");
    expect(response.body.cache.status).toBe("healthy");
    expect(response.body.backend.status).toBe("healthy");
    expect(response.body.message).toBe("API is up and running!");
  });
});
