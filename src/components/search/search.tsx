'use client'

import { useRouter } from 'next/navigation'
import React from 'react'

import Image from 'next/image'

import { NameRegistryState, getDomainKeySync } from '@bonfida/spl-name-service'
import { Connection, PublicKey } from '@solana/web3.js'

import { cn, shortenAddress, generateEndpoint } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

type Balance = {
  bankAddress: string
  mintAddress: string
  name: string
  symbol: string
  logo: string
  assets: {
    quantity: number
    usd: number
  }
  liabilities: {
    quantity: number
    usd: number
  }
}

type Account = {
  assets: number
  liabilities: number
  address: string
  healthFactor: number
  balances: {
    lending: Balance[]
    borrowing: Balance[]
  }
}

type SearchProps = {
  address?: string
}

export const Search: React.FC<SearchProps> = ({ address }) => {
  const router = useRouter()

  const [accounts, setAccounts] = React.useState<Account[]>()
  const [isSearching, setIsSearching] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string>('')

  const usDollarFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  })

  const searchAccounts = async (address: string) => {
    setErrorMsg('')
    setIsSearching(true)
    setAccounts([])

    const rpcEndpoint = await generateEndpoint(
      process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE || '',
      process.env.NEXT_PUBLIC_RPC_PROXY_KEY || ''
    )

    const connection = new Connection(rpcEndpoint, 'confirmed')

    let pk: PublicKey

    if (!address) {
      console.log('No address provided')
      return
    }

    const addressString = address.toString()
    if (addressString.endsWith('.sol')) {
      try {
        const { pubkey } = await getDomainKeySync(addressString)
        const { registry } = await NameRegistryState.retrieve(
          connection,
          pubkey
        )

        pk = registry.owner
      } catch (e) {
        setErrorMsg('Invalid domain name provided')
        return
      }
    } else {
      try {
        pk = new PublicKey(addressString)
      } catch (e) {
        setErrorMsg('Invalid address provided')
        setIsSearching(false)
        setAccounts([])
        return
      }
    }

    const res = await fetch(`/api/search?address=${pk.toString()}`)

    if (!res.ok) {
      setErrorMsg('Error searching for account')
      setIsSearching(false)
      setAccounts([])
      return
    }

    const { accounts } = await res.json()

    if (!accounts) {
      setErrorMsg('No accounts found')
      setIsSearching(false)
      setAccounts([])
      return
    }

    setErrorMsg('')
    setIsSearching(false)
    setAccounts(accounts)
  }

  React.useEffect(() => {
    if (address) {
      searchAccounts(address)
    }
  }, [address])

  return (
    <div className="w-full max-w-4xl">
      <form
        className="w-full max-w-2xl mx-auto mb-4"
        onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.currentTarget)
          const address = formData.get('address')
          if (!address) {
            console.log('No address provided')
            return
          }

          router.push(address.toString())
        }}
      >
        <div className="flex flex-col md:flex-row items-center justify-center w-full gap-2">
          <Input
            type="text"
            name="address"
            placeholder="Wallet address or .sol domain..."
            className="text-lg h-auto py-1.5 font-light"
            autoFocus
            defaultValue={address}
          />
          <Button
            type="submit"
            className="py-2.5 h-auto w-full md:w-[200px]"
            disabled={isSearching}
          >
            {!isSearching && <>🔎 Search</>}
            {isSearching && <>🔎 Searching...</>}
          </Button>
        </div>
      </form>
      {errorMsg && (
        <p className="text-destructive py-1.5 px-2.5 rounded-lg text-center text-sm">
          {errorMsg}
        </p>
      )}
      {accounts && accounts.length > 0 && (
        <div>
          <p className="text-center italic text-sm mb-4">
            {accounts.length} account{accounts.length > 1 && 's'} found
          </p>

          {accounts.map((account, index) => (
            <div
              key={index}
              className={cn(
                'border-border pb-4 mb-4 mt-8',
                index < account.balances.lending.length - 1
              )}
            >
              <header className="space-y-2 mb-8">
                <h3 className="md:text-lg font-medium text-center">
                  Account:{' '}
                  <span className="font-mono text-xs text-muted-foreground md:text-base">
                    {account.address}
                  </span>
                </h3>

                <h3 className="md:text-lg font-medium text-center">
                  Health Factor:{' '}
                  <span
                    className={cn(
                      'font-mono text-xs md:text-base text-error',
                      account.healthFactor > 10 && 'text-warning',
                      account.healthFactor >= 50 && 'text-success'
                    )}
                  >
                    {account.healthFactor}%
                  </span>
                </h3>
              </header>

              <div className="flex flex-col md:flex-row gap-8 md:gap-4 justify-center">
                <div className="w-full">
                  <h4 className="md:text-lg font-medium mb-4">Lending</h4>
                  <div className="space-y-4">
                    {account.balances.lending.length === 0 && (
                      <p className="text-destructive-foreground">
                        No open lending positions
                      </p>
                    )}
                    {account.balances.lending.map((balance, index) => (
                      <Card key={index}>
                        <CardContent>
                          <h5 className="flex items-center gap-2 py-4 mb-4">
                            <Image
                              src={balance.logo}
                              alt={balance.name}
                              width={30}
                              height={30}
                              unoptimized
                              className="rounded-full"
                            />
                            <div className="space-y-1">
                              {balance.name}
                              <Link
                                href={`https://solscan.io/address/${balance.bankAddress}`}
                                className="text-xs block max-w-fit text-primary border-b transition-colors hover:border-transparent"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {shortenAddress(balance.bankAddress)}
                              </Link>
                            </div>
                          </h5>
                          <ul className="text-sm font-mono space-y-1">
                            <li>
                              {balance.assets.quantity} {balance.symbol}
                            </li>
                            <li>
                              {balance.assets.usd < 0.01
                                ? `$${balance.assets.usd}`
                                : usDollarFormatter.format(balance.assets.usd)}
                            </li>
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
                <div className="w-full">
                  <h4 className="text-lg font-medium mb-4">Borrowing</h4>
                  <div className="space-y-4">
                    {account.balances.borrowing.length === 0 && (
                      <p className="text-destructive-foreground">
                        No open borrowing positions
                      </p>
                    )}
                    {account.balances.borrowing.map((balance, index) => (
                      <Card key={index}>
                        <CardContent>
                          <h5 className="flex items-center gap-2 py-4 mb-4">
                            <Image
                              src={balance.logo}
                              alt={balance.name}
                              width={30}
                              height={30}
                              unoptimized
                              className="rounded-full"
                            />
                            <div className="space-y-1">
                              {balance.name}
                              <Link
                                href={`https://solscan.io/address/${balance.bankAddress}`}
                                className="text-xs block max-w-fit text-primary border-b transition-colors hover:border-transparent"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {shortenAddress(balance.bankAddress)}
                              </Link>
                            </div>
                          </h5>
                          <ul className="text-sm font-mono space-y-1">
                            <li>
                              {balance.liabilities.quantity} {balance.symbol}
                            </li>
                            <li>
                              {balance.liabilities.usd < 0.01
                                ? `$${balance.liabilities.usd}`
                                : usDollarFormatter.format(
                                    balance.liabilities.usd
                                  )}
                            </li>
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
