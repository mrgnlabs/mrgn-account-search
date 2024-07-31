import type { NextApiRequest, NextApiResponse } from 'next'
import { Connection, PublicKey } from '@solana/web3.js'
import { MarginfiClient, getConfig } from '@mrgnlabs/marginfi-client-v2'

type Account = {
  group: string
  assets: number
  liabilities: number
  address: string
  healthFactor: number
  balances: {
    lending: any[]
    borrowing: any[]
  }
}

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

  const groupsRes = await fetch(
    'https://storage.googleapis.com/mrgn-public/mfi-trade-groups.json'
  )

  if (!groupsRes.ok) {
    return res.status(400).json({ error: 'Failed to fetch groups' })
  }

  const groupsJson = await groupsRes.json()
  const groups = Object.keys(groupsJson)

  const tokenMetadata = await fetch(
    'https://storage.googleapis.com/mrgn-public/mfi-trade-token-metadata-cache.json'
  )

  if (!tokenMetadata.ok) {
    return res.status(400).json({ error: 'Failed to fetch token metadata' })
  }

  const tokenMetadataJson = await tokenMetadata.json()

  const { programId } = getConfig()

  let allAccounts: Account[] = []

  for (const group of groups) {
    const marginfiClient = await MarginfiClient.fetch(
      {
        environment: 'production',
        cluster: 'mainnet',
        programId,
        groupPk: new PublicKey(group),
      },
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
          logo: `https://storage.googleapis.com/mrgn-public/mrgn-trade-token-icons/${bank.mint.toBase58()}.png`,
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
        group, // Include the group key
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

    allAccounts = allAccounts.concat(accounts)

    allAccounts = allAccounts.filter(
      (account) =>
        account.balances.lending.length > 0 ||
        account.balances.borrowing.length > 0
    )
  }

  return res.json({ accounts: allAccounts })
}
