/**
 * Checkout-first company signup (DEV and PROD — same flow).
 * Form → start-signup-checkout → Stripe → success polls invite-open link → Taskr set password.
 */
(function () {
  "use strict";

  var APP_STORE_URL = "https://apps.apple.com/app/id6754898737";
  var cfg = window.INSITE_SIGNUP_SUPABASE;
  if (!cfg || !cfg.url || !cfg.anonKey) {
    console.error("Missing INSITE_SIGNUP_SUPABASE config");
    return;
  }
  if (!cfg.plans || !cfg.plans.growth || !cfg.plans.unlimited) {
    console.error("Missing plan catalog in INSITE_SIGNUP_SUPABASE");
    return;
  }

  var form = document.getElementById("signup-form");
  var statusEl = document.getElementById("signup-status");
  var submitBtn = document.getElementById("signup-submit");
  var planFieldset = document.getElementById("signup-plan-fieldset");
  var sandboxBanner = document.getElementById("signup-sandbox-banner");
  var successPanel = document.getElementById("signup-success-panel");
  var formPanel = document.getElementById("signup-form-panel");
  var openAppBtn = document.getElementById("signup-open-app");
  var linkBox = document.getElementById("signup-link-box");
  var deepLinkField = document.getElementById("signup-deep-link");
  var copyLinkBtn = document.getElementById("signup-copy-link");

  var isSandbox = cfg.env === "sandbox";
  if (sandboxBanner) sandboxBanner.hidden = !isSandbox;
  if (planFieldset) planFieldset.hidden = false;
  if (submitBtn) {
    submitBtn.textContent = "Continue to payment";
  }

  function setStatus(kind, message) {
    if (!statusEl) return;
    statusEl.className = "signup-status" + (kind ? " is-" + kind : "");
    statusEl.textContent = message || "";
    statusEl.style.display = kind ? "block" : "none";
  }

  function showLoginLink(inviteLink) {
    if (openAppBtn) {
      openAppBtn.hidden = false;
      openAppBtn.href = inviteLink;
      openAppBtn.textContent = "Open Taskr & set password";
    }
    if (linkBox) linkBox.hidden = false;
    if (deepLinkField) {
      deepLinkField.value = inviteLink;
    }
    setStatus(
      "success",
      "Your company is ready. Use the button or copy the login link below — no email needed. You’ll set your password on first login."
    );
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", function () {
      var value = deepLinkField ? deepLinkField.value : "";
      if (!value) return;
      var done = function () {
        copyLinkBtn.textContent = "Copied";
        setTimeout(function () {
          copyLinkBtn.textContent = "Copy link";
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(done).catch(function () {
          if (deepLinkField) {
            deepLinkField.focus();
            deepLinkField.select();
          }
        });
      } else if (deepLinkField) {
        deepLinkField.focus();
        deepLinkField.select();
        try {
          document.execCommand("copy");
          done();
        } catch (e) {}
      }
    });
  }

  function fieldError(id, message) {
    var el = document.getElementById("err-" + id);
    if (el) el.textContent = message || "";
  }

  function clearErrors() {
    ["companyName", "name", "email"].forEach(function (id) {
      fieldError(id, "");
    });
  }

  function selectedPlanKey() {
    var checked = form && form.querySelector('input[name="plan"]:checked');
    return checked ? checked.value : cfg.defaultPlan || "growth";
  }

  function pageUrlWith(query) {
    var url = new URL(window.location.href);
    url.hash = "";
    Object.keys(query).forEach(function (key) {
      if (query[key] == null || query[key] === "") url.searchParams.delete(key);
      else url.searchParams.set(key, query[key]);
    });
    if (isSandbox) url.searchParams.set("env", "sandbox");
    else url.searchParams.delete("env");
    return url.toString();
  }

  function validate(data) {
    var ok = true;
    clearErrors();
    if (!data.companyName) {
      fieldError("companyName", "Company name is required");
      ok = false;
    }
    if (!data.name) {
      fieldError("name", "Your name is required");
      ok = false;
    }
    if (!data.email) {
      fieldError("email", "Email is required");
      ok = false;
    } else if (!/\S+@\S+\.\S+/.test(data.email)) {
      fieldError("email", "Enter a valid email");
      ok = false;
    }
    if (!data.planKey || !cfg.plans[data.planKey]) {
      setStatus("error", "Choose a plan to continue.");
      ok = false;
    }
    return ok;
  }

  async function startCheckout(data) {
    var plan = cfg.plans[data.planKey];
    var successUrl = pageUrlWith({ checkout: "success" });
    var cancelUrl = pageUrlWith({ checkout: "cancel" });

    var res = await fetch(cfg.url + "/functions/v1/start-signup-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.anonKey,
        Authorization: "Bearer " + cfg.anonKey,
      },
      body: JSON.stringify({
        companyName: data.companyName,
        name: data.name,
        email: data.email,
        planTierSlug: plan.planTierSlug,
        planPriceId: plan.planPriceId,
        successUrl: successUrl,
        cancelUrl: cancelUrl,
      }),
    });

    var payload = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      var msg =
        payload.message ||
        payload.error ||
        "Could not start checkout (" + res.status + ")";
      if (payload.error === "email_already_registered") {
        msg =
          payload.message ||
          "This email already has a company. Open Taskr and sign in.";
      }
      throw new Error(msg);
    }
    if (!payload.url) {
      throw new Error("Stripe did not return a checkout URL");
    }
    window.location.assign(payload.url);
  }

  function showSuccessPanel() {
    if (formPanel) formPanel.hidden = true;
    if (successPanel) successPanel.hidden = false;
  }

  async function pollSignupStatus(sessionId) {
    var res = await fetch(cfg.url + "/functions/v1/signup-checkout-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.anonKey,
        Authorization: "Bearer " + cfg.anonKey,
      },
      body: JSON.stringify({ sessionId: sessionId }),
    });
    return res.json().catch(function () {
      return { status: "pending" };
    });
  }

  function runSuccessFlow(sessionId) {
    showSuccessPanel();
    setStatus(
      "success",
      "Payment received. Preparing your Taskr login link on this page…"
    );
    if (!sessionId) {
      setStatus(
        "error",
        "Payment may have succeeded, but this page is missing the checkout session id. Refresh from Stripe’s return URL, or contact support with your email."
      );
      return;
    }

    var attempts = 0;
    var maxAttempts = 40;
    var timer = setInterval(function () {
      attempts += 1;
      pollSignupStatus(sessionId)
        .then(function (payload) {
          if (payload.status === "ready" && payload.inviteLink) {
            clearInterval(timer);
            showLoginLink(payload.inviteLink);
            return;
          }
          if (attempts >= maxAttempts) {
            clearInterval(timer);
            setStatus(
              "error",
              "Payment succeeded, but the login link is not ready yet. Wait a minute and refresh this page — the link will appear here (not by email)."
            );
          }
        })
        .catch(function () {
          if (attempts >= maxAttempts) clearInterval(timer);
        });
    }, 2000);
  }

  try {
    var params = new URLSearchParams(window.location.search);
    var prefillEmail = params.get("email");
    if (prefillEmail && form && form.email) {
      form.email.value = String(prefillEmail).trim();
    }
    var checkout = params.get("checkout");
    var sessionId =
      params.get("session_id") || params.get("sessionId") || "";
    if (checkout === "success") {
      runSuccessFlow(sessionId);
    } else if (checkout === "cancel") {
      setStatus(
        "error",
        "Checkout canceled. No charge was made. Choose a plan and try again when you’re ready."
      );
    }
  } catch (e) {}

  if (!form) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    setStatus("", "");

    var data = {
      companyName: (form.companyName.value || "").trim(),
      name: (form.name.value || "").trim(),
      email: (form.email.value || "").trim().toLowerCase(),
      planKey: selectedPlanKey(),
    };

    if (!validate(data)) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Opening Stripe…";

    startCheckout(data)
      .catch(function (err) {
        setStatus("error", (err && err.message) || "Please try again.");
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Continue to payment";
      });
  });
})();
