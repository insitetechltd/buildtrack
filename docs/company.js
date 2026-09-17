/**
 * Insite Works company portfolio — desktop docked slides + mobile snap gallery.
 * Desktop: while docked, wheel-down cycles photos; at last photo, ~30% more wheel
 * commits to the next full project. Wheel-up skips photos and leaves ASAP.
 * Between projects, ≥30% travel commits forward; under 30% snaps back on settle.
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
  let snapping = false;
  let snapTimer = 0;
  let settleTimer = 0;
  let leaveAcc = 0;

  const syncDockedEntry = () => {
    const scrub = dockedScrub();
    if (scrub && scrub !== lastDocked) {
      paintDesktopSlide(scrub, 0);
      leaveAcc = 0;
    }
    lastDocked = scrub;
  };

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
        leaveAcc = 0;
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

  /** ≥30% toward next → jump full next; used live while scrolling. */
  const commitForwardIfPastThreshold = () => {
    if (!desktop.matches || reduce || snapping) return;
    const docked = dockedScrub();
    if (docked) {
      const n = docked.querySelectorAll(".project-slide").length;
      if (desktopIndex(docked) < n - 1) return;
    }
    const list = waypoints();
    const idx = currentWaypointIndex();
    const cur = list[idx];
    const next = list[idx + 1];
    if (!cur || !next) return;
    const curY = snapY(cur);
    const nextY = snapY(next);
    const span = Math.max(1, nextY - curY);
    const progressed = (window.scrollY - curY) / span;
    if (progressed >= COMMIT && progressed < 0.98) {
      jumpTo(next, true);
    }
  };

  /** Under 30% travel when scroll settles → snap back so stops aren't missed. */
  const snapBackIfUnderThreshold = () => {
    if (!desktop.matches || reduce || snapping) return;
    const docked = dockedScrub();
    if (docked) {
      const n = docked.querySelectorAll(".project-slide").length;
      if (desktopIndex(docked) < n - 1) return;
    }
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
    if (progressed > 0.02 && progressed < COMMIT) {
      jumpTo(cur, true);
    } else if (progressed >= COMMIT && progressed < 0.98) {
      jumpTo(next, true);
    } else if (progressed <= 0.02 && Math.abs(window.scrollY - curY) > 8) {
      jumpTo(cur, true);
    }
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
      if (!desktop.matches || reduce || snapping) return;
      const scrub = dockedScrub();
      if (!scrub) {
        wheelAcc = 0;
        leaveAcc = 0;
        return;
      }

      const list = waypoints();
      const scrubIdx = scrubSections.indexOf(scrub);
      // waypoints: company + scrubs + contact → scrub index in waypoints is scrubIdx + (company?1:0)
      const wpIdx = list.indexOf(scrub);

      // Scroll up: skip photo reverse — reset and leave to previous section ASAP.
      if (e.deltaY < 0) {
        wheelAcc = 0;
        if (desktopIndex(scrub) > 0) paintDesktopSlide(scrub, 0);
        e.preventDefault();
        leaveAcc += -e.deltaY;
        const upThreshold = Math.max(48, window.innerHeight * 0.12);
        if (leaveAcc >= upThreshold) {
          leaveAcc = 0;
          const prev = wpIdx > 0 ? list[wpIdx - 1] : null;
          if (prev) jumpTo(prev, true);
        }
        return;
      }

      if (e.deltaY <= 0) return;

      const n = scrub.querySelectorAll(".project-slide").length;
      const i = desktopIndex(scrub);

      // Scroll down with photos remaining — lock page and advance.
      if (n > 1 && i < n - 1) {
        leaveAcc = 0;
        e.preventDefault();
        const now = Date.now();
        if (now < wheelLockUntil) return;

        wheelAcc += e.deltaY;
        const threshold = e.deltaMode === 1 ? 1 : 36;
        if (wheelAcc < threshold) return;

        wheelAcc = 0;
        paintDesktopSlide(scrub, i + 1);
        wheelLockUntil = now + 380;
        return;
      }

      // Last photo (or single photo): consume wheel; at 30% viewport intent, jump next.
      e.preventDefault();
      wheelAcc = 0;
      leaveAcc += e.deltaY;
      const downThreshold = Math.max(80, window.innerHeight * COMMIT);
      if (leaveAcc >= downThreshold) {
        leaveAcc = 0;
        const next = wpIdx >= 0 && wpIdx < list.length - 1 ? list[wpIdx + 1] : null;
        if (next) jumpTo(next, true);
      }
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

  document.querySelector("[data-page-next]")?.addEventListener("click", () => {
    const list = waypoints();
    const y = window.scrollY + stickyOffset() + 8;
    let target = list[list.length - 1];
    for (const el of list) {
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
