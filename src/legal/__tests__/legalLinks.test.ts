import {
  COMPANY_PLAN_MANAGEMENT_URL,
  PRIVACY_POLICY_URL,
  SIGNUP_URL,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO_URL,
  SUPPORT_URL,
  TERMS_OF_SERVICE_URL,
} from "../legalLinks";

describe("legalLinks", () => {
  it("keeps App Review URLs on GitHub Pages until the custom domain 200s", () => {
    expect(PRIVACY_POLICY_URL).toBe(
      "https://insitetechltd.github.io/buildtrack/privacy-policy.html",
    );
    expect(TERMS_OF_SERVICE_URL).toBe(
      "https://insitetechltd.github.io/buildtrack/terms-of-service.html",
    );
    expect(SUPPORT_URL).toBe(
      "https://insitetechltd.github.io/buildtrack/support.html",
    );
    expect(SIGNUP_URL).toBe(
      "https://insitetechltd.github.io/buildtrack/signup.html",
    );
    expect(COMPANY_PLAN_MANAGEMENT_URL).toBe(
      "https://insitetechltd.github.io/buildtrack/index.html#pricing",
    );
  });

  it("uses the locked support mailbox", () => {
    expect(SUPPORT_EMAIL).toBe("support@insiteworks.co");
    expect(SUPPORT_MAILTO_URL).toBe("mailto:support@insiteworks.co");
  });
});
