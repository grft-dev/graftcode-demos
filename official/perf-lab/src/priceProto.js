// Hand-authored protobuf descriptors for energyprice.PriceService, mirroring
// grpc-energy-price-dotnet/Protos/price.proto. Authored with the @bufbuild/protobuf
// runtime (already a dependency) so we don't need buf/protoc codegen tooling.
import { proto3, ScalarType, MethodKind } from '@bufbuild/protobuf'

export const GetPriceRequest = proto3.makeMessageType('energyprice.GetPriceRequest', [])

export const GetPriceResponse = proto3.makeMessageType('energyprice.GetPriceResponse', [
  { no: 1, name: 'price', kind: 'scalar', T: ScalarType.DOUBLE },
])

export const PricePoint = proto3.makeMessageType('energyprice.PricePoint', [
  { no: 1, name: 'timestamp', kind: 'scalar', T: ScalarType.INT64 },
  { no: 2, name: 'price', kind: 'scalar', T: ScalarType.DOUBLE },
  { no: 3, name: 'low', kind: 'scalar', T: ScalarType.DOUBLE },
  { no: 4, name: 'high', kind: 'scalar', T: ScalarType.DOUBLE },
  { no: 5, name: 'average', kind: 'scalar', T: ScalarType.DOUBLE },
  { no: 6, name: 'currency', kind: 'scalar', T: ScalarType.STRING },
  { no: 7, name: 'region', kind: 'scalar', T: ScalarType.STRING },
  { no: 8, name: 'source', kind: 'scalar', T: ScalarType.STRING },
])

export const GetPriceHistoryRequest = proto3.makeMessageType('energyprice.GetPriceHistoryRequest', [
  { no: 1, name: 'count', kind: 'scalar', T: ScalarType.INT32 },
])

export const GetPriceHistoryResponse = proto3.makeMessageType('energyprice.GetPriceHistoryResponse', [
  { no: 1, name: 'points', kind: 'message', T: PricePoint, repeated: true },
])

export const StreamPricesRequest = proto3.makeMessageType('energyprice.StreamPricesRequest', [
  { no: 1, name: 'count', kind: 'scalar', T: ScalarType.INT32 },
])

export const PriceService = {
  typeName: 'energyprice.PriceService',
  methods: {
    getPrice: {
      name: 'GetPrice',
      I: GetPriceRequest,
      O: GetPriceResponse,
      kind: MethodKind.Unary,
    },
    getPriceHistory: {
      name: 'GetPriceHistory',
      I: GetPriceHistoryRequest,
      O: GetPriceHistoryResponse,
      kind: MethodKind.Unary,
    },
    streamPrices: {
      name: 'StreamPrices',
      I: StreamPricesRequest,
      O: PricePoint,
      kind: MethodKind.ServerStreaming,
    },
  },
}
