'use client'

import React from 'react'

import Image from 'next/image'

import { Connection, PublicKey } from '@solana/web3.js'
import { getDomainKeySync, NameRegistryState } from '@bonfida/spl-name-service'

import { cn } from '@/lib/utils'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardTitle, CardContent } from '@/components/ui/card'

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL!, 'confirmed')

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

export const Search = () => {
  const [accounts, setAccounts] = React.useState<Account[]>()
  const [isSearching, setIsSearching] = React.useState(false)

  const searchAccounts = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setIsSearching(true)
      const formData = new FormData(e.currentTarget)
      const address = formData.get('address')

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
          console.log('Invalid domain name provided')
          return
        }
      } else {
        try {
          pk = new PublicKey(addressString)
        } catch (e) {
          console.log('Invalid address provided')
          return
        }
      }

      const res = await fetch(`/api/search?address=${pk.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        console.log('Error searching for account')
        return
      }

      const { accounts } = await res.json()

      if (!accounts) {
        console.log('No accounts found')
        return
      }

      setAccounts(accounts)
      setIsSearching(false)
    },
    []
  )

  return (
    <div className="w-full max-w-4xl">
      <form className="w-full max-w-2xl mx-auto mb-4" onSubmit={searchAccounts}>
        <div className="flex flex-col md:flex-row items-center justify-center w-full gap-2">
          <Input
            type="text"
            name="address"
            placeholder="Wallet address or .sol domain..."
            className="text-lg h-auto py-1.5 font-light"
            autoFocus
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
      {accounts && (
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
              <h3 className="md:text-lg font-medium mb-8 text-center">
                Account:{' '}
                <span className="font-mono text-xs">{account.address}</span>
              </h3>

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
                            {balance.name}
                          </h5>
                          <ul className="text-sm font-mono space-y-1">
                            <li>
                              {balance.assets.quantity} {balance.symbol}
                            </li>
                            <li>{balance.assets.usd}</li>
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
                            {balance.name}
                          </h5>
                          <ul className="text-sm font-mono space-y-1">
                            <li>
                              {balance.liabilities.quantity} {balance.symbol}
                            </li>
                            <li>${balance.liabilities.usd}</li>
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
