import { describe, it, expect } from "vitest";
import {
  toJsonPayload,
  isJsonObject,
  isJsonArray,
  safeJsonParse,
} from "./json-utils";

describe("json-utils", () => {
  describe("toJsonPayload", () => {
    it("converts primitives, objects, and arrays into Json payloads", () => {
      expect(toJsonPayload("hello")).toBe("hello");
      expect(toJsonPayload(42)).toBe(42);
      expect(toJsonPayload(true)).toBe(true);
      expect(toJsonPayload(null)).toBeNull();

      const obj = { name: "Conference", budget: 50000 };
      expect(toJsonPayload(obj)).toEqual(obj);

      const arr = [1, 2, 3];
      expect(toJsonPayload(arr)).toEqual(arr);
    });
  });

  describe("isJsonObject", () => {
    it("returns true for plain objects and false for null, arrays, and primitives", () => {
      expect(isJsonObject({})).toBe(true);
      expect(isJsonObject({ a: 1 })).toBe(true);

      expect(isJsonObject(null)).toBe(false);
      expect(isJsonObject(undefined)).toBe(false);
      expect(isJsonObject([])).toBe(false);
      expect(isJsonObject([1, 2, 3])).toBe(false);
      expect(isJsonObject("string")).toBe(false);
      expect(isJsonObject(123)).toBe(false);
      expect(isJsonObject(true)).toBe(false);
    });
  });

  describe("isJsonArray", () => {
    it("returns true for arrays and false for objects and primitives", () => {
      expect(isJsonArray([])).toBe(true);
      expect(isJsonArray([1, 2, 3])).toBe(true);

      expect(isJsonArray({})).toBe(false);
      expect(isJsonArray(null)).toBe(false);
      expect(isJsonArray(undefined)).toBe(false);
      expect(isJsonArray("test")).toBe(false);
    });
  });

  describe("safeJsonParse", () => {
    it("parses valid JSON into a success envelope", () => {
      const result = safeJsonParse<{ name: string }>('{"name":"Planora"}');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Planora");
      }
    });

    it("returns a failure envelope when given malformed JSON without throwing", () => {
      const result = safeJsonParse("not a json string");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(typeof result.error).toBe("string");
      }
    });
  });
});

