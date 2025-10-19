import React from "react";
import { Link } from "react-router-dom";

/* ------ Types ------ */
type FeatureProps = {
  title: string;
  desc: string;
  icon?: React.ReactNode;
};

/* ------ Small presentational components ------ */
function IconPlaceholder() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function FeatureItem({ title, desc, icon }: FeatureProps) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm transition-colors duration-300">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
        {icon ?? <IconPlaceholder />}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
    </div>
  );
}

/* ------ Sections ------ */
function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 transition-colors duration-300">
      <div className="grid gap-12 md:grid-cols-2 md:items-center">
        <div>
          <h1 className="mb-4 text-4xl font-extrabold leading-tight text-gray-900 dark:text-gray-100">
            Welcome to CodingAl
          </h1>
          <p className="mb-6 max-w-prose text-lg text-gray-600 dark:text-gray-400">
            Learn, build, and explore AI-powered coding with personalized lessons, real-time feedback,
            and an interactive coach.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/register"
              className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors"
            >
              Get Started
            </Link>

            <Link
              to="/login"
              className="rounded-lg border border-gray-200 dark:border-gray-700 px-5 py-3 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        <Illustration />
      </div>
    </section>
  );
}

function Features() {
  const features: FeatureProps[] = [
    { title: "Interactive Lessons", desc: "Short, hands-on coding lessons that adapt to your skill level." },
    { title: "AI Code Review", desc: "Get instant feedback and intelligent suggestions for your code." },
    { title: "Real Projects", desc: "Build real-world apps with step-by-step AI coaching." },
    { title: "Progress Tracking", desc: "Track your learning streaks, challenges, and milestones." },
    { title: "Gamified Learning", desc: "Earn badges, level up, and make coding fun." },
    { title: "24/7 Support", desc: "Get help anytime with AI-powered chat and mentor feedback." },
  ];

  return (
    <section
      id="features"
      className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 transition-colors duration-300"
    >
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold text-gray-900 dark:text-gray-100">
          What You’ll Learn
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <FeatureItem key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Illustration() {
  return (
    <div className="flex items-center justify-center transition-colors duration-300">
      <div className="w-full max-w-md">
        <svg viewBox="0 0 800 600" className="w-full" aria-hidden>
          <rect x="0" y="0" width="800" height="600" rx="24" fill="currentColor" className="text-gray-100 dark:text-gray-900" />
          <g transform="translate(80,80)" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.9">
            <rect
              x="0"
              y="0"
              width="560"
              height="360"
              rx="12"
              className="text-indigo-50 dark:text-indigo-900"
              fill="currentColor"
              stroke="none"
            />
            <path d="M24 40h512M24 88h512M24 136h512" stroke="#a5b4fc" className="dark:stroke-indigo-700" />
            <circle cx="60" cy="280" r="36" fill="white" stroke="#818cf8" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 py-6 text-center text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">
      © {new Date().getFullYear()} CodingAl. All rights reserved.
    </footer>
  );
}

/* ------ Page (composed) ------ */
function Home() {
  return (
    <main className="bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300 min-h-screen">
      <Hero />
      <Features />
      <Footer />
    </main>
  );
}

export default Home;
