// Handwritten gRPC-Web client. priceProto.js is the generated-code stand-in and is not counted here.
import { createPromiseClient } from '@connectrpc/connect'
import { createGrpcWebTransport } from '@connectrpc/connect-web'
import { PriceService } from '../priceProto'

// metrics:begin grpc.getPrice.client
const clientCache = new Map()

function getClient(baseUrl) {
  const key = baseUrl.replace(/\/$/, '')
  if (!clientCache.has(key)) {
    const transport = createGrpcWebTransport({ baseUrl: key })
    clientCache.set(key, createPromiseClient(PriceService, transport))
  }
  return clientCache.get(key)
}

export async function callGrpcGetPrice(baseUrl) {
  await getClient(baseUrl).getPrice({})
}
// metrics:end grpc.getPrice.client

// metrics:begin grpc.history.client
export async function callGrpcGetPriceHistory(baseUrl, count) {
  const response = await getClient(baseUrl).getPriceHistory({ count })
  return response.points?.length ?? 0
}
// metrics:end grpc.history.client

// metrics:begin grpc.stream.client
export async function streamGrpcPrices(baseUrl, count) {
  let received = 0
  for await (const _point of getClient(baseUrl).streamPrices({ count })) {
    received += 1
  }
  return received
}
// metrics:end grpc.stream.client
