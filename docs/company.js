/**
 * Insite Works company portfolio — desktop photo-hover scrub + mobile snap gallery.
 *
 * Desktop strategy (restart):
 * 1. Page scroll snaps to each project (and company / contact).
 * 2. Wheel over the photo viewport cycles photos (vertical or sideways delta).
 * 3. Past the last / first photo, continued wheel jumps to the next / previous project.
 * 4. Wheel over the copy panel (or elsewhere) only moves the page — no photo hijack.
 */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktop = window.matchMedia("(min-width: 861px)");
  const header = document.querySelector(".site-header");
  const companySection = document.querySelector("#company");
  const workSection = document.querySelector("#work");
  const contactSection = document.querySelector("#contact");
  const chromeSection = companySection || workSection;
  const scrubSections = [...document.querySelectorAll("[data-scrub] .project-scrub")];
  const COMMIT = 0.3;

  const stickyOffset = () => {
    if (!document.body.classList.contains("is-projects")) return 0;
    return header ? header.getBoundingClientRect().height : 0;
  };

  const waypoints = () =>
    [companySection, ...scrubSections, contactSection].filter(Boolean);

  const snapY = (el) =>
    Math.max(0, window.scrollY + el.getBoundingClientRect().top - stickyOffset());

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

  const isInView = (scrub) => {
    const rect = scrub.getBoundingClientRect();
    const mid = window.innerHeight * 0.5;
    return rect.top < mid && rect.bottom > mid;
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

  let snapping = false;
  let snapTimer = 0;
  let settleTimer = 0;
  let hoveredViewport = null;

  const jumpTo = (el, instant = false) => {
    if (!el) return;
    const dest = window.scrollY + el.getBoundingClientRect().top;
    if (dest > 40) document.body.classList.add("is-projects");
    const y = snapY(el);
    snapping = true;
    window.scrollTo({
      top: y,
      behavior: reduce || instant ? "auto" : "smooth",
    });
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(
      () => {
        snapping = false;
        update();
      },
      reduce || instant ? 80 : 520,
    );
  };

  const currentWaypointIndex = () => {
    const list = waypoints();
    const y = window.scrollY;
    let idx = 0;
    for (let i = 0; i < list.length; i += 1) {
      if (snapY(list[i]) <= y + 12) idx = i;
    }
    return idx;
  };

  const commitForwardIfPastThreshold = () => {
    if (!desktop.matches || reduce || snapping || hoveredViewport) return;
    const list = waypoints();
    const idx = currentWaypointIndex();
    const cur = list[idx];
    const next = list[idx + 1];
    if (!cur || !next) return;
    const curY = snapY(cur);
    const nextY = snapY(next);
    const span = Math.max(1, nextY - curY);
    const progressed = (window.scrollY - curY) / span;
    if (progressed >= COMMIT && progressed < 0.98) jumpTo(next, true);
  };

  const snapBackIfUnderThreshold = () => {
    if (!desktop.matches || reduce || snapping || hoveredViewport) return;
    const list = waypoints();
    const idx = currentWaypointIndex();
    const cur = list[idx];
    const next = list[idx + 1];
    if (!cur) return;
    const curY = snapY(cur);
    if (!next) {
      if (Math.abs(window.scrollY - curY) > 8) jumpTo(cur, true);
      return;
    }
    const nextY = snapY(next);
    const span = Math.max(1, nextY - curY);
    const progressed = (window.scrollY - curY) / span;
    if (progressed > 0.02 && progressed < COMMIT) jumpTo(cur, true);
    else if (progressed >= COMMIT && progressed < 0.98) jumpTo(next, true);
    else if (progressed <= 0.02 && Math.abs(window.scrollY - curY) > 8) jumpTo(cur, true);
  };

  const update = () => {
    syncChrome();
    syncPager();
    if (reduce || !desktop.matches) {
      scrubSections.forEach((scrub) => {
        scrub.querySelectorAll(".project-slide").forEach((s, i) => {
          s.classList.toggle("is-active", i === 0);
        });
      });
      updateMobileGalleries();
      return;
    }
    scrubSections.forEach((scrub) => paintDesktopSlide(scrub, desktopIndex(scrub)));
  };

  scrubSections.forEach((scrub) => {
    paintDesktopSlide(scrub, 0);
    const viewport = scrub.querySelector(".project-viewport");
    if (!viewport) return;

    viewport.addEventListener("pointerenter", () => {
      hoveredViewport = viewport;
    });
    viewport.addEventListener("pointerleave", () => {
      if (hoveredViewport === viewport) hoveredViewport = null;
    });

    let wheelAcc = 0;
    let leaveAcc = 0;
    let wheelLockUntil = 0;

    viewport.addEventListener(
      "wheel",
      (e) => {
        if (!desktop.matches || reduce || snapping) return;
        if (!isInView(scrub)) return;

        // Prefer sideways intent when stronger; otherwise vertical.
        const useX = Math.abs(e.deltaX) > Math.abs(e.deltaY);
        const raw = useX ? e.deltaX : e.deltaY;
        if (raw === 0) return;

        const n = scrub.querySelectorAll(".project-slide").length;
        const i = desktopIndex(scrub);
        const list = waypoints();
        const wpIdx = list.indexOf(scrub);
        const forward = raw > 0;

        e.preventDefault();

        if (n > 1 && forward && i < n - 1) {
          leaveAcc = 0;
          const now = Date.now();
          if (now < wheelLockUntil) return;
          wheelAcc += Math.abs(raw);
          if (wheelAcc < (e.deltaMode === 1 ? 1 : 36)) return;
          wheelAcc = 0;
          paintDesktopSlide(scrub, i + 1);
          wheelLockUntil = now + 360;
          return;
        }

        if (n > 1 && !forward && i > 0) {
          leaveAcc = 0;
          const now = Date.now();
          if (now < wheelLockUntil) return;
          wheelAcc += Math.abs(raw);
          if (wheelAcc < (e.deltaMode === 1 ? 1 : 36)) return;
          wheelAcc = 0;
          paintDesktopSlide(scrub, i - 1);
          wheelLockUntil = now + 360;
          return;
        }

        // At end of gallery — continued scroll jumps project.
        wheelAcc = 0;
        leaveAcc += Math.abs(raw);
        const threshold = Math.max(72, window.innerHeight * COMMIT);
        if (leaveAcc < threshold) return;
        leaveAcc = 0;
        if (forward) {
          const next = wpIdx >= 0 && wpIdx < list.length - 1 ? list[wpIdx + 1] : null;
          if (next) jumpTo(next, true);
        } else {
          const prev = wpIdx > 0 ? list[wpIdx - 1] : null;
          if (prev) jumpTo(prev, true);
        }
      },
      { passive: false },
    );

    viewport.addEventListener("click", (e) => {
      if (!desktop.matches || reduce) return;
      if (e.target.closest("a, button")) return;
      const n = scrub.querySelectorAll(".project-slide").length;
      if (n <= 1) return;
      const i = desktopIndex(scrub);
      paintDesktopSlide(scrub, i >= n - 1 ? 0 : i + 1);
    });
  });

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

  const heroSection = document.querySelector(".hero");
  const prevBtn = document.querySelector("[data-page-prev]");
  const nextBtn = document.querySelector("[data-page-next]");

  const nextWaypoint = () => {
    const list = waypoints();
    const idx = currentWaypointIndex();
    if (idx < 0 || idx >= list.length - 1) return null;
    return list[idx + 1];
  };

  const prevWaypoint = () => {
    const list = waypoints();
    if (!list.length) return heroSection;
    const idx = currentWaypointIndex();
    const firstY = snapY(list[0]);
    if (window.scrollY <= firstY + 12) return heroSection;
    return idx > 0 ? list[idx - 1] : heroSection;
  };

  const syncPager = () => {
    const list = waypoints();
    const y = window.scrollY;
    const atTop = y < 48 || !document.body.classList.contains("is-projects");
    const last = list[list.length - 1];
    const atLast = Boolean(last && snapY(last) <= y + 24);
    if (prevBtn) {
      prevBtn.hidden = atTop;
      prevBtn.disabled = atTop;
    }
    if (nextBtn) {
      nextBtn.hidden = atLast;
      nextBtn.disabled = atLast;
    }
  };

  prevBtn?.addEventListener("click", () => {
    const target = prevWaypoint();
    if (!target || target === heroSection) {
      document.body.classList.remove("is-projects");
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      return;
    }
    jumpTo(target);
  });

  nextBtn?.addEventListener("click", () => {
    const target = nextWaypoint();
    if (target) jumpTo(target);
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

  window.addEventListener(
    "scroll",
    () => {
      update();
      if (!desktop.matches || reduce || snapping) return;
      commitForwardIfPastThreshold();
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(snapBackIfUnderThreshold, 140);
    },
    { passive: true },
  );
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
