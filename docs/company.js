/**
 * Insite Works company portfolio — desktop docked slides + mobile snap gallery.
 * Desktop: snap to each project, then wheel cycles photos; page scroll only at slide ends.
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

  const paintDesktopSlide = (scrub, index) => {
    const slides = [...scrub.querySelectorAll(".project-slide")];
    const n = slides.length;
    if (!n) return 0;
    const i = Math.max(0, Math.min(n - 1, index));
    scrub.dataset.slide = String(i);
    slides.forEach((s, idx) => s.classList.toggle("is-active", idx === i));
    const c = scrub.querySelector("[data-counter]");
    if (c) {
      c.textContent = `${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
    }
    const bar = scrub.querySelector("[data-progress]");
    if (bar) {
      bar.style.transform = `scaleX(${n <= 1 ? 1 : i / (n - 1)})`;
    }
    return i;
  };

  const desktopIndex = (scrub) => {
    const n = scrub.querySelectorAll(".project-slide").length;
    const raw = Number(scrub.dataset.slide || 0);
    if (!Number.isFinite(raw)) return 0;
    return Math.max(0, Math.min(Math.max(0, n - 1), raw));
  };

  /** Project is parked under the header — photos cycle only in this state. */
  const isDocked = (scrub) => {
    const top = scrub.getBoundingClientRect().top;
    return Math.abs(top - stickyOffset()) <= 36;
  };

  const dockedScrub = () => {
    if (!desktop.matches || reduce) return null;
    for (const scrub of scrubSections) {
      if (isDocked(scrub)) return scrub;
    }
    return null;
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

  let lastDocked = null;
  let lastScrollY = window.scrollY;
  const syncDockedEntry = () => {
    const scrub = dockedScrub();
    const dir = window.scrollY - lastScrollY;
    lastScrollY = window.scrollY;
    if (scrub && scrub !== lastDocked) {
      const n = scrub.querySelectorAll(".project-slide").length;
      paintDesktopSlide(scrub, dir < 0 ? Math.max(0, n - 1) : 0);
    }
    lastDocked = scrub;
  };

  const update = () => {
    syncChrome();
    if (reduce || !desktop.matches) {
      lastDocked = null;
      scrubSections.forEach((scrub) => {
        scrub.querySelectorAll(".project-slide").forEach((s, i) => {
          s.classList.toggle("is-active", i === 0);
        });
      });
      updateMobileGalleries();
      return;
    }
    syncDockedEntry();
    scrubSections.forEach((scrub) => paintDesktopSlide(scrub, desktopIndex(scrub)));
  };

  scrubSections.forEach((scrub) => {
    paintDesktopSlide(scrub, 0);
    const viewport = scrub.querySelector(".project-viewport");
    viewport?.addEventListener("click", (e) => {
      if (!desktop.matches || reduce) return;
      if (!isDocked(scrub)) return;
      if (e.target.closest("a, button")) return;
      const n = scrub.querySelectorAll(".project-slide").length;
      if (n <= 1) return;
      const i = desktopIndex(scrub);
      paintDesktopSlide(scrub, i >= n - 1 ? 0 : i + 1);
    });
  });

  let wheelAcc = 0;
  let wheelLockUntil = 0;
  window.addEventListener(
    "wheel",
    (e) => {
      if (!desktop.matches || reduce) return;
      const scrub = dockedScrub();
      if (!scrub) {
        wheelAcc = 0;
        return;
      }
      const n = scrub.querySelectorAll(".project-slide").length;
      if (n <= 1) return;

      const i = desktopIndex(scrub);
      const down = e.deltaY > 0;
      const up = e.deltaY < 0;

      // Still have slides in this direction — lock page scroll and cycle photos.
      if ((down && i < n - 1) || (up && i > 0)) {
        e.preventDefault();
        const now = Date.now();
        if (now < wheelLockUntil) return;

        wheelAcc += e.deltaY;
        const threshold = e.deltaMode === 1 ? 1 : 36;
        if (Math.abs(wheelAcc) < threshold) return;

        const step = wheelAcc > 0 ? 1 : -1;
        wheelAcc = 0;
        paintDesktopSlide(scrub, i + step);
        wheelLockUntil = now + 380;
        return;
      }

      // At first/last slide — release so the page can leave this project.
      wheelAcc = 0;
    },
    { passive: false, capture: true },
  );

  document.querySelectorAll(".mobile-gallery").forEach((gallery) => {
    gallery.addEventListener(
      "scroll",
      () =>
        setMobileIndex(
          gallery,
          (() => {
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
          })(),
        ),
      { passive: true },
    );
    setMobileIndex(gallery, 0);
  });

  const jumpTo = (el) => {
    if (!el) return;
    const dest = window.scrollY + el.getBoundingClientRect().top;
    if (dest > 40) document.body.classList.add("is-projects");
    const y = Math.max(0, window.scrollY + el.getBoundingClientRect().top - stickyOffset());
    window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  };

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
