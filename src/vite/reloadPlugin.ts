export function gplayReloadPlugin(glob = 'src/**/*') {
  return {
    name: 'gplay-reload-plugin',
    configureServer(server: any) {
      server.watcher.add([glob])

      const reload = (file: string) => {
        // chỉ reload khi thay đổi trong src (đỡ reload linh tinh)
        if (!file.includes('/src/') && !file.includes('\\src\\')) return

        server.ws.send({ type: 'full-reload', path: '*' })
        console.log('[gplay-sdk] full reload due to:', file)
      }

      server.watcher.on('change', reload)
      server.watcher.on('add', reload)
      server.watcher.on('unlink', reload)
    },
  }
}
