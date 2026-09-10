/** PROD Supabase + Stripe live catalog for GitHub Pages signup.
 * Publishable anon key only — never service-role.
 */
window.INSITE_SIGNUP_SUPABASE = {
  env: "production",
  url: 'https://jcnzjigxgkzhjsaekoqz.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjbnpqaWd4Z2t6aGpzYWVrb3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5ODQ2NjgsImV4cCI6MjEwMzU2MDY2OH0.4H_OH_Vt_HXzjCHgi0EJA5-Td_K4QUm35JnY0boCFMc',
  /** livemode=true plan_prices on PROD */
  plans: {
    growth: {
      planTierSlug: "growth",
      planPriceId: "bca2ac77-5f1b-4b2a-b882-2475e2044b7d",
      label: "Starter",
      amountLabel: "HK$160 / month",
    },
    unlimited: {
      planTierSlug: "unlimited",
      planPriceId: "c949b9e9-7002-44e2-9757-9cb92215fa0c",
      label: "Pro",
      amountLabel: "HK$400 / month",
    },
  },
  defaultPlan: "growth",
};
