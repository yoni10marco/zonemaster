import { PageLoading } from "@/components/layout/PageLoading"

// Shown the instant any navigation starts, before the destination route's own
// content is ready — e.g. the first visit to the site while its session check
// resolves. See https://nextjs.org/docs/app/api-reference/file-conventions/loading.
export default function Loading() {
  return <PageLoading />
}
