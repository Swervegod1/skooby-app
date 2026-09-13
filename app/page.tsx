import { ConnectWallet } from '@/components/connect-wallet';

const features = [
  {
    title: 'Track the trail',
    description: 'Turn raw wallet activity and transactions into a cleaner story you can actually follow.',
  },
  {
    title: 'Wallet-native access',
    description: 'Use Privy for familiar login flows with embedded Web3 wallet support under the hood.',
  },
  {
    title: 'Built for Base',
    description: 'A modern EVM foundation using Wagmi and Viem, with room to expand to additional chains.',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07110d] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(163,230,53,0.14),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(34,197,94,0.09),transparent_30%)]" />

      <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <a href="https://skooby.app" className="text-xl font-black tracking-tight">
          SKOOBY<span className="text-lime-300">.APP</span>
        </a>
        <ConnectWallet />
      </nav>

      <section className="relative mx-auto grid max-w-6xl gap-14 px-6 pb-20 pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pt-28">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-lime-300/20 bg-lime-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-lime-200">
            Web3 intelligence without the detective board
          </div>
          <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-7xl lg:text-8xl">
            Follow the money.
            <span className="block text-lime-300">Skip the mystery.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/65 sm:text-xl">
            Skooby turns crypto wallets, transactions, tokens, and on-chain activity into information that feels human instead of hexadecimal.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#features"
              className="rounded-full bg-lime-300 px-6 py-3.5 text-sm font-black text-black transition hover:scale-[1.02] hover:bg-lime-200"
            >
              Explore Skooby
            </a>
            <a
              href="https://github.com/Swervegod1/skooby-app"
              className="rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              View GitHub
            </a>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-10 rounded-full bg-lime-300/10 blur-3xl" />
          <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Skooby signal</p>
                <p className="mt-1 text-lg font-bold">Wallet activity decoded</p>
              </div>
              <span className="rounded-full bg-lime-300/10 px-3 py-1 text-xs font-bold text-lime-200">LIVE READY</span>
            </div>

            <div className="space-y-3">
              {['Wallet connected', 'Transaction trail parsed', 'Token activity summarized'].map((item, index) => (
                <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-lime-300 text-sm font-black text-black">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{item}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div className="h-full w-[82%] rounded-full bg-lime-300" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative mx-auto max-w-6xl px-6 pb-24 pt-6">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
              <div className="mb-5 size-10 rounded-2xl bg-lime-300/15 ring-1 ring-lime-300/20" />
              <h2 className="text-xl font-black tracking-tight">{feature.title}</h2>
              <p className="mt-3 leading-7 text-white/55">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="relative border-t border-white/8 px-6 py-8 text-center text-sm text-white/40">
        Skooby.app · Web3 tools that help you follow the trail.
      </footer>
    </main>
  );
}
