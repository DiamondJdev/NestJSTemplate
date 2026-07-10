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
  randomUsername,
  CSRF_HEADER,
  TestUser,
} from "./support/user-factory";

describe("Auth (e2e)", () => {
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

  describe("POST /auth/register", () => {
    it("creates a user, sets cookies, and returns tokens", async () => {
      const username = randomUsername();
      const response = await request(ctx.app.getHttpServer())
        .post("/auth/register")
        .set(CSRF_HEADER)
        .send({ username, password: "Str0ng!Passw0rd" });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("User registered successfully");
      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.refreshToken).toEqual(expect.any(String));
      expect(response.body.user).toMatchObject({ username, roles: ["user"] });
      expect(response.body.token_type).toBe("bearer");

      const cookies = response.headers["set-cookie"] as unknown as string[];
      expect(cookies.some((c) => c.startsWith("accessToken="))).toBe(true);
      expect(cookies.some((c) => c.startsWith("refreshToken="))).toBe(true);

      createdUserIds.push(response.body.user.id as string);
    });

    it("rejects a duplicate username with 409", async () => {
      const user = await createTestUser(ctx);
      createdUserIds.push(user.id);

      const response = await request(ctx.app.getHttpServer())
        .post("/auth/register")
        .set(CSRF_HEADER)
        .send({ username: user.username, password: "Str0ng!Passw0rd" });

      expect(response.status).toBe(409);
    });

    it("rejects a weak password with 400", async () => {
      const response = await request(ctx.app.getHttpServer())
        .post("/auth/register")
        .set(CSRF_HEADER)
        .send({ username: randomUsername(), password: "weak" });

      expect(response.status).toBe(400);
    });

    it("rejects an empty body with 400", async () => {
      const response = await request(ctx.app.getHttpServer())
        .post("/auth/register")
        .set(CSRF_HEADER)
        .send({});

      expect(response.status).toBe(400);
    });

    it("rejects a request missing the CSRF header with 403", async () => {
      const response = await request(ctx.app.getHttpServer())
        .post("/auth/register")
        .send({ username: randomUsername(), password: "Str0ng!Passw0rd" });

      expect(response.status).toBe(403);
    });
  });

  describe("POST /auth/login", () => {
    let user: TestUser;

    beforeAll(async () => {
      user = await createTestUser(ctx);
      createdUserIds.push(user.id);
    });

    it("logs in with correct credentials and sets cookies", async () => {
      const response = await request(ctx.app.getHttpServer())
        .post("/auth/login")
        .set(CSRF_HEADER)
        .send({ username: user.username, password: user.password });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.user.username).toBe(user.username);

      const cookies = response.headers["set-cookie"] as unknown as string[];
      expect(cookies.some((c) => c.startsWith("accessToken="))).toBe(true);
    });

    it("rejects an incorrect password with 401", async () => {
      const response = await request(ctx.app.getHttpServer())
        .post("/auth/login")
        .set(CSRF_HEADER)
        .send({ username: user.username, password: "WrongPassw0rd!" });

      expect(response.status).toBe(401);
    });

    it("rejects an unknown username with 401", async () => {
      const response = await request(ctx.app.getHttpServer())
        .post("/auth/login")
        .set(CSRF_HEADER)
        .send({ username: randomUsername(), password: "Str0ng!Passw0rd" });

      expect(response.status).toBe(401);
    });

    it("rejects a request missing the CSRF header with 403", async () => {
      const response = await request(ctx.app.getHttpServer())
        .post("/auth/login")
        .send({ username: user.username, password: user.password });

      expect(response.status).toBe(403);
    });
  });

  describe("PATCH /auth/refresh", () => {
    let user: TestUser;
    let tokens: { accessToken: string; refreshToken: string };

    beforeAll(async () => {
      user = await createTestUser(ctx);
      createdUserIds.push(user.id);
    });

    beforeEach(async () => {
      tokens = await mintTokensFor(ctx, user);
      // Ensure tokens generated in different seconds so JWT iat differs
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it("rotates tokens using the refreshToken cookie", async () => {
      const response = await request(ctx.app.getHttpServer())
        .patch("/auth/refresh")
        .set(CSRF_HEADER)
        .set("Cookie", `refreshToken=${tokens.refreshToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.refreshToken).not.toBe(tokens.refreshToken);
    });

    it("rotates tokens using a refreshToken in the body", async () => {
      const response = await request(ctx.app.getHttpServer())
        .patch("/auth/refresh")
        .set(CSRF_HEADER)
        .send({ refreshToken: tokens.refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toEqual(expect.any(String));
    });

    it("rejects an ambiguous request with the token in both cookie and body with 400", async () => {
      const response = await request(ctx.app.getHttpServer())
        .patch("/auth/refresh")
        .set(CSRF_HEADER)
        .set("Cookie", `refreshToken=${tokens.refreshToken}`)
        .send({ refreshToken: tokens.refreshToken });

      expect(response.status).toBe(400);
    });

    it("rejects a request with no refresh token with 401", async () => {
      const response = await request(ctx.app.getHttpServer())
        .patch("/auth/refresh")
        .set(CSRF_HEADER)
        .send({});

      expect(response.status).toBe(401);
    });

    it("rejects an invalid refresh token with 401", async () => {
      const response = await request(ctx.app.getHttpServer())
        .patch("/auth/refresh")
        .set(CSRF_HEADER)
        .send({ refreshToken: "not.a.valid.jwt" });

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /auth/logout", () => {
    it("rejects an unauthenticated request with 401", async () => {
      const response = await request(ctx.app.getHttpServer())
        .delete("/auth/logout")
        .set(CSRF_HEADER);

      expect(response.status).toBe(401);
    });

    it("clears cookies and invalidates the refresh token", async () => {
      const user = await createTestUser(ctx);
      createdUserIds.push(user.id);
      const tokens = await mintTokensFor(ctx, user);

      const logoutResponse = await request(ctx.app.getHttpServer())
        .delete("/auth/logout")
        .set(CSRF_HEADER)
        .set(authHeader(tokens.accessToken));

      expect(logoutResponse.status).toBe(204);
      const cookies = (logoutResponse.headers["set-cookie"] ??
        []) as unknown as string[];
      expect(cookies.some((c) => c.startsWith("accessToken=;"))).toBe(true);

      const refreshResponse = await request(ctx.app.getHttpServer())
        .patch("/auth/refresh")
        .set(CSRF_HEADER)
        .send({ refreshToken: tokens.refreshToken });

      expect(refreshResponse.status).toBe(401);
    });
  });

  describe("GET /auth/me", () => {
    it("returns the caller's identity via the Authorization header", async () => {
      const user = await createTestUser(ctx);
      createdUserIds.push(user.id);
      const tokens = await mintTokensFor(ctx, user);

      const response = await request(ctx.app.getHttpServer())
        .get("/auth/me")
        .set(authHeader(tokens.accessToken));

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        userId: user.id,
        username: user.username,
        roles: ["user"],
      });
    });

    it("returns the caller's identity via the accessToken cookie", async () => {
      const user = await createTestUser(ctx);
      createdUserIds.push(user.id);
      const tokens = await mintTokensFor(ctx, user);

      const response = await request(ctx.app.getHttpServer())
        .get("/auth/me")
        .set("Cookie", `accessToken=${tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.userId).toBe(user.id);
    });

    it("rejects a request with no token with 401", async () => {
      const response = await request(ctx.app.getHttpServer()).get("/auth/me");

      expect(response.status).toBe(401);
    });
  });
});

describe("POST /auth/login throttling", () => {
  let ctx: TestAppContext;
  let user: TestUser;

  beforeAll(async () => {
    // Dedicated app instance so this test's throttle counter starts fresh —
    // ThrottlerGuard's in-memory storage is per-app-instance, and the login
    // endpoint's throttle bucket is shared by IP across every request in a
    // given instance, so sharing the app from the block above would make
    // this test's outcome depend on how many login attempts ran before it.
    ctx = await createTestApp();
    user = await createTestUser(ctx);
  });

  afterAll(async () => {
    await deleteTestUser(ctx, user.id);
    await closeTestApp(ctx);
  });

  it("returns 429 on the 6th login attempt within a minute", async () => {
    const attempt = () =>
      request(ctx.app.getHttpServer())
        .post("/auth/login")
        .set(CSRF_HEADER)
        .send({ username: user.username, password: "WrongPassw0rd!" });

    for (let i = 0; i < 5; i++) {
      const response = await attempt();
      expect(response.status).toBe(401);
    }

    const sixth = await attempt();
    expect(sixth.status).toBe(429);
  }, 20000);
});
