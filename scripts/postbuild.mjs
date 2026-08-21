import {copyFile} from 'node:fs/promises'

await copyFile('docs/index.html', 'docs/404.html')
console.log('postbuild: docs/404.html written')
