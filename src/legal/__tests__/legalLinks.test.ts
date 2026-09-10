import {
  COMPANY_HOME_URL,
  COMPANY_PLAN_MANAGEMENT_URL,
  PRIVACY_POLICY_URL,
  SIGNUP_URL,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO_URL,
  SUPPORT_URL,
  TASKR_SITE_URL,
  TERMS_OF_SERVICE_URL,
} from "../legalLinks";

describe("legalLinks", () => {
  it("points App Review and in-app URLs at www.insiteworks.co/taskr", () => {
    expect(COMPANY_HOME_URL).toBe("https://www.insiteworks.co/");
    expect(TASKR_SITE_URL).toBe("https://www.insiteworks.co/taskr/");
    expect(PRIVACY_POLICY_URL).toBe(
      "https://www.insiteworks.co/taskr/privacy-policy.html",
    );
    expect(TERMS_OF_SERVICE_URL).toBe(
      "https://www.insiteworks.co/taskr/terms-of-service.html",
    );
    expect(SUPPORT_URL).toBe("https://www.insiteworks.co/taskr/support.html");
    expect(SIGNUP_URL).toBe("https://www.insiteworks.co/taskr/signup.html");
    expect(COMPANY_PLAN_MANAGEMENT_URL).toBe(
      "https://www.insiteworks.co/taskr/#pricing",
    );
  });

  it("uses the locked support mailbox", () => {
    expect(SUPPORT_EMAIL).toBe("support@insiteworks.co");
    expect(SUPPORT_MAILTO_URL).toBe("mailto:support@insiteworks.co");
  });
});
