/**
 * Insite Works company portfolio — desktop scrub + mobile snap gallery.
 */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktop = window.matchMedia("(min-width: 861px)");
  const header = document.querySelector(".site-header");
  const companySection = document.querySelector("#company");
  const workSection = document.querySelector("#work");
  const chromeSection = companySection || workSection;
  const scrubSections = [...document.querySelectorAll("[data-scrub] .project-scrub")];

  const stickyOffset = () => {
    if (!document.body.classList.contains("is-projects")) return 0;
    return header ? header.getBoundingClientRect().height : 0;
  };

  const syncChrome = () => {
    if (!chromeSection) return;
    const top = chromeSection.getBoundingClientRect().top;
    document.body.classList.toggle("is-projects", top < window.innerHeight * 0.72);
  };

  const engagementY = (scrub) =>
    Math.max(0, window.scrollY + scrub.getBoundingClientRect().top - stickyOffset());

  const travelFor = (scrub) => {
    const stage = scrub.querySelector(".project-stage");
    return Math.max(1, scrub.offsetHeight - (stage ? stage.offsetHeight : window.innerHeight));
  };

  const updateDesktopScrub = () => {
    const top = stickyOffset();
    scrubSections.forEach((scrub) => {
      const slides = [...scrub.querySelectorAll(".project-slide")];
      if (!slides.length) return;
      const rect = scrub.getBoundingClientRect();
      const travel = travelFor(scrub);
      const scrolled = top - rect.top;
      const t = Math.min(1, Math.max(0, scrolled / travel));
      const n = slides.length;
      const index = t >= 1 ? n - 1 : Math.min(n - 1, Math.floor(t * n));
      slides.forEach((s, i) => s.classList.toggle("is-active", i === index));
      const c = scrub.querySelector("[data-counter]");
      if (c) {
        c.textContent = `${String(index + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
      }
      const bar = scrub.querySelector("[data-progress]");
      if (bar) {
        const p = n <= 1 ? 1 : index / (n - 1);
        bar.style.transform = `scaleX(${p})`;
      }
    });
  };

  const setMobileIndex = (gallery, index) => {
    const imgs = [...gallery.querySelectorAll("img")];
    const n = imgs.length;
    if (!n) return;
    const i = Math.max(0, Math.min(n - 1, index));
    const rail = gallery.closest(".mobile-rail");
    const label = rail?.querySelector("[data-mobile-counter]");
    const bar = rail?.querySelector("[data-mobile-progress]");
    if (label) {
      label.textContent = `${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
    }
    if (bar) {
      bar.style.transform = `scaleX(${n <= 1 ? 1 : i / (n - 1)})`;
    }
  };

  const updateMobileGalleries = () => {
    document.querySelectorAll(".mobile-gallery").forEach((gallery) => {
      const imgs = [...gallery.querySelectorAll("img")];
      if (!imgs.length) return;
      const mid = gallery.scrollLeft + gallery.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      imgs.forEach((img, i) => {
        const center = img.offsetLeft + img.offsetWidth / 2;
        const dist = Math.abs(center - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setMobileIndex(gallery, best);
    });
  };

  const update = () => {
    syncChrome();
    if (reduce || !desktop.matches) {
      scrubSections.forEach((scrub) => {
        scrub.querySelectorAll(".project-slide").forEach((s, i) => {
          s.classList.toggle("is-active", i === 0);
        });
      });
      updateMobileGalleries();
      return;
    }
    updateDesktopScrub();
  };

  document.querySelectorAll(".mobile-gallery").forEach((gallery) => {
    gallery.addEventListener("scroll", () => setMobileIndex(gallery, (() => {
      const imgs = [...gallery.querySelectorAll("img")];
      const mid = gallery.scrollLeft + gallery.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      imgs.forEach((img, i) => {
        const center = img.offsetLeft + img.offsetWidth / 2;
        const dist = Math.abs(center - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      return best;
    })()), { passive: true });
    setMobileIndex(gallery, 0);
  });

  const jumpTo = (el) => {
    if (!el) return;
    const dest = window.scrollY + el.getBoundingClientRect().top;
    if (dest > 40) document.body.classList.add("is-projects");
    const y = Math.max(0, window.scrollY + el.getBoundingClientRect().top - stickyOffset());
    window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  };

  document.querySelectorAll("[data-next-project]").forEach((btn, i) => {
    btn.addEventListener("click", () => {
      const next = scrubSections[i + 1];
      const tail = document.querySelector("#contact");
      if (next) jumpTo(next);
      else jumpTo(tail);
    });
  });

  document.querySelector("[data-page-next]")?.addEventListener("click", () => {
    const waypoints = [
      companySection,
      ...scrubSections,
      document.querySelector("#contact"),
    ].filter(Boolean);
    const y = window.scrollY + stickyOffset() + 8;
    let target = waypoints[waypoints.length - 1];
    for (const el of waypoints) {
      const top = window.scrollY + el.getBoundingClientRect().top;
      if (top > y + 40) {
        target = el;
        break;
      }
    }
    jumpTo(target);
  });

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      const el = document.getElementById(href.slice(1));
      if (!el) return;
      e.preventDefault();
      history.pushState(null, "", href);
      jumpTo(el);
    });
  });

  document.querySelector(".logo")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  });

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  if (desktop.addEventListener) desktop.addEventListener("change", update);
  update();

  const hashTarget = () => {
    const id = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (!id) return null;
    return document.getElementById(id);
  };
  const goHash = () => {
    const el = hashTarget();
    if (!el) return;
    syncChrome();
    jumpTo(el);
  };
  window.addEventListener("hashchange", goHash);
  if (hashTarget()) {
    requestAnimationFrame(goHash);
  }
})();
