import { AssetService } from '../asset/service'
import { IAppConfig } from '../config/app'
import { isPeerError, PeerError } from '../peer/errors'
import { PeerService } from '../peer/service'
import { BaseService } from '../shared/baseService'
import { AutoPeeringError } from './errors'

interface PeeringDetails {
  staticIlpAddress: string
  ilpConnectorAddress: string
}

interface PeeringRequestArgs {
  staticIlpAddress: string
  ilpConnectorAddress: string
  asset: { code: string; scale: number }
  httpToken: string
}
export interface AutoPeeringService {
  acceptPeeringRequest(
    args: PeeringRequestArgs
  ): Promise<PeeringDetails | AutoPeeringError>
}

export interface ServiceDependencies extends BaseService {
  assetService: AssetService
  peerService: PeerService
  config: IAppConfig
}

export async function createAutoPeeringService(
  deps_: ServiceDependencies
): Promise<AutoPeeringService> {
  const deps: ServiceDependencies = {
    ...deps_,
    logger: deps_.logger.child({
      service: 'AutoPeeringService'
    })
  }

  return {
    acceptPeeringRequest: (args: PeeringRequestArgs) =>
      acceptPeeringRequest(deps, args)
  }
}

async function acceptPeeringRequest(
  deps: ServiceDependencies,
  args: PeeringRequestArgs
): Promise<PeeringDetails | AutoPeeringError> {
  const assets = await deps.assetService.getAll()

  const asset = assets.find(
    ({ code, scale }) => code === args.asset.code && scale === args.asset.scale
  )

  if (!asset) {
    return AutoPeeringError.UnknownAsset
  }

  const peerOrError = await deps.peerService.create({
    staticIlpAddress: args.staticIlpAddress,
    assetId: asset.id,
    http: {
      incoming: {
        authTokens: [args.httpToken]
      },
      outgoing: {
        endpoint: args.ilpConnectorAddress,
        authToken: args.httpToken
      }
    }
  })

  if (isPeerError(peerOrError)) {
    if (peerOrError === PeerError.DuplicatePeer) {
      /* If previously peered, treat as success */
    } else if (
      peerOrError === PeerError.InvalidHTTPEndpoint ||
      peerOrError === PeerError.InvalidStaticIlpAddress
    ) {
      return AutoPeeringError.InvalidPeerIlpConfiguration
    } else {
      deps.logger.error(
        { error: peerOrError, request: args },
        'Could not accept peering request'
      )
      return AutoPeeringError.InvalidPeeringRequest
    }
  }

  return {
    ilpConnectorAddress: deps.config.ilpConnectorAddress,
    staticIlpAddress: deps.config.ilpAddress
  }
}
