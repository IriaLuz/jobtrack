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

  it("accepts a job description of exactly 12,000 characters, unchanged", () => {
    const notes = "d".repeat(12_000);

    expect(createJobSchema.parse({ ...validJob, notes }).notes).toBe(notes);
  });

  it("rejects a job description of 12,001 characters with a clear message", () => {
    const result = createJobSchema.safeParse({ ...validJob, notes: "d".repeat(12_001) });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Job description must be at most 12000 characters");
  });

  // Zod 4 counts Unicode code points, and the web form counts the same way.
  it("counts a newline and an emoji as one character each, the same rule as the web form", () => {
    const parse = (notes: string) => createJobSchema.safeParse({ ...validJob, notes }).success;
    const emoji = "😀".repeat(12_000); // 12,000 code points, 24,000 UTF-16 units

    expect(parse(`${"d".repeat(5_999)}\n\n${"d".repeat(5_999)}`)).toBe(true); // 12,000
    expect(parse(`${"d".repeat(5_999)}\n\n\n${"d".repeat(5_999)}`)).toBe(false); // 12,001
    expect(parse(emoji)).toBe(true);
    expect(parse(`${emoji}d`)).toBe(false);
  });

  it("checks the job description's length after trimming", () => {
    const notes = "d".repeat(12_000);

    expect(createJobSchema.parse({ ...validJob, notes: `  ${notes}\n` }).notes).toBe(notes);
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

  it("applies the same 12,000-character job description limit when editing", () => {
    expect(updateJobSchema.safeParse({ notes: "d".repeat(12_000) }).success).toBe(true);
    expect(updateJobSchema.safeParse({ notes: "d".repeat(12_001) }).success).toBe(false);
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
