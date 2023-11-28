'use client'

import React from 'react'

import Image from 'next/image'

import { Connection, PublicKey } from '@solana/web3.js'
import { getDomainKeySync, NameRegistryState } from '@bonfida/spl-name-service'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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
  balances: Balance[]
}

export const Search = () => {
  const [accounts, setAccounts] = React.useState<Account[]>()

  const searchAccounts = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
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
    },
    []
  )

  return (
    <div className="w-full space-y-8 max-w-2xl">
      <form className="w-full max-w-lg mx-auto" onSubmit={searchAccounts}>
        <div className="flex items-center justify-center w-full gap-2">
          <Input
            type="text"
            name="address"
            placeholder="Wallet address or .sol domain..."
            className="text-lg h-auto py-1.5 font-light"
          />
          <Button type="submit" className="py-3.5">
            🔎 Search
          </Button>
        </div>
      </form>
      {accounts && (
        <div>
          <h2 className="text-2xl font-bold mb-4">
            {accounts.length} account{accounts.length > 1 && 's'} found
          </h2>

          {accounts.map((account) => (
            <div className="border-b border-border pb-4 mb-4">
              <h3 className="text-xl font-medium mb-2">
                Account: <span className="font-mono">{account.address}</span>
              </h3>
              <h4 className="text-lg font-medium mb-4">Balances</h4>
              <ul>
                {account.balances.map((balance) => (
                  <li>
                    <h4 className="flex items-center gap-2">
                      <Image
                        src={balance.logo}
                        alt={balance.name}
                        width={30}
                        height={30}
                        unoptimized
                        className="rounded-full"
                      />
                      {balance.name}
                    </h4>

                    {balance.assets.quantity > 0 && (
                      <>
                        <h5>Lending</h5>
                        <ul className="text-sm font-mono">
                          <li>
                            {balance.assets.quantity} {balance.symbol}
                          </li>
                          <li>{balance.assets.usd}</li>
                        </ul>
                      </>
                    )}

                    {balance.liabilities.quantity > 0 && (
                      <>
                        <h5>Borrowing</h5>
                        <ul className="text-sm font-mono">
                          <li>
                            {balance.liabilities.quantity} {balance.symbol}
                          </li>
                          <li>${balance.liabilities.usd}</li>
                        </ul>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
