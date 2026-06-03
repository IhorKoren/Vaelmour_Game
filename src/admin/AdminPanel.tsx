import './AdminPanel.css';

export function AdminPanel() {
  return (
    <div className="admin-shell">
      <section className="admin-card">
        <h1>Vaelmour Admin</h1>
        <p>
          Адмін-панель тимчасово вимкнена, щоб не ламати production build.
        </p>
        <p>
          Основна гра працює через <code>src/app/AppShell.tsx</code>.
        </p>
      </section>
    </div>
  );
}

export default AdminPanel;