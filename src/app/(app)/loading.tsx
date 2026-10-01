import { PageLoading } from "@/components/layout/PageLoading"

// Wraps every page under (app) (calendar, dashboard, coach, friends,
// settings) in a Suspense boundary: this shows instantly in the content area
// while the destination page loads, with the nav around it staying put. It is
// what used to be a blank flash switching to Coach (an async page that awaits
// a database query before it can render anything).
export default function Loading() {
  return <PageLoading />
}
