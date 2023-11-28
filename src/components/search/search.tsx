'use client'

import React from 'react'

import { Connection, PublicKey } from '@solana/web3.js'
import { getDomainKeySync, NameRegistryState } from '@bonfida/spl-name-service'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL!, 'confirmed')

export const Search = () => {
  const [result, setResult] = React.useState('')

  const searchAccounts = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      const address = formData.get('address')
      console.log('walletAddress', address)

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

      console.log(pk.toString())

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

      console.log(accounts)
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
      {result && <pre>{result}</pre>}
    </div>
  )
}
