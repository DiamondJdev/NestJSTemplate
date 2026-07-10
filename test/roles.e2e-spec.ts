import request from "supertest";
import { randomUUID } from "crypto";
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
  TestUser,
} from "./support/user-factory";
import { UserRole } from "../src/modules/core/utils/userRole.enum";
import { typedBody } from "./support/typed-response";

interface RolesResponse {
  message: string;
  roles: string[];
}

describe("Roles (e2e)", () => {
  let ctx: TestAppContext;
  let admin: TestUser;
  let adminToken: string;
  let regularA: TestUser;
  let regularAToken: string;
  let regularB: TestUser;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    ctx = await createTestApp();

    admin = await createTestUser(ctx, { roles: [UserRole.ADMIN] });
    createdUserIds.push(admin.id);
    adminToken = (await mintTokensFor(ctx, admin)).accessToken;

    regularA = await createTestUser(ctx, { roles: [UserRole.USER] });
    createdUserIds.push(regularA.id);
    regularAToken = (await mintTokensFor(ctx, regularA)).accessToken;

    regularB = await createTestUser(ctx, { roles: [UserRole.USER] });
    createdUserIds.push(regularB.id);
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await deleteTestUser(ctx, id);
    }
    await closeTestApp(ctx);
  });

  describe("GET /roles/me", () => {
    it("returns the caller's own roles", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/roles/me")
        .set(authHeader(regularAToken));

      expect(response.status).toBe(200);
      expect(typedBody<RolesResponse>(response).roles).toEqual(["user"]);
    });

    it("rejects an unauthenticated caller with 401", async () => {
      const response = await request(ctx.app.getHttpServer()).get("/roles/me");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /roles/:uuid", () => {
    it("allows a caller to view their own roles by uuid", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/roles/${regularA.id}`)
        .set(authHeader(regularAToken));

      expect(response.status).toBe(200);
      expect(typedBody<RolesResponse>(response).roles).toEqual(["user"]);
    });

    it("rejects a non-admin caller viewing another user's roles with 403", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/roles/${regularB.id}`)
        .set(authHeader(regularAToken));

      expect(response.status).toBe(403);
    });

    it("allows an admin to view another user's roles", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/roles/${regularB.id}`)
        .set(authHeader(adminToken));

      expect(response.status).toBe(200);
      expect(typedBody<RolesResponse>(response).roles).toEqual(["user"]);
    });

    it("returns 404 for an unknown uuid", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/roles/${randomUUID()}`)
        .set(authHeader(adminToken));

      expect(response.status).toBe(404);
    });
  });
});
