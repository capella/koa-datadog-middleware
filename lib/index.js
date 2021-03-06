const StatsD = require("hot-shots")

module.exports = function(options) {
  options = options || {}
  const metric = options.metric || "koa.router.response_time_ms"

  options.maxBufferSize = options.maxBufferSize || 1000
  options.bufferFlushInterval = options.bufferFlushInterval || 1000
  options.cacheDns = (options.cacheDns != undefined) ? options.cacheDns : true
  options.sampleRate = options.sampleRate || 1

  const client = new StatsD(options)

  return function *reporter(next) {
    const start = Date.now()
    try {
      yield next
    } catch(err) {
      report(client, metric, this, start, err)
      throw err
    }
    report(client, metric, this, start, null)
  }
}

function report(client, metric, ctx, start, err) {
  let matchedRoute = ctx._matchedRoute
  if (!matchedRoute && ctx.matched && ctx.matched.length > 0) {
    matchedRoute = ctx.matched[0].path
  } else if (!matchedRoute) {
    matchedRoute = ctx.path
  }

  const status = err
    ? (err.status || 500)
    : (ctx.status || 404);

  const duration = new Date - start;
  let tags = [
    `status_code:${status}`,
    `path:${matchedRoute}`,
    `method:${ctx.method}`
  ]
  if (ctx.state && ctx.state.datadog && Array.isArray(ctx.state.datadog)) {
    tags = tags.concat(ctx.state.datadog)
  }
  client.histogram(metric, duration, tags)
}
