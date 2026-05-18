import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-800 font-medium text-sm">CB</div>
            <span className="font-medium">CoBuild</span>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/login" className="text-gray-600 hover:text-gray-900 px-3 py-1.5">Log in</Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-medium tracking-tight mb-4">
              The operating system for construction labour.
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Builders find crews in 5 minutes. Crew leaders run their coordination business from one app. Workers get clean job offers by SMS.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/signup?role=builder"
              className="block bg-white border border-gray-200 hover:border-brand-600 rounded-xl p-6 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 text-xl mb-4">
                🏗️
              </div>
              <h3 className="font-medium text-lg mb-1">I'm a builder</h3>
              <p className="text-sm text-gray-600 mb-4">
                Find reliable crews fast. Voice in, crew booked in minutes.
              </p>
              <div className="text-sm text-brand-600 font-medium group-hover:underline">
                Get started →
              </div>
            </Link>

            <Link
              href="/signup?role=crew_leader"
              className="block bg-white border border-gray-200 hover:border-brand-600 rounded-xl p-6 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-800 text-xl mb-4">
                👥
              </div>
              <h3 className="font-medium text-lg mb-1">I'm a crew leader</h3>
              <p className="text-sm text-gray-600 mb-4">
                Coordinate your network. Bid on jobs. Earn margin per worker.
              </p>
              <div className="text-sm text-brand-600 font-medium group-hover:underline">
                Get started →
              </div>
            </Link>
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">
              Worker? You don't need an account. You'll get a text when there's a job for you.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-6">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-500">
          CoBuild MVP · Brisbane, Australia
        </div>
      </footer>
    </div>
  );
}
