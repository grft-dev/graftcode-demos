import http2 from 'node:http2'

const ALIAS = '/graft/h2'
const H2C_ORIGIN = 'http://127.0.0.1:5001'

function remainderPath(url, alias) {
  let remainder = url.slice(alias.length)
  if (remainder === '/') {
    remainder = ''
  }
  return `/h2${remainder}`
}

function buildH2RequestHeaders(req) {
  const headers = {
    ':method': req.method || 'POST',
    ':path': remainderPath(req.url, ALIAS),
    'content-type': req.headers['content-type'] || 'application/octet-stream',
  }

  for (const [key, value] of Object.entries(req.headers)) {
    const lower = key.toLowerCase()
    if (lower === 'authorization' || lower.startsWith('x-')) {
      headers[lower] = value
    }
  }

  return headers
}

function buildHttp1ResponseHeaders(h2Headers) {
  return Object.fromEntries(
    Object.entries(h2Headers).filter(([key]) => !key.startsWith(':'))
  )
}

function readBody(req) {
  const source = req.stream ?? req
  return new Promise((resolve, reject) => {
    const chunks = []
    source.on('data', (chunk) => chunks.push(chunk))
    source.on('end', () => resolve(Buffer.concat(chunks)))
    source.on('error', reject)
    if (source.readableEnded || source.complete) {
      resolve(Buffer.concat(chunks))
    }
  })
}

export function h2cProxy() {
  return {
    name: 'graft-h2c-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(ALIAS)) {
          return next()
        }

        let client
        try {
          const body = await readBody(req)
          client = http2.connect(H2C_ORIGIN)
          const upstream = client.request(buildH2RequestHeaders(req))
          upstream.end(body)

          upstream.on('response', (headers) => {
            res.writeHead(headers[':status'] || 200, buildHttp1ResponseHeaders(headers))
            upstream.pipe(res)
          })

          upstream.on('error', (error) => {
            if (!res.headersSent) {
              res.statusCode = 502
              res.end(String(error))
            }
            client.close()
          })

          client.on('error', (error) => {
            if (!res.headersSent) {
              res.statusCode = 502
              res.end(String(error))
            }
          })

          res.on('close', () => client.close())
        } catch (error) {
          if (!res.headersSent) {
            res.statusCode = 502
            res.end(String(error))
          }
          client?.close()
        }
      })
    },
  }
}
