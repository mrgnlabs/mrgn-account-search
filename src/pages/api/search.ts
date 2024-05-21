import type { NextApiRequest, NextApiResponse } from 'next'
import { Connection, PublicKey } from '@solana/web3.js'
import { getConfig, MarginfiClient } from '@mrgnlabs/marginfi-client-v2'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const connection = new Connection(
    process.env.NEXT_PUBLIC_RPC_URL!,
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

  const tokenMetadata = await fetch(
    'https://storage.googleapis.com/mrgn-public/mrgn-token-metadata-cache.json'
  )
  const tokenMetadataJson = await tokenMetadata.json()

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

      const tokenMetadata = tokenMetadataJson.find(
        (token: { address: string }) => token.address === bank.mint.toBase58()
      )

      const { assets, liabilities } = balance.computeQuantityUi(bank)
      const assetsUsd = bank.computeAssetUsdValue(
        priceInfo!,
        balance.assetShares,
        2,
        0
      )
      const liabilitiesUsd = bank.computeLiabilityUsdValue(
        priceInfo!,
        balance.liabilityShares,
        2,
        0
      )

      return {
        bankAddress: bank.address.toBase58(),
        mintAddress: bank.mint.toBase58(),
        name: tokenMetadata?.name,
        symbol: tokenMetadata?.symbol,
        logo: tokenMetadata?.logoURI,
        assets: {
          quantity: !assetsUsd.isZero() ? assets.toNumber() : 0,
          usd: assetsUsd.toNumber(),
        },
        liabilities: {
          quantity: !liabilitiesUsd.isZero() ? liabilities.toNumber() : 0,
          usd: liabilitiesUsd.toNumber(),
        },
      }
    })

    const lendingPositions = balances.filter(
      (balance) => balance.assets.quantity > 0
    )
    const borrowingPositions = balances.filter(
      (balance) => balance.liabilities.quantity > 0
    )

    return {
      assets: assets.toNumber(),
      liabilities: liabilities.toNumber(),
      address: account.address.toBase58(),
      healthFactor: parseFloat((healthFactor * 100).toFixed(2)),
      balances: {
        lending: lendingPositions,
        borrowing: borrowingPositions,
      },
    }
  })

  return res.json({ accounts })
}
