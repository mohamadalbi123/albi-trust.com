import { AdminActionPlansClient } from "../components/AdminActionPlansClient";

export const metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminActionPlansClient />;
}
