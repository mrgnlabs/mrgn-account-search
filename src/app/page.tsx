import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="container">
      <header className="flex flex-col items-center py-16 gap-3">
        <h1 className="text-6xl">⬛️ 🔎</h1>
        <h2 className="text-2xl font-bold">mrgn account search</h2>
      </header>
      <div className="flex flex-col items-center">
        <form className="w-full max-w-lg">
          <div className="flex items-center justify-center w-full gap-2">
            <Input
              type="email"
              id="email"
              placeholder="Wallet address or .sol domain..."
              className="text-lg h-auto py-1.5 font-light"
            />
            <Button type="submit" className="py-3.5">
              🔎 Search
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
