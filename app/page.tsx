'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import DepthBackground from '@/components/DepthBackground';

gsap.registerPlugin(ScrollTrigger);

// ── magnetic button ───────────────────────────────────────────────────────────

function MagneticButton({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - (left + width / 2)) * 0.32;
    const y = (e.clientY - (top + height / 2)) * 0.32;
    gsap.to(el, { x, y, duration: 0.3, ease: 'power2.out' });
  };

  const onLeave = () => {
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.65, ease: 'elastic.out(1, 0.4)' });
  };

  return (
    <div ref={ref} style={{ display: 'inline-flex' }} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}

// ── card spotlight handler ────────────────────────────────────────────────────

function onCardMove(e: React.MouseEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
}

// ── layout primitives ─────────────────────────────────────────────────────────

function OverlaySection({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="relative z-10 min-h-screen flex items-center overflow-hidden">
      <div style={{ width: '100%', maxWidth: '1900px', marginInline: 'auto', paddingLeft: 'clamp(20px, 6vw, 180px)', paddingRight: 'clamp(20px, 6vw, 180px)', paddingTop: '80px', paddingBottom: '80px' }}>
        {children}
      </div>
    </section>
  );
}

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navLinks = [
    { href: '#services', label: 'Services' },
    { href: '#projects', label: 'Projets' },
    { href: '#process', label: 'Approche' },
    { href: '#contact', label: 'Contact' },
  ];
  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-5 md:px-8">
      <div
        className="relative mx-auto flex h-[72px] max-w-[1900px] items-center
                   justify-center rounded-full border border-white/15
                   bg-black/45 px-5 backdrop-blur-xl md:px-7"
      >
        {/* Logo */}
        <div className="absolute left-5 min-w-0 md:left-7">
          <span className="block truncate text-[13px] font-bold uppercase tracking-[0.18em] text-white">
            Maison Paysage
          </span>
        </div>

        {/* Nav — desktop */}
        <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="whitespace-nowrap hover:text-white transition-colors">{l.label}</a>
          ))}
        </nav>

        {/* CTA / hamburger */}
        <div className="absolute right-5 flex items-center md:right-7">
          <a
            href="#contact"
            className="hidden h-11 items-center rounded-full bg-[#d5b46b]
                       text-sm font-semibold text-black hover:opacity-90
                       transition-opacity md:flex whitespace-nowrap"
            style={{ minWidth: 148, paddingInline: 28 }}
          >
            Rendez-vous
          </a>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-full
                       border border-white/15 text-xs text-white md:hidden"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="mt-2 mx-auto max-w-[1900px] rounded-[24px] border border-white/15 bg-black/80 backdrop-blur-xl md:hidden"
          style={{ padding: '8px' }}>
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block rounded-[18px] text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              style={{ padding: '14px 20px' }}
            >
              {l.label}
            </a>
          ))}
          <a
            href="#contact"
            onClick={() => setMenuOpen(false)}
            className="mt-1 block rounded-full bg-[#d5b46b] text-center text-sm font-semibold text-black"
            style={{ padding: '14px 20px' }}
          >
            Rendez-vous
          </a>
        </div>
      )}
    </header>
  );
}

// ── marquee ───────────────────────────────────────────────────────────────────

const MARQUEE_TEXT = 'JARDINS · TERRASSES · PAYSAGE · LUMIÈRE · PIERRE NATURELLE · ESPACES OUTDOOR · ';

function Marquee() {
  const cls = 'text-[11px] font-semibold tracking-[0.32em] text-white/25 whitespace-nowrap';
  return (
    <div className="relative z-10 overflow-hidden border-y border-white/[0.08] py-[13px]">
      <div className="marquee-track">{/* no whitespace between spans */
        }{[0,1,2,3].map((i) => <span key={i} className={cls} aria-hidden={i > 0}>{MARQUEE_TEXT}</span>)
      }</div>
    </div>
  );
}

// ── data ──────────────────────────────────────────────────────────────────────

const STATS = [
  { label: '+15 ans', text: "d'expérience", countTo: 15 },
  { label: 'Terrasses', text: 'Jardins, lumière', countTo: null },
  { label: 'Suivi', text: 'premium & discret', countTo: null },
];

