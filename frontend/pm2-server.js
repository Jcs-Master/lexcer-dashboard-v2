import { createServer } from 'vite'

async function start() {
  const server = await createServer({
    configFile: './vite.config.js',
    root: '.',
  })
  await server.listen(5173)
  server.printUrls()
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})