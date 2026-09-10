/** DEV / Stripe test sandbox config for GitHub Pages signup.
 * Load via signup.html?env=sandbox (or assets/signup/supabase-config.sandbox.js).
 * Publishable anon key only — never service-role.
 */
window.INSITE_SIGNUP_SUPABASE = {
  env: "sandbox",
  url: 'https://zusulknbhaumougqckec.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1c3Vsa25iaGF1bW91Z3Fja2VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MjQ3NzIsImV4cCI6MjA3NjAwMDc3Mn0.MllamzveYfgR0hH1G-1-qv-E7wjMkhzjH8MhWnO-cIA',
  /** livemode=false plan_prices on DEV */
  plans: {
    growth: {
      planTierSlug: "growth",
      planPriceId: "07520414-ecb5-43e9-a566-2744046380a7",
      label: "Starter",
      amountLabel: "HK$160 / month",
    },
    unlimited: {
      planTierSlug: "unlimited",
      planPriceId: "12fc9850-4996-496a-860a-7e2ab3551562",
      label: "Pro",
      amountLabel: "HK$400 / month",
    },
  },
  defaultPlan: "growth",
};