const SERVICE_CARDS = [
  {
    title: 'Terrasses en pierre',
    body: 'Conception et pose de pavés, dalles calcaires, granit et pierre naturelle taillée sur mesure.',
    detail: 'Nous sélectionnons chaque pierre à la carrière pour garantir couleur, texture et durabilité. Joints, calepinage et pente d\'écoulement sont étudiés avant la pose.',
    image: '/images/service-01.jpg',
  },
  {
    title: 'Jardins paysagers',
    body: 'Plantations, massifs et arbres — un végétal pensé pour chaque exposition.',
    detail: 'Espèces méditerranéennes, persistantes ou à feuilles caduques : chaque plante est choisie pour son comportement réel dans votre sol et sous votre climat.',
    image: '/images/service-02.jpg',
  },
  {
    title: 'Éclairage & entretien',
    body: 'Mise en lumière basse tension, arrosage automatisé et suivi saisonnier.',
    detail: 'Spots encastrés, guirlandes et projections sur végétaux, combinés à un système d\'arrosage goutte-à-goutte piloté depuis votre téléphone.',
    image: '/images/service-03.jpg',
  },
];

const PROJECT_CARDS = [
  { num: '01', title: 'Villa privée', category: 'Terrasse calcaire & jardin méditerranéen', image: '/images/project-01.jpg' },
  { num: '02', title: 'Maison contemporaine', category: 'Patio, lumière & plantations', image: '/images/project-02.jpg' },
  { num: '03', title: 'Domaine viticole', category: 'Allées en gravier, haies taillées & bassins', image: '/images/project-03.jpg' },
  { num: '04', title: 'Résidence balnéaire', category: 'Bois exotique, dunes végétalisées & plage privée', image: '/images/project-04.jpg' },
  { num: '05', title: 'Penthouse parisien', category: 'Terrasse rooftop, minéral & jardins en bacs', image: '/images/project-05.jpg' },
];

const PROCESS_STEPS = [
  { num: '01', title: 'Étude du lieu', body: "Analyse du terrain, de l'exposition et des usages souhaités.", image: '/images/process-01.jpg' },
  { num: '02', title: 'Plan matière', body: 'Choix des pierres, végétaux et matériaux selon le projet.', image: '/images/process-02.jpg' },
  { num: '03', title: 'Réalisation', body: 'Chantier dirigé par nos artisans, dans les délais convenus.', image: '/images/process-03.jpg' },
  { num: '04', title: 'Suivi', body: 'Entretien saisonnier et accompagnement au fil des saisons.', image: '/images/process-04.jpg' },
];

// ── shared btn classes ────────────────────────────────────────────────────────

const btnPrimary =
  'inline-flex h-[52px] items-center justify-center rounded-full bg-[#d5b46b] px-14 text-sm font-semibold text-black whitespace-nowrap hover:opacity-90 transition-opacity';

const btnSecondary =
  'inline-flex h-[52px] items-center justify-center rounded-full border border-white/20 bg-white/5 px-14 text-sm font-semibold text-white whitespace-nowrap hover:bg-white/10 transition-colors';

// ── page ──────────────────────────────────────────────────────────────────────

