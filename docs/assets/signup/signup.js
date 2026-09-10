/**
 * Company account signup for GitHub Pages.
 * Sandbox (?env=sandbox): DEV Supabase + Stripe test Checkout after create.
 * Production (default): PROD account create only (App Review path).
 *
 * When Auth requires email confirmation: stash form → user clicks mail link →
 * returns here with session → finish company (+ checkout in sandbox).
 */
(function () {
  "use strict";

  var APP_STORE_URL = "https://apps.apple.com/app/id6754898737";
  var PENDING_KEY = "insite_signup_pending_v1";
  var cfg = window.INSITE_SIGNUP_SUPABASE;
  if (!cfg || !cfg.url || !cfg.anonKey) {
    console.error("Missing INSITE_SIGNUP_SUPABASE config");
    return;
  }
  if (typeof window.supabase === "undefined" || !window.supabase.createClient) {
    console.error("supabase-js CDN not loaded");
    return;
  }

  var isSandbox = cfg.env === "sandbox";
  var client = window.supabase.createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  var form = document.getElementById("signup-form");
  var statusEl = document.getElementById("signup-status");
  var submitBtn = document.getElementById("signup-submit");
  var sandboxBanner = document.getElementById("signup-sandbox-banner");
  var planFieldset = document.getElementById("signup-plan-fieldset");

  if (sandboxBanner) {
    sandboxBanner.hidden = !isSandbox;
  }
  if (planFieldset) {
    planFieldset.hidden = !isSandbox;
  }
  if (submitBtn && isSandbox) {
    submitBtn.textContent = "Create account & pay with Stripe (test)";
  }

  function setStatus(kind, message) {
    if (!statusEl) return;
    statusEl.className = "signup-status" + (kind ? " is-" + kind : "");
    statusEl.textContent = message || "";
    statusEl.style.display = kind ? "block" : "none";
  }

  function fieldError(id, message) {
    var el = document.getElementById("err-" + id);
    if (el) el.textContent = message || "";
  }

  function clearErrors() {
    ["companyName", "name", "email", "password", "confirmPassword"].forEach(function (id) {
      fieldError(id, "");
    });
  }

  function signupReturnUrl() {
    var url = new URL(window.location.href);
    url.hash = "";
    url.searchParams.delete("checkout");
    url.searchParams.set("confirmed", "1");
    if (isSandbox) url.searchParams.set("env", "sandbox");
    else url.searchParams.delete("env");
    return url.toString();
  }

  function pageUrlWith(query) {
    var url = new URL(window.location.href);
    url.hash = "";
    Object.keys(query).forEach(function (key) {
      if (query[key] == null || query[key] === "") url.searchParams.delete(key);
      else url.searchParams.set(key, query[key]);
    });
    if (isSandbox) url.searchParams.set("env", "sandbox");
    return url.toString();
  }

  function savePending(data) {
    try {
      sessionStorage.setItem(
        PENDING_KEY,
        JSON.stringify({
          companyName: data.companyName,
          name: data.name,
          email: data.email,
          planKey: data.planKey || null,
          env: cfg.env || "production",
          savedAt: Date.now(),
        })
      );
    } catch (e) {}
  }

  function loadPending() {
    try {
      var raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.companyName || !parsed.email) return null;
      if (parsed.env && parsed.env !== (cfg.env || "production")) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function clearPending() {
    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch (e) {}
  }

  function fillFormFromPending(pending) {
    if (!form || !pending) return;
    if (pending.companyName) form.companyName.value = pending.companyName;
    if (pending.name) form.name.value = pending.name;
    if (pending.email) form.email.value = pending.email;
    if (isSandbox && pending.planKey && form.querySelector) {
      var radio = form.querySelector('input[name="plan"][value="' + pending.planKey + '"]');
      if (radio) radio.checked = true;
    }
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
    if (!data.password) {
      fieldError("password", "Password is required");
      ok = false;
    } else if (data.password.length < 6) {
      fieldError("password", "Password must be at least 6 characters");
      ok = false;
    }
    if (data.password !== data.confirmPassword) {
      fieldError("confirmPassword", "Passwords do not match");
      ok = false;
    }
    if (isSandbox && !data.planKey) {
      setStatus("error", "Choose a plan to continue to Stripe Checkout.");
      ok = false;
    }
    return ok;
  }

  function selectedPlanKey() {
    var checked = form.querySelector('input[name="plan"]:checked');
    return checked ? checked.value : cfg.defaultPlan || "growth";
  }

  function isAlreadyRegisteredError(err) {
    var msg = ((err && err.message) || "").toLowerCase();
    return (
      /already\s+(been\s+)?registered/.test(msg) ||
      /user already exists/.test(msg) ||
      /email.*already/.test(msg)
    );
  }

  function isEmailNotConfirmedError(err) {
    var msg = ((err && err.message) || "").toLowerCase();
    return /email not confirmed|confirm.*email|email.*confirm/.test(msg);
  }

  async function waitForProfile(userId) {
    for (var attempt = 0; attempt < 5; attempt += 1) {
      var res = await client.from("users").select("id, company_id").eq("id", userId).maybeSingle();
      if (res.data && res.data.id) return res.data;
      await new Promise(function (r) {
        setTimeout(r, 200);
      });
    }
    return null;
  }

  async function startSandboxCheckout(companyId, planKey, accessToken) {
    var plan = (cfg.plans && cfg.plans[planKey]) || null;
    if (!plan) {
      throw new Error("Unknown plan selection");
    }

    var successUrl = pageUrlWith({ checkout: "success", confirmed: "" });
    var cancelUrl = pageUrlWith({ checkout: "cancel", confirmed: "" });

    var invoke = await client.functions.invoke("create-checkout-session", {
      headers: {
        Authorization: "Bearer " + accessToken,
      },
      body: {
        companyId: companyId,
        planTierSlug: plan.planTierSlug,
        planPriceId: plan.planPriceId,
        successUrl: successUrl,
        cancelUrl: cancelUrl,
      },
    });

    if (invoke.error) {
      var msg = invoke.error.message || "Checkout failed";
      if (invoke.data && invoke.data.message) msg = invoke.data.message;
      if (invoke.data && invoke.data.error) {
        msg = invoke.data.message || invoke.data.error;
      }
      throw new Error(msg);
    }

    var payload = invoke.data || {};
    if (payload.error) {
      throw new Error(payload.message || payload.error);
    }
    if (payload.upgraded) {
      setStatus(
        "success",
        "Plan upgraded without Checkout redirect. Sign in on Taskr (DEV) to confirm entitlements."
      );
      return;
    }
    if (!payload.url) {
      throw new Error("Stripe did not return a checkout URL");
    }
    window.location.assign(payload.url);
  }

  async function finishWithSession(session, data) {
    if (!session || !session.user) {
      throw new Error("Missing session");
    }

    var profile = await waitForProfile(session.user.id);
    var companyId = profile && profile.company_id;

    if (!companyId) {
      var rpcRes = await client.rpc("create_company_for_self", {
        company_name: data.companyName,
        company_type: "general_contractor",
      });

      if (rpcRes.error) {
        await client.auth.signOut().catch(function () {});
        var msg = rpcRes.error.message || "Failed to create company";
        if (
          rpcRes.error.code === "PGRST202" ||
          rpcRes.error.code === "42883" ||
          /create_company_for_self/i.test(msg)
        ) {
          msg = "Company setup is not enabled on this server yet.";
        }
        throw new Error(msg);
      }

      companyId =
        (typeof rpcRes.data === "string" && rpcRes.data) ||
        (rpcRes.data && rpcRes.data.id) ||
        null;

      if (!companyId) {
        var refreshed = await client
          .from("users")
          .select("company_id")
          .eq("id", session.user.id)
          .maybeSingle();
        companyId = refreshed.data && refreshed.data.company_id;
      }
    }

    clearPending();

    if (isSandbox) {
      if (!companyId) {
        throw new Error("Company created but id missing — cannot start Checkout");
      }
      setStatus("success", "Company created. Redirecting to Stripe test Checkout…");
      await startSandboxCheckout(
        companyId,
        data.planKey || cfg.defaultPlan || "growth",
        session.access_token
      );
      return;
    }

    if (form) form.reset();
    setStatus(
      "success",
      "Company account created. Open Taskr and sign in with this email. " +
        "App Store: " +
        APP_STORE_URL
    );
  }

  async function obtainSession(data) {
    var authRes = await client.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: signupReturnUrl(),
        data: {
          name: data.name,
          system_permission: "admin",
          role: "admin",
          is_pending: false,
        },
      },
    });

    if (authRes.error) {
      if (isAlreadyRegisteredError(authRes.error)) {
        var signed = await client.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (signed.error) {
          if (isEmailNotConfirmedError(signed.error)) {
            savePending(data);
            throw new Error(
              "This email is registered but not confirmed yet. Open the confirmation link we sent, then return here — or use Resend from your inbox. After confirming, submit this form again with the same password."
            );
          }
          throw new Error(signed.error.message);
        }
        return signed.data.session;
      }
      throw new Error(authRes.error.message);
    }

    if (!authRes.data.user) {
      throw new Error("Could not create account");
    }

    if (authRes.data.session) {
      return authRes.data.session;
    }

    // Confirm-email required: no session until link is clicked.
    savePending(data);
    setStatus(
      "success",
      "Check your inbox for a confirmation email from Taskr / Supabase. Click the link to verify, then you’ll return here to finish company setup" +
        (isSandbox ? " and Stripe Checkout" : "") +
        ". Keep this tab open or submit again after confirming."
    );
    return null;
  }

  async function resumeAfterEmailConfirm() {
    var pending = loadPending();
    fillFormFromPending(pending);

    var sessionRes = await client.auth.getSession();
    var session = sessionRes.data && sessionRes.data.session;
    if (!session) return false;

    if (!pending || !pending.companyName) {
      setStatus(
        "success",
        "Email confirmed. Enter your company details and password again, then submit to finish setup."
      );
      return true;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = isSandbox ? "Finishing & opening Checkout…" : "Finishing…";
    }
    setStatus("success", "Email confirmed. Finishing company setup…");

    try {
      await finishWithSession(session, {
        companyName: pending.companyName,
        name: pending.name || "",
        email: pending.email,
        planKey: pending.planKey,
      });
    } catch (err) {
      setStatus("error", (err && err.message) || "Please try again.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = isSandbox
          ? "Create account & pay with Stripe (test)"
          : "Create company account";
      }
    }
    return true;
  }

  try {
    var params = new URLSearchParams(window.location.search);
    var prefillEmail = params.get("email");
    if (prefillEmail && form && form.email) {
      form.email.value = String(prefillEmail).trim();
    }
    var checkout = params.get("checkout");
    if (checkout === "success") {
      setStatus(
        "success",
        "Stripe Checkout completed (sandbox). Open Taskr (DEV / Internal TF), sign in, and confirm Pro/Starter entitlements."
      );
    } else if (checkout === "cancel") {
      setStatus(
        "error",
        "Checkout canceled. Your company account may already exist — sign in on Taskr or retry checkout from Company Plan."
      );
    } else if (params.get("confirmed") === "1" || window.location.hash.indexOf("access_token") >= 0) {
      resumeAfterEmailConfirm();
    } else {
      var existingPending = loadPending();
      if (existingPending) fillFormFromPending(existingPending);
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
      password: form.password.value || "",
      confirmPassword: form.confirmPassword.value || "",
      planKey: isSandbox ? selectedPlanKey() : null,
    };

    if (!validate(data)) return;

    submitBtn.disabled = true;
    submitBtn.textContent = isSandbox ? "Creating & opening Checkout…" : "Creating…";

    (async function () {
      try {
        var session = await obtainSession(data);
        if (!session) {
          // Waiting on email confirmation — status already set.
          return;
        }
        await finishWithSession(session, data);
      } catch (err) {
        setStatus("error", (err && err.message) || "Please try again.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isSandbox
          ? "Create account & pay with Stripe (test)"
          : "Create company account";
      }
    })();
  });
})();
