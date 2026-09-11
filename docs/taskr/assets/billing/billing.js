/**
 * Self-serve plan cancel (company admin).
 * Live Stripe status via billing-subscription-status; cancel via cancel-subscription.
 * Supports password login + magic link (post-checkout before Set Password).
 */
(function () {
  "use strict";

  var cfg = window.INSITE_SIGNUP_SUPABASE;
  if (!cfg || !cfg.url || !cfg.anonKey) {
    console.error("Missing INSITE_SIGNUP_SUPABASE config");
    return;
  }
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Missing supabase-js UMD");
    return;
  }

  var client = window.supabase.createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });

  var loginPanel = document.getElementById("billing-login-panel");
  var sessionPanel = document.getElementById("billing-session-panel");
  var sandboxBanner = document.getElementById("billing-sandbox-banner");
  var loginForm = document.getElementById("billing-login-form");
  var loginStatus = document.getElementById("billing-login-status");
  var actionStatus = document.getElementById("billing-action-status");
  var emailInput = document.getElementById("billing-email");
  var passwordInput = document.getElementById("billing-password");
  var loginSubmit = document.getElementById("billing-login-submit");
  var magicSubmit = document.getElementById("billing-magic-submit");
  var cancelBtn = document.getElementById("billing-cancel-btn");
  var cancelHint = document.getElementById("billing-cancel-hint");
  var refreshBtn = document.getElementById("billing-refresh-btn");
  var signOutBtn = document.getElementById("billing-signout-btn");
  var sessionLede = document.getElementById("billing-session-lede");

  var isSandbox = cfg.env === "sandbox";
  if (sandboxBanner) sandboxBanner.hidden = !isSandbox;

  var latestStatus = null;

  function setStatus(el, kind, message) {
    if (!el) return;
    el.className = "signup-status" + (kind ? " is-" + kind : "");
    el.textContent = message || "";
    el.style.display = kind ? "block" : "none";
  }

  function formatWhen(iso) {
    if (!iso) return "—";
    try {
      var d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (_) {
      return iso;
    }
  }

  function billingRedirectUrl() {
    var url = new URL(window.location.href);
    url.hash = "";
    // Preserve sandbox flag for magic-link return.
    if (isSandbox) url.searchParams.set("env", "sandbox");
    else url.searchParams.delete("env");
    return url.toString();
  }

  function showLogin() {
    if (loginPanel) loginPanel.hidden = false;
    if (sessionPanel) sessionPanel.hidden = true;
  }

  function showSession() {
    if (loginPanel) loginPanel.hidden = true;
    if (sessionPanel) sessionPanel.hidden = false;
  }

  async function invokeFunction(name, options) {
    var session = (await client.auth.getSession()).data.session;
    if (!session?.access_token) {
      throw new Error("not_authenticated");
    }
    var method = (options && options.method) || "POST";
    var response = await fetch(cfg.url + "/functions/v1/" + name, {
      method: method,
      headers: {
        Authorization: "Bearer " + session.access_token,
        apikey: cfg.anonKey,
        "Content-Type": "application/json",
      },
      body: method === "GET" ? undefined : JSON.stringify(options?.body || {}),
    });
    var payload = await response.json().catch(function () {
      return {};
    });
    if (!response.ok) {
      var err =
        (payload && payload.error) ||
        "request_failed_" + response.status;
      var e = new Error(String(err));
      e.status = response.status;
      e.payload = payload;
      throw e;
    }
    return payload;
  }

  function renderStatus(data) {
    latestStatus = data;
    var companyEl = document.getElementById("billing-company");
    var planEl = document.getElementById("billing-plan");
    var statusEl = document.getElementById("billing-status");
    var accessEl = document.getElementById("billing-access-until");

    if (companyEl) companyEl.textContent = data.companyName || "—";
    if (planEl) {
      planEl.textContent =
        data.planDisplayName || data.planSlug || "—";
    }

    if (!data.isCompanyAdmin) {
      if (sessionLede) {
        sessionLede.textContent =
          data.message ||
          "Only a company admin can cancel. Ask your company admin.";
      }
      if (statusEl) statusEl.textContent = "Not authorized";
      if (accessEl) accessEl.textContent = "—";
      if (cancelBtn) cancelBtn.hidden = true;
      if (cancelHint) cancelHint.hidden = true;
      setStatus(actionStatus, "error", data.message || "not_company_admin");
      return;
    }

    if (data.subscriptionMissing) {
      if (sessionLede) {
        sessionLede.textContent =
          "No active Stripe subscription is linked. If you just signed up, wait a minute and refresh.";
      }
      if (statusEl) statusEl.textContent = data.localStatus || "missing";
      if (accessEl) accessEl.textContent = "—";
      if (cancelBtn) cancelBtn.hidden = true;
      if (cancelHint) cancelHint.hidden = true;
      return;
    }

    var statusLabel = data.stripeStatus || data.localStatus || "—";
    if (data.cancellationScheduled) {
      statusLabel += " · cancel scheduled";
    }
    if (statusEl) statusEl.textContent = statusLabel;
    if (accessEl) accessEl.textContent = formatWhen(data.accessUntil);

    if (data.cancellationScheduled) {
      if (sessionLede) {
        sessionLede.textContent =
          "Cancellation is scheduled. Keep using Taskr until " +
          formatWhen(data.accessUntil) +
          ". You will not be charged after that.";
      }
      if (cancelBtn) cancelBtn.hidden = true;
      if (cancelHint) {
        cancelHint.hidden = false;
        cancelHint.textContent =
          "Already scheduled on Stripe. No further action needed.";
      }
      setStatus(
        actionStatus,
        "success",
        "Cancellation already scheduled. No charge after access ends."
      );
      return;
    }

    if (data.stripeStatus === "canceled") {
      if (sessionLede) {
        sessionLede.textContent =
          "This subscription is canceled. Sign in to Taskr if you need to start a new plan later (do not use the public signup form with the same email).";
      }
      if (cancelBtn) cancelBtn.hidden = true;
      if (cancelHint) cancelHint.hidden = true;
      setStatus(actionStatus, null, "");
      return;
    }

    if (data.canCancel) {
      if (sessionLede) {
        sessionLede.textContent =
          data.stripeStatus === "trialing"
            ? "You are on a free trial. Cancel anytime — we schedule end of trial on Stripe so you keep access until then and are not charged."
            : "Cancel anytime. Access continues until the end of the current billing period.";
      }
      if (cancelBtn) {
        cancelBtn.hidden = false;
        cancelBtn.disabled = false;
        cancelBtn.textContent = "Cancel subscription";
      }
      if (cancelHint) {
        cancelHint.hidden = false;
        cancelHint.textContent =
          data.stripeStatus === "trialing"
            ? "Confirm next: keep access until " +
              formatWhen(data.accessUntil || data.trialEndsAt) +
              ". You will not be charged."
            : "Confirm next: keep access until " +
              formatWhen(data.accessUntil || data.currentPeriodEnd) +
              ".";
      }
      setStatus(actionStatus, null, "");
      return;
    }

    if (cancelBtn) cancelBtn.hidden = true;
    if (cancelHint) cancelHint.hidden = true;
    if (sessionLede) {
      sessionLede.textContent =
        "This subscription cannot be canceled from here right now. Email support@insiteworks.co.";
    }
  }

  async function refreshStatus() {
    setStatus(actionStatus, null, "");
    if (sessionLede) sessionLede.textContent = "Loading live status from Stripe…";
    try {
      var data = await invokeFunction("billing-subscription-status", {
        method: "POST",
        body: {},
      });
      renderStatus(data);
    } catch (err) {
      var msg = err && err.message ? String(err.message) : "status_failed";
      if (msg === "not_authenticated") {
        showLogin();
        return;
      }
      setStatus(actionStatus, "error", msg);
      if (sessionLede) {
        sessionLede.textContent = "Could not load subscription status.";
      }
    }
  }

  async function onCancel() {
    if (!latestStatus || !latestStatus.canCancel) return;
    var access =
      formatWhen(
        latestStatus.accessUntil ||
          latestStatus.trialEndsAt ||
          latestStatus.currentPeriodEnd
      );
    var confirmMsg =
      latestStatus.stripeStatus === "trialing"
        ? "Cancel your trial?\n\nYou keep access until " +
          access +
          ".\nYou will not be charged.\n\nThis cancels the subscription in Stripe automatically."
        : "Cancel your subscription?\n\nYou keep access until " +
          access +
          ".\nThis schedules cancellation in Stripe — no support ticket.";
    if (!window.confirm(confirmMsg)) return;

    if (cancelBtn) {
      cancelBtn.disabled = true;
      cancelBtn.textContent = "Canceling…";
    }
    setStatus(actionStatus, null, "");
    try {
      var result = await invokeFunction("cancel-subscription", {
        method: "POST",
        body: {},
      });
      var msg = result.message || "Cancellation scheduled.";
      if (
        Array.isArray(result.voidFailedInvoiceIds) &&
        result.voidFailedInvoiceIds.length > 0
      ) {
        setStatus(actionStatus, "error", msg);
      } else {
        setStatus(actionStatus, "success", msg);
      }
      await refreshStatus();
    } catch (err) {
      var msg = err && err.message ? String(err.message) : "cancel_failed";
      setStatus(actionStatus, "error", msg);
      if (cancelBtn) {
        cancelBtn.disabled = false;
        cancelBtn.textContent = "Cancel subscription";
      }
    }
  }

  async function onPasswordLogin(event) {
    event.preventDefault();
    var email = (emailInput && emailInput.value || "").trim().toLowerCase();
    var password = (passwordInput && passwordInput.value) || "";
    var errEmail = document.getElementById("err-billing-email");
    var errPassword = document.getElementById("err-billing-password");
    if (errEmail) errEmail.textContent = "";
    if (errPassword) errPassword.textContent = "";
    if (!email) {
      if (errEmail) errEmail.textContent = "Email is required";
      return;
    }
    if (!password) {
      if (errPassword) errPassword.textContent = "Password is required for this sign-in";
      return;
    }
    if (loginSubmit) loginSubmit.disabled = true;
    setStatus(loginStatus, null, "");
    try {
      var result = await client.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (result.error) throw result.error;
      showSession();
      await refreshStatus();
    } catch (err) {
      setStatus(
        loginStatus,
        "error",
        (err && err.message) || "Sign-in failed. Try the email link if you have not set a password yet."
      );
    } finally {
      if (loginSubmit) loginSubmit.disabled = false;
    }
  }

  async function onMagicLink() {
    var email = (emailInput && emailInput.value || "").trim().toLowerCase();
    var errEmail = document.getElementById("err-billing-email");
    if (errEmail) errEmail.textContent = "";
    if (!email) {
      if (errEmail) errEmail.textContent = "Enter your work email first";
      return;
    }
    if (magicSubmit) magicSubmit.disabled = true;
    setStatus(loginStatus, null, "");
    try {
      var result = await client.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: billingRedirectUrl(),
          shouldCreateUser: false,
        },
      });
      if (result.error) throw result.error;
      setStatus(
        loginStatus,
        "success",
        "Check your inbox for a sign-in link. Open it on this device to manage or cancel your plan."
      );
    } catch (err) {
      setStatus(
        loginStatus,
        "error",
        (err && err.message) || "Could not send sign-in link."
      );
    } finally {
      if (magicSubmit) magicSubmit.disabled = false;
    }
  }

  async function onSignOut() {
    await client.auth.signOut();
    latestStatus = null;
    showLogin();
    setStatus(loginStatus, null, "");
    setStatus(actionStatus, null, "");
  }

  if (loginForm) loginForm.addEventListener("submit", onPasswordLogin);
  if (magicSubmit) magicSubmit.addEventListener("click", onMagicLink);
  if (cancelBtn) cancelBtn.addEventListener("click", onCancel);
  if (refreshBtn) refreshBtn.addEventListener("click", function () {
    void refreshStatus();
  });
  if (signOutBtn) signOutBtn.addEventListener("click", function () {
    void onSignOut();
  });

  client.auth.onAuthStateChange(function (event, session) {
    if (session) {
      showSession();
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        void refreshStatus();
      }
    } else if (event === "SIGNED_OUT") {
      showLogin();
    }
  });

  client.auth.getSession().then(function (res) {
    if (res.data.session) {
      showSession();
      void refreshStatus();
    } else {
      showLogin();
    }
  });
})();