export default function Page() {
  const mainRef = useRef<HTMLElement>(null);
  const statCountRef = useRef<HTMLSpanElement>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [tappedProcess, setTappedProcess] = useState<number | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // section fade-in
      gsap.utils.toArray<HTMLElement>('.section-content').forEach((el) => {
        gsap.fromTo(
          el,
          { y: 40, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 82%', toggleActions: 'play none none none' },
          }
        );
      });

      // staggered card entrance (handles both regular cards and flip cards)
      gsap.utils.toArray<HTMLElement>('.stagger-cards').forEach((container) => {
        const items = container.querySelectorAll('.flip-card, .glass-card:not(.flip-card-front)');
        gsap.fromTo(
          items,
          { y: 32, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.55, ease: 'power2.out', stagger: 0.1,
            scrollTrigger: { trigger: container, start: 'top 78%', toggleActions: 'play none none none' },
          }
        );
      });

      // process sequential gold highlight
      gsap.utils.toArray<HTMLElement>('.process-card').forEach((card, i) => {
        ScrollTrigger.create({
          trigger: '#process',
          start: 'top 65%',
          toggleActions: 'play none none none',
          onEnter: () => {
            gsap.delayedCall(i * 0.38, () => card.classList.add('process-active'));
          },
        });
      });
    }, mainRef);

    // stats count-up
    const obj = { val: 0 };
    gsap.to(obj, {
      val: 15, duration: 2, ease: 'power2.out', delay: 0.6,
      onUpdate: () => {
        if (statCountRef.current) statCountRef.current.textContent = `+${Math.round(obj.val)} ans`;
      },
    });

    return () => ctx.revert();
  }, []);


  return (
    <main ref={mainRef} className="relative min-h-screen overflow-x-hidden text-white">
      <DepthBackground />
      <SiteHeader />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <OverlaySection id="hero">
        <div className="section-content max-w-[680px] mx-auto pt-20 text-center">
          <p className="eyebrow">JARDINS &amp; TERRASSES D'EXCEPTION</p>

          <h1 className="headline-xl" style={{ maxWidth: '100%' }}>
            Des extérieurs pensés comme des lieux de vie.
          </h1>

          <p className="body-copy" style={{ maxWidth: '100%' }}>
            Terrasses en pierre, jardins paysagers et espaces outdoor haut de gamme.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <MagneticButton>
              <button className={btnPrimary} style={{ paddingInline: '52px' }}>Découvrir les projets</button>
            </MagneticButton>
            <MagneticButton>
              <a href="#contact" className={btnSecondary} style={{ paddingInline: '52px' }}>Nous contacter</a>
            </MagneticButton>
          </div>

          <div className="mt-14 flex flex-wrap justify-center gap-x-8 gap-y-5">
            {STATS.map((s) => (
              <div key={s.label} className="border-l border-white/20 pl-5 text-center">
                <p className="whitespace-nowrap text-sm font-semibold text-[#d5b46b]">
                  {s.countTo ? <span ref={statCountRef}>+0 ans</span> : s.label}
                </p>
                <p className="mt-0.5 whitespace-nowrap text-xs text-white/55">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </OverlaySection>

      <Marquee />

      {/* ── SERVICES ─────────────────────────────────────────────────────── */}
      <OverlaySection id="services">
        <div className="section-content max-w-[860px] text-center">
          <p className="eyebrow">SAVOIR-FAIRE</p>
          <h2 className="headline-lg" style={{ maxWidth: '100%' }}>Une signature complète, du plan à la pierre.</h2>
          <p className="body-copy" style={{ maxWidth: '100%' }}>
            Conception paysagère, réalisation minérale, plantations, éclairage,
            arrosage et entretien discret.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-3 stagger-cards">
            {SERVICE_CARDS.map((c) => (
              <div key={c.title} className="glass-card overflow-hidden text-center" onMouseMove={onCardMove}>
                <div className="card-spotlight" style={{ background: 'radial-gradient(280px circle at var(--mx, 50%) var(--my, 50%), rgba(213,180,107,0.13), transparent 70%)' }} />
                {/* image thumbnail */}
                <div className="h-44 w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.image}
                    alt={c.title}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>
                {/* content */}
                <div style={{ padding: '24px' }}>
                  <div className="mb-4 mx-auto h-0.5 w-7 rounded-full bg-[#d5b46b]" />
                  <p className="text-sm font-semibold text-white">{c.title}</p>
                  <p className="mt-2.5 text-sm leading-relaxed text-white/65">{c.body}</p>
                  {/* hover-expand */}
                  <div className="service-expand">
                    <div>
                      <p className="mt-3 text-sm leading-relaxed text-white/45">{c.detail}</p>
                      <p className="mt-4 text-xs font-semibold tracking-[0.18em] text-[#d5b46b]">En savoir plus →</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </OverlaySection>

      {/* ── PROJECTS ─────────────────────────────────────────────────────── */}
      <OverlaySection id="projects">
        <div className="section-content max-w-[1100px]">
          <div className="text-center">
            <p className="eyebrow">PROJETS</p>
            <h2 className="headline-lg" style={{ maxWidth: '100%' }}>Chaque projet commence par une atmosphère.</h2>
            <p className="body-copy" style={{ maxWidth: '100%' }}>
              Nous composons les matières, les volumes et les usages pour créer des
              espaces extérieurs sobres, durables et désirables.
            </p>
          </div>

          <div className="mt-12 flex flex-col md:flex-row items-start gap-6 md:gap-10">
            {/* Card list */}
            <div className="flex-1 space-y-4">
              {PROJECT_CARDS.map((c) => (
                <div
                  key={c.num}
                  className="glass-card flex items-center gap-5 cursor-pointer"
                  style={{ padding: '20px' }}
                  onMouseEnter={() => setPreviewSrc(c.image)}
                  onMouseLeave={() => setPreviewSrc(null)}
                >
                  <span className="w-9 shrink-0 font-display text-xl font-semibold text-[#d5b46b]">
                    {c.num}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{c.title}</p>
                    <p className="mt-0.5 text-xs text-white/50">{c.category}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-white/30">
                    <path d="M3 8h10M8.5 4l4.5 4-4.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ))}
            </div>

            {/* Static preview panel */}
            <div
              className="hidden md:block w-[400px] shrink-0 overflow-hidden rounded-[18px] shadow-2xl transition-opacity duration-300"
              style={{ height: 420, opacity: previewSrc ? 1 : 0 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSrc ?? ''}
                alt=""
                className="h-full w-full object-cover transition-opacity duration-200"
              />
            </div>
          </div>
        </div>
      </OverlaySection>

      {/* ── PROCESS ──────────────────────────────────────────────────────── */}
      <OverlaySection id="process">
        <div className="section-content max-w-[900px]">
          <div className="text-center">
            <p className="eyebrow">APPROCHE</p>
            <h2 className="headline-lg" style={{ maxWidth: '100%' }}>Étudier. Concevoir. Réaliser. Entretenir.</h2>
            <p className="body-copy" style={{ maxWidth: '100%' }}>
              Un accompagnement clair, du premier rendez-vous à la saison suivante.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 stagger-cards">
            {PROCESS_STEPS.map((s, i) => (
              <div
                key={s.num}
                className={`process-card flip-card${tappedProcess === i ? ' tapped' : ''}`}
                onClick={() => setTappedProcess(tappedProcess === i ? null : i)}
              >
                <div className="flip-card-inner">
                  {/* front */}
                  <div className="flip-card-front glass-card text-center flex flex-col items-center justify-center" style={{ padding: '24px' }} onMouseMove={onCardMove}>
                    <div className="card-spotlight" style={{ background: 'radial-gradient(280px circle at var(--mx, 50%) var(--my, 50%), rgba(213,180,107,0.13), transparent 70%)' }} />
                    <p className="process-num mb-4 text-xs font-semibold tracking-[0.18em]">{s.num}</p>
                    <p className="text-[15px] font-semibold leading-snug text-white">{s.title}</p>
                    <p className="mt-2.5 text-sm leading-relaxed text-white/60">{s.body}</p>
                  </div>
                  {/* back */}
                  <div className="flip-card-back">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.image} alt={s.title} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-end" style={{ padding: '20px 24px' }}>
                      <div className="w-full overflow-hidden">
                        <p className="text-xs font-semibold tracking-[0.22em] text-[#d5b46b] mb-1">{s.num}</p>
                        <p className="text-base font-semibold text-white truncate">{s.title}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </OverlaySection>

      {/* ── CONTACT ──────────────────────────────────────────────────────── */}
      <OverlaySection id="contact">
        <div className="section-content max-w-[720px]">
          <div className="text-center">
            <p className="eyebrow">CONTACT</p>
            <h2 className="headline-lg" style={{ maxWidth: '100%' }}>Donnons forme à votre prochain extérieur.</h2>
            <p className="body-copy" style={{ maxWidth: '100%' }}>
              Décrivez-nous le lieu, l'usage souhaité et le niveau d'accompagnement
              attendu. Nous revenons vers vous avec une première lecture claire du projet.
            </p>
          </div>

          <div className="mt-12 rounded-[32px] border border-white/15 bg-white/[0.08] shadow-2xl backdrop-blur-2xl" style={{ padding: '32px' }}>
            <h3 className="mb-6 text-center text-[15px] font-semibold text-white">
              Demande de rendez-vous
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(['Nom', 'Email', 'Téléphone', 'Type de projet'] as const).map((label) => (
                <input
                  key={label}
                  type="text"
                  placeholder={label}
                  className="h-12 w-full rounded-2xl border border-white/12 bg-black/25 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/25"
                  style={{ paddingInline: '16px' }}
                />
              ))}
              <textarea
                placeholder="Message"
                className="col-span-1 h-28 w-full resize-none rounded-2xl border border-white/12 bg-black/25 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/25 sm:col-span-2"
                style={{ paddingInline: '16px', paddingBlock: '12px' }}
              />
              <button
                className="col-span-1 mt-1 h-[52px] w-full whitespace-nowrap rounded-full
                           bg-[#d5b46b] text-sm font-semibold text-black
                           hover:opacity-90 transition-opacity sm:col-span-2"
              >
                Envoyer la demande
              </button>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1">
              <p className="text-xs text-white/40">Réponse sous 24h ouvrées</p>
              <p className="text-xs text-white/40">Projets résidentiels premium uniquement</p>
            </div>
          </div>
        </div>
      </OverlaySection>
    </main>
  );
}
