import request from "supertest";
import {
  createTestApp,
  closeTestApp,
  TestAppContext,
} from "./support/test-app";
import { typedBody } from "./support/typed-response";

interface HealthResponse {
  message: string;
  database: { status: string };
  cache: { status: string };
  backend: { status: string };
}

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

    const body = typedBody<HealthResponse>(response);
    expect(response.status).toBe(200);
    expect(body.database.status).toBe("healthy");
    expect(body.cache.status).toBe("healthy");
    expect(body.backend.status).toBe("healthy");
    expect(body.message).toBe("API is up and running!");
  });
});
