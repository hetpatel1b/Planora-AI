import { describe, it, expect } from "vitest";
import { getSafeRedirectUrl } from "./auth-utils";

describe("auth-utils: getSafeRedirectUrl", () => {
  it("allows safe internal relative paths", () => {
    expect(getSafeRedirectUrl("/dashboard")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/events/123")).toBe("/events/123");
    expect(getSafeRedirectUrl("/profile?tab=settings#account")).toBe("/profile?tab=settings#account");
  });

  it("falls back to default fallback (/dashboard) when target is empty, null, or undefined", () => {
    expect(getSafeRedirectUrl(null)).toBe("/dashboard");
    expect(getSafeRedirectUrl(undefined)).toBe("/dashboard");
    expect(getSafeRedirectUrl("")).toBe("/dashboard");
    expect(getSafeRedirectUrl("   ")).toBe("/dashboard");
  });

  it("respects custom fallback", () => {
    expect(getSafeRedirectUrl(null, "/welcome")).toBe("/welcome");
    expect(getSafeRedirectUrl("https://evil.com", "/login")).toBe("/login");
  });

  it("blocks open redirect attempts with absolute URLs", () => {
    expect(getSafeRedirectUrl("https://attacker.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("http://attacker.com")).toBe("/dashboard");
  });

  it("blocks protocol-relative URL bypasses (// or /\\)", () => {
    expect(getSafeRedirectUrl("//attacker.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/\\attacker.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/\\\\attacker.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("///attacker.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/\\/attacker.com")).toBe("/dashboard");
  });

  it("blocks control characters and CRLF injection attempts", () => {
    expect(getSafeRedirectUrl("/dashboard\r\nLocation: https://evil.com")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/dashboard\nSet-Cookie: evil=1")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/page\0evil")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/tab\tevil")).toBe("/dashboard");
  });

  it("blocks embedded URI schemes before query or hash (e.g. javascript:)", () => {
    expect(getSafeRedirectUrl("javascript:alert(1)")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/javascript:alert(1)")).toBe("/dashboard");
    expect(getSafeRedirectUrl("/login:path")).toBe("/dashboard");
  });

  it("permits colons in query parameters and hash fragments", () => {
    expect(getSafeRedirectUrl("/search?filter=time:1200")).toBe("/search?filter=time:1200");
    expect(getSafeRedirectUrl("/page#section:intro")).toBe("/page#section:intro");
  });
});
