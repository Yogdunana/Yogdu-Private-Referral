'use client';

import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function JobCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-2">
        {/* Title */}
        <div className="flex items-start justify-between gap-2">
          <div className="h-5 bg-muted rounded w-3/4" />
          <div className="h-5 bg-muted rounded w-16" />
        </div>
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <div className="h-5 bg-muted rounded-full w-16" />
          <div className="h-5 bg-muted rounded-full w-20" />
          <div className="h-5 bg-muted rounded-full w-12" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-2">
        {/* Content lines */}
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground justify-between">
        <div className="flex items-center gap-3">
          <div className="h-4 bg-muted rounded w-24" />
          <div className="h-4 bg-muted rounded w-20 hidden sm:block" />
        </div>
        <div className="flex items-center gap-1">
          <div className="h-6 w-6 bg-muted rounded" />
          <div className="h-6 w-6 bg-muted rounded" />
        </div>
      </CardFooter>
    </Card>
  );
}
