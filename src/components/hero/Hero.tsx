import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import type { SceneDriver } from "./Scene";
import { Magnetic } from "../Magnetic";

const Scene = lazy(() => import("./Scene"));

gsap.registerPlugin(ScrollTrigger);

const SECTIONS = [
  {
    title: "Note tout ce que tu aimes.",
    body: "Films, séries, jeux, livres, manga, musique, concerts, mode. Une note sur cinq, demi-étoiles comprises.",
    corner: "Musique, en ce moment sur la platine",
  },
  {
    title: "Écris ce que les autres n'osent pas.",
    body: "Une œuvre, ton avis, point. Les spoilers restent cachés jusqu'à ce qu'on clique dessus.",
    corner: "Films et concerts, une place au premier rang",
  },
  {
    title: "Grimpe au classement.",
    body: "Chaque note et chaque critique rapportent des points. Les votes des autres membres font le reste.",
    corner: "Livres et manga, marque-page compris",
  },
];

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function SplitTitle({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className} aria-label={text}>
      {text.split("").map((ch, i) => (
        <span key={i} className="split-char" aria-hidden>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

/**
 * Hero de la page d'accueil.
 *  - `story` (visiteur déconnecté) : intro + récit de 3 sections au scroll, objet épinglé.
 *  - `compact` (membre connecté) : intro courte, une seule hauteur d'écran, puis le fil.
 */
export default function Hero({ mode, onSignup }: { mode: "story" | "compact"; onSignup: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const driver = useRef<SceneDriver>({ progress: 0, intro: 0, mouse: { x: 0, y: 0 } });
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [introDone, setIntroDone] = useState(false);
  const introTl = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    setWebgl(hasWebGL());
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const small = window.innerWidth < 768;
    setQuality(coarse || small || (navigator.hardwareConcurrency ?? 8) <= 4 ? "low" : "high");
  }, []);

  // Intro cinématique (2,4 s), passable au clic. Rejouée une seule fois par session.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem("kritiq_intro_seen") === "1";
      sessionStorage.setItem("kritiq_intro_seen", "1");
    } catch {}
    const chars = el.querySelectorAll<HTMLElement>("[data-intro-title] .split-char");
    const fades = el.querySelectorAll<HTMLElement>("[data-intro-fade]");

    if (reduced || seen) {
      driver.current.intro = 1;
      gsap.set(chars, { yPercent: 0, opacity: 1 });
      gsap.set(fades, { opacity: 1, y: 0 });
      setIntroDone(true);
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(chars, { yPercent: 110, opacity: 0 });
      gsap.set(fades, { opacity: 0, y: 12 });
      const tl = gsap.timeline({ onComplete: () => setIntroDone(true) });
      tl.to(driver.current, { intro: 1, duration: 2.0, ease: "power3.inOut" }, 0)
        .to(chars, { yPercent: 0, opacity: 1, duration: 0.5, ease: "power3.out", stagger: 0.045 }, 1.3)
        .to(fades, { opacity: 1, y: 0, duration: 0.4, stagger: 0.08 }, 1.9);
      introTl.current = tl;
    }, el);
    return () => ctx.revert();
  }, []);

  const skipIntro = () => {
    if (introDone) return;
    introTl.current?.progress(1);
  };

  // Parallaxe souris
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      driver.current.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      driver.current.mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // Scroll fluide (Lenis) + ScrollTrigger pour le récit
  useEffect(() => {
    if (mode !== "story") return;
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = reduced ? null : new Lenis({ lerp: 0.11 });
    let raf = 0;
    if (lenis) {
      lenis.on("scroll", ScrollTrigger.update);
      const loop = (t: number) => {
        lenis.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          driver.current.progress = self.progress;
        },
      });
      // le titre s'efface dès que le récit commence, pour laisser la place aux sections
      gsap.to(el.querySelector("[data-hero-front]"), {
        opacity: 0,
        y: -40,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "+=55%", scrub: true },
      });
      // texte de chaque section : fondu décalé
      el.querySelectorAll<HTMLElement>("[data-section]").forEach((s) => {
        const items = s.querySelectorAll("[data-stagger]");
        gsap.fromTo(
          items,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.09,
            ease: "power2.out",
            scrollTrigger: { trigger: s, start: "top 65%", end: "top 25%", scrub: reduced ? false : 0.6 },
          },
        );
      });
    }, el);

    return () => {
      ctx.revert();
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, [mode]);

  const story = mode === "story";

  return (
    <div
      ref={root}
      onClick={skipIntro}
      className={`relative ${story ? "h-[340vh]" : "h-[82vh] min-h-[540px]"}`}
    >
      {/* Couche fixe : la scène reste centrée pendant le scroll */}
      <div className={`${story ? "sticky top-0 h-screen" : "absolute inset-0"} overflow-hidden`}>
        <div className="absolute inset-0" aria-hidden>
          {webgl && (
            <Suspense fallback={<StaticBoard />}>
              <Scene driver={driver} quality={quality} />
            </Suspense>
          )}
          {webgl === false && <StaticBoard />}
        </div>

        {/* Petits encarts éditoriaux dans les coins */}
        <div className="pointer-events-none absolute inset-0">
          <p data-intro-fade className="label absolute left-5 top-5 md:left-28 md:top-8">
            Kritiq
          </p>
          <p data-intro-fade className="label absolute right-5 top-5 max-w-[16ch] text-right md:right-8 md:top-8">
            Le réseau social des gens qui ont un avis
          </p>
        </div>

        {/* Titre géant, révélé lettre par lettre */}
        <div data-hero-front className="absolute inset-x-0 bottom-0 px-5 pb-24 md:pb-10 md:pl-28 md:pr-8">
          <h1 data-intro-title className="font-display text-[clamp(84px,19vw,300px)] text-[var(--foreground)]">
            <SplitTitle text="Kritiq" className="block overflow-hidden pb-[0.06em]" />
          </h1>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <p data-intro-fade className="max-w-[34ch] text-[15px] leading-relaxed text-[var(--foreground)]/85">
              Ce que la France regarde, lit, écoute et porte, noté par ceux qui y étaient.
            </p>
            <div data-intro-fade className="pointer-events-auto flex gap-2">
              {story ? (
                <>
                  <Magnetic>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSignup();
                      }}
                      className="rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--primary-foreground)]"
                    >
                      Créer un compte
                    </button>
                  </Magnetic>
                  <Magnetic>
                    <a
                      href="#fil"
                      className="inline-block rounded-full border border-[var(--foreground)]/30 px-6 py-3 text-sm font-medium"
                    >
                      Lire le fil
                    </a>
                  </Magnetic>
                </>
              ) : (
                <Magnetic>
                  <Link
                    to="/compose"
                    className="inline-block rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--primary-foreground)]"
                  >
                    Publier une critique
                  </Link>
                </Magnetic>
              )}
            </div>
          </div>
        </div>

        {!introDone && (
          <p className="label pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 md:block">
            Clique pour passer
          </p>
        )}
      </div>

      {/* Sections du récit, qui défilent par-dessus la scène épinglée */}
      {story && (
        <div className="pointer-events-none absolute inset-x-0 top-[100vh]">
          {SECTIONS.map((s, i) => (
            <section
              key={s.title}
              data-section
              className={`flex h-[80vh] items-center px-5 md:pl-28 md:pr-8 ${i % 2 ? "justify-end text-right" : "justify-start"}`}
            >
              <div className="max-w-[min(520px,85vw)] rounded-[14px] bg-[var(--background)]/72 p-5 backdrop-blur-[6px] md:bg-transparent md:p-0 md:backdrop-blur-none">
                <p data-stagger className="label">
                  {i + 1} sur 3 · {s.corner}
                </p>
                <h2 data-stagger className="mt-3 font-display text-[clamp(44px,7vw,96px)]">
                  {s.title}
                </h2>
                <p data-stagger className="mt-4 max-w-[38ch] text-[15px] leading-relaxed text-[var(--foreground)]/85 md:ml-0">
                  {s.body}
                </p>
                {i === SECTIONS.length - 1 && (
                  <div data-stagger className="pointer-events-auto mt-6">
                    <Magnetic>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSignup();
                        }}
                        className="rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--primary-foreground)]"
                      >
                        Créer un compte
                      </button>
                    </Magnetic>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** Repli sans WebGL (ou pendant le chargement) : même décor, en CSS. */
function StaticBoard() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(circle at 50% 46%, #141112 0 13%, #f4550a 13% 15.5%, #141112 15.5% 22%, transparent 22.3%), #0a1f5e",
      }}
    />
  );
}
