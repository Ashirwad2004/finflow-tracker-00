import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeIFSC,
  isValidIFSC,
  toOptionalBoolean,
  isRazorpayIFSCResponse,
  mapIFSCResponse,
} from "./ifscValidation";

describe("IFSC Validation & Normalization", () => {
  it("normalizes IFSC input with whitespace and lowercase", () => {
    assert.equal(normalizeIFSC("  sbin0001234 "), "SBIN0001234");
    assert.equal(normalizeIFSC("hdfc0000001"), "HDFC0000001");
  });

  it("validates standard 11-character Indian IFSC codes", () => {
    assert.equal(isValidIFSC("SBIN0001234"), true);
    assert.equal(isValidIFSC("HDFC0000123"), true);
    assert.equal(isValidIFSC("ICIC0000001"), true);

    // 5th character must be '0'
    assert.equal(isValidIFSC("SBIN1001234"), false);
    // Length must be exactly 11
    assert.equal(isValidIFSC("SBIN00123"), false);
    assert.equal(isValidIFSC("SBIN000012345"), false);
    // Invalid characters
    assert.equal(isValidIFSC("SBIN000123!"), false);
    // Non-string
    assert.equal(isValidIFSC(null as any), false);
  });

  it("converts varied boolean representations safely", () => {
    assert.equal(toOptionalBoolean(true), true);
    assert.equal(toOptionalBoolean(false), false);
    assert.equal(toOptionalBoolean("true"), true);
    assert.equal(toOptionalBoolean("yes"), true);
    assert.equal(toOptionalBoolean("1"), true);
    assert.equal(toOptionalBoolean("false"), false);
    assert.equal(toOptionalBoolean("no"), false);
    assert.equal(toOptionalBoolean("0"), false);
    assert.equal(toOptionalBoolean(1), true);
    assert.equal(toOptionalBoolean(0), false);
    assert.equal(toOptionalBoolean("unknown"), undefined);
  });

  it("identifies valid Razorpay IFSC responses", () => {
    assert.equal(
      isRazorpayIFSCResponse({
        BANK: "State Bank of India",
        IFSC: "SBIN0001234",
      }),
      true
    );
    assert.equal(isRazorpayIFSCResponse(null), false);
    assert.equal(isRazorpayIFSCResponse({}), false);
    assert.equal(isRazorpayIFSCResponse("invalid"), false);
  });

  it("maps external API response into typed application model", () => {
    const rawData = {
      BANK: "State Bank of India",
      IFSC: "SBIN0001234",
      BRANCH: "Main Branch",
      CITY: "Mumbai",
      STATE: "Maharashtra",
      BANKCODE: "SBI",
      UPI: "true",
      NEFT: true,
      RTGS: 1,
      IMPS: "yes",
    };

    const mockLogger = {
      warn: () => {},
      error: () => {},
      info: () => {},
    };

    const details = mapIFSCResponse(rawData as any, "SBIN0001234", mockLogger);
    assert.ok(details);
    assert.equal(details.bank, "State Bank of India");
    assert.equal(details.branch, "Main Branch");
    assert.equal(details.city, "Mumbai");
    assert.equal(details.state, "Maharashtra");
    assert.equal(details.bankCode, "SBI");
    assert.equal(details.upi, true);
    assert.equal(details.neft, true);
    assert.equal(details.rtgs, true);
    assert.equal(details.imps, true);
  });

  it("rejects response when returned IFSC does not match requested IFSC", () => {
    const rawData = {
      BANK: "HDFC Bank",
      IFSC: "HDFC0009999",
    };

    let warned = false;
    const mockLogger = {
      warn: () => {
        warned = true;
      },
      error: () => {},
      info: () => {},
    };

    const details = mapIFSCResponse(rawData as any, "SBIN0001234", mockLogger);
    assert.equal(details, null);
    assert.equal(warned, true);
  });
});
