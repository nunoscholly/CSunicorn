// Startseite: Login-Platzhalter — wird in Phase 2 durch echtes Login ersetzt

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <main className="flex flex-col items-center gap-8">
        {/* START CREW Doppel-Keil Wordmark */}
        <div className="flex items-stretch">
          <span className="bg-signal-yellow px-4 py-2 text-lg font-black tracking-widest text-background">
            START
          </span>
          <span className="bg-white/10 px-4 py-2 text-lg font-black tracking-widest text-foreground">
            CREW
          </span>
        </div>

        <p className="text-concrete text-sm">
          Build week runs on START CREW.
        </p>

        {/* Platzhalter für Login-Formular */}
        <div className="flex w-72 flex-col gap-4">
          <input
            type="email"
            placeholder="E-Mail"
            className="rounded-md border border-concrete/30 bg-surface px-4 py-2 text-foreground focus:border-signal-yellow focus:outline-none"
          />
          <input
            type="password"
            placeholder="Passwort"
            className="rounded-md border border-concrete/30 bg-surface px-4 py-2 text-foreground focus:border-signal-yellow focus:outline-none"
          />
          <button className="rounded-md bg-signal-yellow px-4 py-2 font-bold text-background hover:bg-signal-yellow-hover">
            Anmelden
          </button>
        </div>
      </main>
    </div>
  );
}
