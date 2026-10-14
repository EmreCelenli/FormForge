export function PlaybackScreen({ status }: { status: "empty" | "loading" }) {
  const waiting =
    status === "loading" ? "Loading analysis…" : "No analysis yet.";

  return (
    <main className="screen">
      <header>
        <h1>FormForge</h1>
        <p>Form meets precision.</p>
      </header>
      <section className="panels">
        <article className="panel user">
          <h2>YOUR VIDEO</h2>
          <div className="stage">{waiting}</div>
        </article>
        <article className="panel corrected">
          <h2>CORRECTED FORM</h2>
          <div className="stage">
            {status === "loading"
              ? "Loading the corrected movement…"
              : "The corrected movement will appear here, aligned at the hips."}
          </div>
        </article>
      </section>
      <section className="meter" aria-label="Angle meter">
        <h2>ANGLE METER</h2>
        <p>No angle yet. The meter shows your value against the target range while the clip plays. Straight is 180°. The target band is provisional.</p>
      </section>
      <section className="coach" aria-label="Coach">
        <h2>COACH</h2>
        <p>No cue yet.</p>
      </section>
    </main>
  );
}
