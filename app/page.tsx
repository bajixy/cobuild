import Link from 'next/link';

const liveRequests = [
  {
    title: 'Framing Crew Needed',
    status: 'Open',
    location: 'Fortitude Valley',
    date: 'Mon 2 Jun',
    detail: '4 labourers',
    person: 'Jason H. · Builder',
    initials: 'JH',
    action: 'Accept →',
  },
  {
    title: 'Electricians Req.',
    status: '2 of 3 filled',
    location: 'South Brisbane',
    date: 'Wed–Fri',
    detail: 'Licensed only',
    person: 'M. Plumpton · Subcontractor',
    initials: 'MP',
    action: 'View →',
  },
  {
    title: 'Concreting — Full Team',
    status: 'Filled',
    location: 'Chermside',
    date: 'This week',
    detail: '6 crew',
    person: 'S. Lowe · Crew Leader',
    initials: 'SL',
    action: 'Closed',
  },
];

const roles = [
  {
    icon: '🔨',
    title: 'Builder',
    text: 'Run a project? Post jobs and get qualified trades on site fast.',
    items: ['Post job requests instantly', 'Browse verified subcontractors', 'Track crew arrivals in real time', 'Pay on completion'],
  },
  {
    icon: '🦺',
    title: 'Subcontractor',
    text: 'Manage your trade business and keep your teams working.',
    items: ['Request crew leaders for jobs', 'Accept builder job postings', 'Schedule across multiple sites', 'Invoice automatically'],
  },
  {
    icon: '📋',
    title: 'Crew Leader',
    text: 'Lead your team, pick up work, and get paid for every shift.',
    items: ['See open jobs near you', 'Accept or decline requests', "Manage your team's roster", 'Track hours and earnings'],
  },
];

const steps = [
  ['1', 'Builder posts', 'Job details, dates, crew size, trade type'],
  ['2', 'Subcontractor accepts', 'Matches the job, locks in the contract'],
  ['3', 'Crew assigned', 'Crew leader confirms team and ETA'],
  ['4', 'Job done, paid', 'Sign-off, auto-invoice, payment sent'],
];

const stats = [
  ['2.4K+', 'Active builders'],
  ['8.1K', 'Verified tradespeople'],
  ['94%', 'Same-day fill rate'],
  ['$0', 'Upfront cost'],
];

const ctas = [
  ['🔨', "I'm a Builder", 'Post jobs and find verified trade teams for any project, any size.', '/signup?role=builder'],
  ['🦺', "I'm a Subcontractor", 'Grow your trade business with steady work and reliable crew leaders.', '/signup?role=crew_leader'],
  ['📋', "I'm a Crew Leader", 'Pick up shifts near you, lead your team, and get paid on time.', '/signup?role=crew_leader'],
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-semibold tracking-tight">cobuild</Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-neutral-700 md:flex">
            <a href="#work" className="hover:text-black">Find Work</a>
            <Link href="/signup?role=builder" className="hover:text-black">Post a Job</Link>
            <Link href="/signup?role=crew_leader" className="hover:text-black">My Crew</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm font-semibold hover:bg-neutral-100 sm:block">Log in</Link>
            <Link href="/signup" className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800">Sign up free</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <div className="mb-6 inline-flex rounded-full bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-800">🏗 Construction, Connected</div>
            <h1 className="max-w-4xl text-6xl font-semibold leading-[0.92] tracking-[-0.06em] sm:text-7xl lg:text-8xl">
              Get the<br />right crew,<br />on site.
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-8 text-neutral-600">
              CoBuild connects builders, subcontractors, and crew leaders in real time — like rideshare, but for construction.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup?role=builder" className="rounded-full bg-black px-7 py-4 text-center text-base font-semibold text-white hover:bg-neutral-800">Post a job now</Link>
              <a href="#work" className="rounded-full bg-neutral-100 px-7 py-4 text-center text-base font-semibold text-black hover:bg-neutral-200">Find work near you</a>
            </div>
          </div>

          <div id="work" className="rounded-[2rem] bg-black p-4 shadow-soft">
            <div className="rounded-[1.5rem] bg-white p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Live Requests</h2>
                  <p className="text-sm text-neutral-500">3 open near you</p>
                </div>
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>
              <div className="space-y-3">
                {liveRequests.map((request) => (
                  <div key={request.title} className="rounded-3xl border border-neutral-200 p-4 transition hover:border-black">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold tracking-tight">{request.title}</h3>
                        <p className="mt-1 text-sm text-neutral-500">📍 {request.location}</p>
                      </div>
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold">{request.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-neutral-700">
                      <p>📅 {request.date}</p>
                      <p>👷 {request.detail}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">{request.initials}</div>
                        <p className="text-sm font-medium">{request.person}</p>
                      </div>
                      <span className="text-sm font-semibold">{request.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-neutral-200 bg-neutral-50 px-6 py-16">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
            {roles.map((role) => (
              <div key={role.title} className="rounded-[2rem] bg-white p-7 shadow-sm">
                <div className="mb-5 text-4xl">{role.icon}</div>
                <h3 className="text-2xl font-semibold tracking-tight">{role.title}</h3>
                <p className="mt-3 min-h-14 leading-7 text-neutral-600">{role.text}</p>
                <ul className="mt-6 space-y-3 text-sm font-medium text-neutral-800">
                  {role.items.map((item) => <li key={item}>✓ {item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">How it works</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">From request to on-site in minutes</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {steps.map(([number, title, text]) => (
              <div key={number} className="rounded-[1.75rem] border border-neutral-200 p-6">
                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">{number}</div>
                <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 leading-7 text-neutral-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-black px-6 py-14 text-white">
          <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-4">
            {stats.map(([value, label]) => (
              <div key={label}>
                <div className="text-4xl font-semibold tracking-tight">{value}</div>
                <p className="mt-2 text-sm text-neutral-400">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-4 md:grid-cols-3">
            {ctas.map(([icon, title, text, href]) => (
              <Link key={title} href={href} className="rounded-[2rem] border border-neutral-200 p-7 transition hover:border-black hover:shadow-soft">
                <div className="mb-5 text-4xl">{icon}</div>
                <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
                <p className="mt-3 leading-7 text-neutral-600">{text}</p>
                <div className="mt-6 font-semibold">Get started →</div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row">
          <div>
            <div className="text-xl font-semibold tracking-tight">Cobuild</div>
            <p className="mt-2 text-sm text-neutral-500">© 2026 CoBuild Pty Ltd</p>
          </div>
          <div className="flex gap-6 text-sm font-medium text-neutral-600">
            <a href="#" className="hover:text-black">About</a>
            <a href="#" className="hover:text-black">Safety</a>
            <a href="#" className="hover:text-black">Help</a>
            <a href="#" className="hover:text-black">Careers</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
