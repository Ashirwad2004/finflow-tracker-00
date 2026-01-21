import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { RecentlyDeleted } from "@/components/RecentlyDeleted";

const RecentlyDeletedPage = () => {
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recently Deleted</h1>
          <p className="text-muted-foreground">Recover expenses deleted within the last 30 days</p>
        </div>

        <RecentlyDeleted userId={user?.id || ""} />
      </div>
    </AppLayout>
  );
};

export default RecentlyDeletedPage;
