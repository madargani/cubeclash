import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-8 text-slate-100">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 px-12 py-16 shadow-xl">
        <div className="grid h-24 w-24 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-5xl font-black shadow-lg">
          ▚
        </div>
        <h1 className="text-4xl font-bold tracking-tight">cubeclash</h1>
        <p className="max-w-md text-center text-lg text-slate-400">
          A cube-battling game in the making. The application foundation is in
          place — routes, styles, and server rendering are ready for the first
          game features.
        </p>
        <span className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
          Foundation ready · more coming soon
        </span>
      </div>
    </main>
  )
}
