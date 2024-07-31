import { PageHeading } from '@/components/pageHeading'
import { Search } from '@/components/search'

export default function AddressPage({
  params,
}: {
  params: { address: string }
}) {
  const { address } = params

  return (
    <main className="container pb-8">
      <PageHeading />
      <div className="flex flex-col items-center">
        <Search address={address} />
      </div>
    </main>
  )
}
