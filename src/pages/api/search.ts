import type { NextApiRequest, NextApiResponse } from 'next'
import { Connection, PublicKey } from '@solana/web3.js'
import { getConfig, MarginfiClient } from '@mrgnlabs/marginfi-client-v2'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get prod connection
  const connection = new Connection(
    'https://mrgn.rpcpool.com/c293bade994b3864b52c6bbbba4b',
    'confirmed'
  )

  const address = req.query.address
  let pk: PublicKey

  if (!address) {
    return res.status(400).json({ error: 'No address provided' })
  }

  try {
    pk = new PublicKey(address)
  } catch (e) {
    return res.status(400).json({ error: 'Invalid address provided' })
  }

  const config = await getConfig('production')
  let data = ''

  // Instantiate client using those configs, and a fake wallet since we won't be signing anything
  const marginfiClient = await MarginfiClient.fetch(
    config,
    {} as any,
    connection
  )

  const accounts = await marginfiClient.getMarginfiAccountsForAuthority(pk)

  accounts.forEach((account) => {
    data += account.describe() + '\r\n'
  })

  return res.json({ data })
}
