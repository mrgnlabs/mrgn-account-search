import { PageHeading } from '@/components/pageHeading'
import { Search } from '@/components/search'

export default function Home() {
  return (
    <main className="container pb-8">
      <PageHeading />
      <div className="flex flex-col items-center">
        <Search />
      </div>
    </main>
  )
}
