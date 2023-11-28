import type { NextApiRequest, NextApiResponse } from 'next'
import { Connection, PublicKey } from '@solana/web3.js'
import { getConfig, MarginfiClient } from '@mrgnlabs/marginfi-client-v2'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  const marginfiClient = await MarginfiClient.fetch(
    config,
    {} as any,
    connection
  )

  const accountsRaw = await marginfiClient.getMarginfiAccountsForAuthority(pk)

  const accounts = accountsRaw.map((account) => {
    const { assets, liabilities } = account.computeHealthComponents(2)
    const maintenanceComponentsWithBiasAndWeighted =
      account.computeHealthComponents(1)
    const healthFactor =
      maintenanceComponentsWithBiasAndWeighted.assets.isZero()
        ? 1
        : maintenanceComponentsWithBiasAndWeighted.assets
            .minus(maintenanceComponentsWithBiasAndWeighted.liabilities)
            .dividedBy(maintenanceComponentsWithBiasAndWeighted.assets)
            .toNumber()

    const balances = account.activeBalances.map((balance) => {
      const bank = marginfiClient.banks.get(balance.bankPk.toBase58())!
      const priceInfo = marginfiClient.oraclePrices.get(
        balance.bankPk.toBase58()
      )

      return {
        address: balance.bankPk.toBase58(),
      }
    })

    return {
      assets: assets.toNumber(),
      liabilities: liabilities.toNumber(),
      address: account.address.toBase58(),
      healthFactor: parseFloat((healthFactor * 100).toFixed(2)),
      balances,
    }
  })

  return res.json({ accounts })
}
