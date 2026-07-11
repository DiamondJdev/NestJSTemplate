import { JwtService as NestJwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "./jwt.service";

describe("JwtService", () => {
  let service: JwtService;

  beforeEach(() => {
    const nestJwtServiceMock = {} as NestJwtService;
    const configServiceMock = {} as ConfigService;
    service = new JwtService(nestJwtServiceMock, configServiceMock);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("hashToken / compareToken", () => {
    it("round-trips: comparing the same token against its own hash returns true", async () => {
      const token = "some.jwt.token";
      const hash = await service.hashToken(token);
      const result = await service.compareToken(token, hash);
      expect(result).toBe(true);
    });

    it("does not treat two tokens sharing the same first 72 bytes as equal", async () => {
      // Regression test for the bcrypt 72-byte truncation bug: bcrypt
      // silently ignores any input past 72 bytes, so two distinct tokens
      // sharing a 72-byte prefix (as same-user JWTs do, since the header
      // and partial `sub` claim are identical) would hash-compare as
      // equal if the raw token were passed to bcrypt directly. Hashing a
      // SHA-256 digest of the full token first fixes this.
      const prefix = "a".repeat(72);
      const tokenA = `${prefix}one`;
      const tokenB = `${prefix}two`;

      const hash = await service.hashToken(tokenA);
      const result = await service.compareToken(tokenB, hash);

      expect(result).toBe(false);
    });
  });
});
