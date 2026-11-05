import { Switch } from '../components'
import { AUDIENCE, SHARE_ROWS, type Demo } from '../demo'

export function Privacy({ demo }: { demo: Demo }) {
  const audience = AUDIENCE[demo.mode]
  const toggle = (row: keyof Demo['share'], who: string) =>
    demo.setShare({ ...demo.share, [row]: { ...demo.share[row], [who]: !demo.share[row][who] } })

  return (
    <main>
      <section className="card">
        <div className="card-head">
          <h2>Privacy</h2>
          <span className="tag">Consent first</span>
        </div>
        <p>
          {demo.mode === 'athlete' ? 'Player 7 decides' : 'Margaret decides'} who sees what. Changes apply at once to the dashboard and the alerts.
        </p>
        <table className="matrix">
          <caption className="sr-only">Who sees what</caption>
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col">{audience.self}</th>
              {audience.others.map((who) => (
                <th key={who.id} scope="col">
                  {who.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SHARE_ROWS.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.label}</th>
                <td>
                  <input type="checkbox" checked disabled aria-label={`${audience.self}: ${row.label} (always)`} />
                </td>
                {audience.others.map((who) => (
                  <td key={who.id}>
                    <input
                      type="checkbox"
                      checked={demo.share[row.id][who.id]}
                      onChange={() => toggle(row.id, who.id)}
                      aria-label={`${who.label}: ${row.label}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {demo.mode === 'older' && (
        <section className="card">
          <div className="toggle-row">
            <span>
              <b>Home camera (opt-in)</b>
              <br />
              <span className="small muted">Lets Vitalis check how Margaret stands up. Off by default. Video would stay on the device.</span>
            </span>
            <Switch checked={demo.cameraConsent} onChange={demo.setCameraConsent} label="Home camera opt-in" />
          </div>
        </section>
      )}

      {demo.mode === 'athlete' && (
        <p className="fair-use">No scholarship, playing-time or roster decisions from this score. It is for the athlete’s health only.</p>
      )}

      <section className="card">
        <h3>In this demo</h3>
        <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>All data is simulated. Nothing you type is stored or sent anywhere.</li>
          <li>No accounts, no backend, no cookies.</li>
          <li>
            A real product would follow the FTC Health Breach Notification Rule, or HIPAA when a provider holds the data <span className="source">[25]</span>.
          </li>
        </ul>
      </section>

      <button type="button" className="btn next" onClick={() => demo.go('start')}>
        Try the other mode →
      </button>
    </main>
  )
}
