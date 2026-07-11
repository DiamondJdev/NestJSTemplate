import request from "supertest";
import { randomUUID } from "crypto";
import * as bcrypt from "bcrypt";
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
import { UserRole } from "../src/modules/core/utils/userRole.enum";
import { typedBody } from "./support/typed-response";

interface UserListResponse {
  message: string;
  data: { id: string; username: string; roles: string[] }[];
}

interface CurrentUserResponse {
  data: { id: string; username: string; roles: string[] };
}

describe("Users (e2e)", () => {
  let ctx: TestAppContext;
  let admin: TestUser;
  let adminToken: string;
  let regular: TestUser;
  let regularToken: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    ctx = await createTestApp();

    admin = await createTestUser(ctx, { roles: [UserRole.ADMIN] });
    createdUserIds.push(admin.id);
    adminToken = (await mintTokensFor(ctx, admin)).accessToken;

    regular = await createTestUser(ctx, { roles: [UserRole.USER] });
    createdUserIds.push(regular.id);
    regularToken = (await mintTokensFor(ctx, regular)).accessToken;
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await deleteTestUser(ctx, id);
    }
    await closeTestApp(ctx);
  });

  describe("GET /users", () => {
    it("returns all users for an admin, including known fixtures", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/users")
        .set(authHeader(adminToken));

      expect(response.status).toBe(200);
      const usernames = typedBody<UserListResponse>(response).data.map(
        (u) => u.username,
      );
      expect(usernames).toEqual(
        expect.arrayContaining([admin.username, regular.username]),
      );
    });

    it("rejects a non-admin caller with 403", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/users")
        .set(authHeader(regularToken));

      expect(response.status).toBe(403);
    });

    it("rejects an unauthenticated caller with 401", async () => {
      const response = await request(ctx.app.getHttpServer()).get("/users");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /users/me", () => {
    it("returns the caller's own profile", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/users/me")
        .set(authHeader(regularToken));

      expect(response.status).toBe(200);
      expect(typedBody<CurrentUserResponse>(response).data).toMatchObject({
        id: regular.id,
        username: regular.username,
        roles: ["user"],
      });
    });
  });

  describe("DELETE /users/me", () => {
    it("deletes the caller's own account and invalidates their token", async () => {
      const victim = await createTestUser(ctx);
      const victimToken = (await mintTokensFor(ctx, victim)).accessToken;

      const deleteResponse = await request(ctx.app.getHttpServer())
        .delete("/users/me")
        .set(authHeader(victimToken))
        .set(CSRF_HEADER);
      expect(deleteResponse.status).toBe(204);

      const followUp = await request(ctx.app.getHttpServer())
        .get("/users/me")
        .set(authHeader(victimToken));
      expect(followUp.status).toBe(401);
    });
  });

  describe("DELETE /users/:uuid", () => {
    it("allows an admin to delete another user", async () => {
      const target = await createTestUser(ctx);

      const response = await request(ctx.app.getHttpServer())
        .delete(`/users/${target.id}`)
        .set(authHeader(adminToken))
        .set(CSRF_HEADER);

      expect(response.status).toBe(204);
    });

    it("rejects a non-admin caller with 403", async () => {
      const target = await createTestUser(ctx);
      createdUserIds.push(target.id);

      const response = await request(ctx.app.getHttpServer())
        .delete(`/users/${target.id}`)
        .set(authHeader(regularToken))
        .set(CSRF_HEADER);

      expect(response.status).toBe(403);
    });

    it("returns 404 for an unknown uuid", async () => {
      const response = await request(ctx.app.getHttpServer())
        .delete(`/users/${randomUUID()}`)
        .set(authHeader(adminToken))
        .set(CSRF_HEADER);

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /users/password", () => {
    it("updates the caller's own password", async () => {
      const user = await createTestUser(ctx);
      createdUserIds.push(user.id);
      const token = (await mintTokensFor(ctx, user)).accessToken;
      const newPassword = "N3w!StrongPassword";

      const response = await request(ctx.app.getHttpServer())
        .patch("/users/password")
        .set(authHeader(token))
        .set(CSRF_HEADER)
        .send({ password: newPassword });

      expect(response.status).toBe(200);

      const stored = await ctx.usersService.findOneSensitive(user.username);
      expect(stored).not.toBeNull();
      await expect(bcrypt.compare(newPassword, stored!.password)).resolves.toBe(
        true,
      );
    });

    it("rejects a weak password with 400", async () => {
      const user = await createTestUser(ctx);
      createdUserIds.push(user.id);
      const token = (await mintTokensFor(ctx, user)).accessToken;

      const response = await request(ctx.app.getHttpServer())
        .patch("/users/password")
        .set(authHeader(token))
        .set(CSRF_HEADER)
        .send({ password: "weak" });

      expect(response.status).toBe(400);
    });
  });

  describe("PATCH /users/password/:uuid", () => {
    it("allows an admin to reset another user's password", async () => {
      const target = await createTestUser(ctx);
      createdUserIds.push(target.id);
      const newPassword = "Adm1n!ResetPass";

      const response = await request(ctx.app.getHttpServer())
        .patch(`/users/password/${target.id}`)
        .set(authHeader(adminToken))
        .set(CSRF_HEADER)
        .send({ password: newPassword });

      expect(response.status).toBe(200);

      const stored = await ctx.usersService.findOneSensitive(target.username);
      expect(stored).not.toBeNull();
      await expect(bcrypt.compare(newPassword, stored!.password)).resolves.toBe(
        true,
      );
    });

    it("rejects a non-admin caller with 403", async () => {
      const target = await createTestUser(ctx);
      createdUserIds.push(target.id);

      const response = await request(ctx.app.getHttpServer())
        .patch(`/users/password/${target.id}`)
        .set(authHeader(regularToken))
        .set(CSRF_HEADER)
        .send({ password: "An0ther!StrongPw" });

      expect(response.status).toBe(403);
    });

    it("returns 404 for an unknown uuid", async () => {
      const response = await request(ctx.app.getHttpServer())
        .patch(`/users/password/${randomUUID()}`)
        .set(authHeader(adminToken))
        .set(CSRF_HEADER)
        .send({ password: "An0ther!StrongPw" });

      expect(response.status).toBe(404);
    });
  });
});
