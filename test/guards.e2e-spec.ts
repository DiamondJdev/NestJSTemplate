import request from "supertest";
import {
  createTestApp,
  closeTestApp,
  TestAppContext,
} from "./support/test-app";
import {
  createTestUser,
  deleteTestUser,
  mintTokensFor,
  authHeader,
  CSRF_HEADER,
  TestUser,
} from "./support/user-factory";

describe("Cross-cutting guards (e2e)", () => {
  let ctx: TestAppContext;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await deleteTestUser(ctx, id);
    }
    await closeTestApp(ctx);
  });

  describe("BodyRequiredGuard", () => {
    it("rejects an empty body on POST /auth/register with 400", async () => {
      const response = await request(ctx.app.getHttpServer())
        .post("/auth/register")
        .set(CSRF_HEADER)
        .send({});

      expect(response.status).toBe(400);
    });

    it("rejects an empty body on POST /auth/login with 400", async () => {
      const response = await request(ctx.app.getHttpServer())
        .post("/auth/login")
        .set(CSRF_HEADER)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe("JwtAuthGuard", () => {
    it("rejects a malformed Authorization header with 401", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", "NotBearer sometoken");

      expect(response.status).toBe(401);
    });

    it("rejects a garbage JWT with 401", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", "Bearer not.a.valid.jwt");

      expect(response.status).toBe(401);
    });
  });

  describe("RolesGuard", () => {
    it("rejects a role-gated route when the caller's role is insufficient", async () => {
      const user: TestUser = await createTestUser(ctx);
      createdUserIds.push(user.id);
      const token = (await mintTokensFor(ctx, user)).accessToken;

      const response = await request(ctx.app.getHttpServer())
        .get("/users")
        .set(authHeader(token));

      expect(response.status).toBe(403);
    });
  });
});
