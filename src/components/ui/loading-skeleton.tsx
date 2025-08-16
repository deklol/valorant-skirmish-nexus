import { StandardSkeleton } from "./standard-skeleton";
import { Card, CardContent, CardHeader } from "./card";

export function TournamentCardSkeleton() {
  return (
    <Card className="bg-card border">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <StandardSkeleton variant="title" className="flex-1" />
        <StandardSkeleton className="h-6 w-16 rounded-full" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <StandardSkeleton variant="text" />
          <StandardSkeleton variant="text" />
          <StandardSkeleton variant="text" />
          <StandardSkeleton variant="text" />
        </div>
        <div className="flex gap-2">
          <StandardSkeleton variant="button" className="flex-1" />
          <StandardSkeleton variant="button" className="flex-1" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <Card className="bg-card border">
      <CardHeader>
        <div className="flex items-start gap-4">
          <StandardSkeleton variant="avatar" className="w-16 h-16" />
          <div className="flex-1 space-y-2">
            <StandardSkeleton variant="title" />
            <div className="flex gap-2">
              <StandardSkeleton className="h-6 w-16 rounded-full" />
              <StandardSkeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <StandardSkeleton className="h-8 w-8 mx-auto rounded" />
              <StandardSkeleton className="h-6 w-12 mx-auto" />
              <StandardSkeleton className="h-4 w-16 mx-auto" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <StandardSkeleton variant="text" className="w-3/4" />
          <StandardSkeleton variant="text" className="w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

export function TournamentPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Card className="bg-card border">
        <CardHeader>
          <StandardSkeleton variant="title" className="w-1/2" />
          <div className="flex gap-4 mt-4">
            <StandardSkeleton variant="text" className="w-24" />
            <StandardSkeleton variant="text" className="w-24" />
            <StandardSkeleton variant="text" className="w-24" />
          </div>
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="bg-card border">
            <CardContent className="p-4">
              <StandardSkeleton variant="card" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card className="bg-card border">
        <CardContent className="p-6">
          <div className="flex gap-4 mb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <StandardSkeleton key={i} variant="button" />
            ))}
          </div>
          <StandardSkeleton variant="card" className="h-96" />
        </CardContent>
      </Card>
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <div className="container mx-auto px-4 pt-8 pb-6 space-y-8">
        {/* Hero Section */}
        <Card className="bg-card/50 border">
          <CardContent className="p-8 text-center space-y-4">
            <StandardSkeleton variant="title" className="h-8 w-2/3 mx-auto" />
            <StandardSkeleton variant="text" className="h-6 w-4/5 mx-auto" />
            <StandardSkeleton variant="button" className="w-32 mx-auto" />
          </CardContent>
        </Card>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-card/50 border">
              <CardContent className="p-4 text-center space-y-2">
                <StandardSkeleton className="h-8 w-8 mx-auto rounded" />
                <StandardSkeleton className="h-6 w-12 mx-auto" />
                <StandardSkeleton className="h-4 w-16 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-card/50 border">
              <CardContent className="p-6">
                <StandardSkeleton variant="card" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}