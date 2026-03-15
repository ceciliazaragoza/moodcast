import { Link, useLocation } from "react-router-dom";

export default function ProfilePage() {
  const location = useLocation();
  const user = location.state?.user;

  return (
    <main className="page">
      <section className="card">
        <h1>Profile</h1>
        {user ? (
          <>
            <p>Welcome, {user.name || "Google User"}.</p>
            <p>{user.email}</p>
          </>
        ) : (
          <p>This is a placeholder profile page.</p>
        )}
        <Link className="link" to="/">
          Back to home
        </Link>
      </section>
    </main>
  );
}
