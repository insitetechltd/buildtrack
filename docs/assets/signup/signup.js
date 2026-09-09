/**
 * Company account signup for GitHub Pages.
 * Mirrors mobile authStore.createCompanyAccount (signUp → create_company_for_self).
 */
(function () {
  "use strict";

  var APP_STORE_URL = "https://apps.apple.com/app/id6754898737";
  var cfg = window.INSITE_SIGNUP_SUPABASE;
  if (!cfg || !cfg.url || !cfg.anonKey) {
    console.error("Missing INSITE_SIGNUP_SUPABASE config");
    return;
  }
  if (typeof window.supabase === "undefined" || !window.supabase.createClient) {
    console.error("supabase-js CDN not loaded");
    return;
  }

  var client = window.supabase.createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  var form = document.getElementById("signup-form");
  var statusEl = document.getElementById("signup-status");
  var submitBtn = document.getElementById("signup-submit");

  function setStatus(kind, message) {
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
    return ok;
  }

  async function ensureSession(email, password, authData) {
    if (authData.session) return authData.session;
    var signed = await client.auth.signInWithPassword({ email: email, password: password });
    if (signed.error || !signed.data.session) {
      throw new Error(
        (signed.error && signed.error.message) ||
          "Account created but sign-in failed. Confirm email if required, then open Taskr and sign in."
      );
    }
    return signed.data.session;
  }

  async function waitForProfile(userId) {
    for (var attempt = 0; attempt < 5; attempt += 1) {
      var res = await client.from("users").select("id").eq("id", userId).maybeSingle();
      if (res.data && res.data.id) return;
      await new Promise(function (r) {
        setTimeout(r, 200);
      });
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    setStatus("", "");

    var data = {
      companyName: (form.companyName.value || "").trim(),
      name: (form.name.value || "").trim(),
      email: (form.email.value || "").trim().toLowerCase(),
      password: form.password.value || "",
      confirmPassword: form.confirmPassword.value || "",
    };

    if (!validate(data)) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating…";

    (async function () {
      try {
        var authRes = await client.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              name: data.name,
              system_permission: "admin",
              role: "admin",
              is_pending: false,
            },
          },
        });

        if (authRes.error) {
          throw new Error(authRes.error.message);
        }
        if (!authRes.data.user) {
          throw new Error("Could not create account");
        }

        await ensureSession(data.email, data.password, authRes.data);
        await waitForProfile(authRes.data.user.id);

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

        form.reset();
        setStatus(
          "success",
          "Company account created. Open Taskr and sign in with this email. " +
            "App Store: " +
            APP_STORE_URL
        );
      } catch (err) {
        setStatus("error", (err && err.message) || "Please try again.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create company account";
      }
    })();
  });
})();
