import { Panel } from '../components/Panel';

const APPROVALS = [
  { id: 'a1', name: 'Site Patrol Onboarding & Checklists', type: 'Folder', submittedBy: 'Sam HelpAdmin',   date: 'Sep 18' },
  { id: 'a2', name: 'Level 2 Drone Patrol Video Demo',     type: 'Video',  submittedBy: 'Alex HelpAdmin',  date: 'Sep 18' },
  { id: 'a3', name: 'Safety Equipment & Sensor Specs',     type: 'PDF',    submittedBy: 'Sam HelpAdmin',   date: 'Sep 18' },
  { id: 'a4', name: '360° Spatial Zone Layout & Camera Map', type: 'Image', submittedBy: 'Elena HelpAdmin', date: 'Sep 18' },
];

export default function Home() {
  return (
    <div className="page-layout">
      {/* Queue table */}
      <main className="queue-area">
        <h1>Approvals &amp; Review</h1>
        <table className="queue-table">
          <thead>
            <tr>
              <th>Folder / Content Name</th>
              <th>Type</th>
              <th>Submitted by</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {APPROVALS.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.type}</td>
                <td>{item.submittedBy}</td>
                <td>
                  <span className="status-badge">⏳ Pending Review — {item.date}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>

      {/* AI Assistant Panel */}
      <Panel />
    </div>
  );
}
