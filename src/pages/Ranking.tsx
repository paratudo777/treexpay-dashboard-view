
import { DashboardLayout } from "@/components/DashboardLayout";
import { useRanking } from "@/hooks/useRanking";
import { RankingHeader } from "@/components/ranking/RankingHeader";
import { UserNicknameEditor } from "@/components/ranking/UserNicknameEditor";
import { RankingList } from "@/components/ranking/RankingList";
import { RankingInfoCard } from "@/components/ranking/RankingInfoCard";

export default function Ranking() {
  const { ranking, loading, currentUserRanking, updateApelido } = useRanking();

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-4xl space-y-6 px-2 md:px-4">
        <RankingHeader />
        <UserNicknameEditor 
          currentUserRanking={currentUserRanking}
          updateApelido={updateApelido}
        />
        <RankingList ranking={ranking} loading={loading} />
        <RankingInfoCard />
      </div>
    </DashboardLayout>
  );
}
