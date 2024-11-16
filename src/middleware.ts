import { NextRequest, NextResponse } from 'next/server'
import { generateEndpoint } from '@/lib/utils'

const allowedOrigins = [
  'https://arena-account-search.vercel.app',
  'http://localhost:3000',
]

export async function middleware(req: NextRequest) {
  const fullRpcProxy = await generateEndpoint(
    process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE ?? ''
  )

  console.log(fullRpcProxy, req.nextUrl.toString())

  if (req.nextUrl.toString() === fullRpcProxy) {
    const origin = req.nextUrl.origin ?? ''

    if (!allowedOrigins.includes(origin)) {
      return new Response('Access Denied', {
        status: 403,
        statusText: 'Forbidden',
      })
    }

    return NextResponse.rewrite(
      new URL(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE ?? '')
    )
  }
}
