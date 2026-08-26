// gRPC-Web client built on ConnectRPC (talks to the .NET Kestrel gRPC-Web service).
import { createGrpcWebTransport } from '@connectrpc/connect-web'
import { createPromiseClient } from '@connectrpc/connect'
import { PriceService } from './priceProto'

// Reuse one client per base URL so the underlying HTTP/2 connection is reused.
const clientCache = new Map()
function getClient(baseUrl) {
  const key = baseUrl.replace(/\/$/, '')
  if (!clientCache.has(key)) {
    const transport = createGrpcWebTransport({ baseUrl: key })
    clientCache.set(key, createPromiseClient(PriceService, transport))
  }
  return clientCache.get(key)
}

// Trivial unary call (single price).
export async function callGrpcGetPrice(baseUrl) {
  await getClient(baseUrl).getPrice({})
}

// Large payload: one unary call returning `count` price points.
export async function callGrpcGetPriceHistory(baseUrl, count) {
  const res = await getClient(baseUrl).getPriceHistory({ count })
  return res.points?.length ?? 0
}

// Server streaming: receive `count` points one at a time over one HTTP/2 stream.
export async function streamGrpcPrices(baseUrl, count) {
  let received = 0
  for await (const _point of getClient(baseUrl).streamPrices({ count })) {
    received += 1
  }
  return received
}
