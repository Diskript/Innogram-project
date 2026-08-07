import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function DashboardHomePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Innogram</CardTitle>
          <CardDescription>
            Your feed will appear here. Start following people to see their
            posts.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
