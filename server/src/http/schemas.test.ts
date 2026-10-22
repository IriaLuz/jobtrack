import { describe, expect, it } from "vitest";
import { createJobSchema, registerSchema, updateJobSchema } from "./schemas.js";

const validJob = { company: " Acme ", role: "Frontend Engineer", link: "https://acme.example/jobs/1" };

describe("createJobSchema", () => {
  it("trims text and defaults the status to saved", () => {
    expect(createJobSchema.parse(validJob)).toEqual({
      company: "Acme",
      role: "Frontend Engineer",
      link: "https://acme.example/jobs/1",
      status: "saved",
    });
  });

  it("turns empty optional fields into null", () => {
    expect(createJobSchema.parse({ ...validJob, salary: "  ", notes: null })).toMatchObject({
      salary: null,
      notes: null,
    });
  });

  it("drops fields the client is not allowed to set", () => {
    const parsed = createJobSchema.parse({ ...validJob, id: "chosen-id", userId: "someone-else" });

    expect(parsed).not.toHaveProperty("id");
    expect(parsed).not.toHaveProperty("userId");
  });

  it.each(["javascript:alert(1)", "ftp://acme.example", "not a url"])("rejects the link %s", (link) => {
    expect(createJobSchema.safeParse({ ...validJob, link }).success).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(createJobSchema.safeParse({ ...validJob, status: "ghosted" }).success).toBe(false);
  });
});

describe("updateJobSchema", () => {
  it("only contains the fields that were sent, so nothing else is overwritten", () => {
    expect(updateJobSchema.parse({ status: "interviewing" })).toEqual({ status: "interviewing" });
  });

  it("still validates the fields that were sent", () => {
    expect(updateJobSchema.safeParse({ company: "" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("normalises the email so the same address cannot register twice with different casing", () => {
    expect(registerSchema.parse({ email: " Ada@Example.COM ", password: "long-enough" }).email).toBe(
      "ada@example.com",
    );
  });

  it("limits the password by bytes, because bcrypt ignores everything after 72 bytes", () => {
    const seventyTwoAsciiCharacters = "a".repeat(72);
    const seventyTwoAccentedCharacters = "é".repeat(72); // 144 bytes

    expect(registerSchema.safeParse({ email: "ada@example.com", password: seventyTwoAsciiCharacters }).success).toBe(
      true,
    );
    expect(
      registerSchema.safeParse({ email: "ada@example.com", password: seventyTwoAccentedCharacters }).success,
    ).toBe(false);
  });

  it("requires at least 8 characters for the password", () => {
    const result = registerSchema.safeParse({ email: "ada@example.com", password: "short" });

    expect(result.error?.issues[0]?.message).toBe("Password must be at least 8 characters");
  });
});
