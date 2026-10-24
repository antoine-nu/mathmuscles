// Assemble le build Vite en un seul fichier HTML autonome (JS, CSS et icône intégrés),
// qui s'ouvre d'un double-clic, sans serveur : idéal pour une clé USB.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'

const assets = readdirSync('dist/assets')
const read = (ext) =>
  assets.filter((f) => f.endsWith(ext)).map((f) => readFileSync(`dist/assets/${f}`, 'utf8')).join('\n')

const js = read('.js').replace(/<\/script/gi, '<\\/script')
const css = read('.css')
const icon = Buffer.from(readFileSync('public/favicon.svg')).toString('base64')

const html = readFileSync('dist/index.html', 'utf8')
  .replace(/\s*<script type="module"[^>]*src="[^"]*"><\/script>/, '')
  .replace(/\s*<link rel="stylesheet"[^>]*href="\/assets\/[^"]*">/, '')
  .replace('href="/favicon.svg"', `href="data:image/svg+xml;base64,${icon}"`)
  .replace('</head>', () => `  <style>${css}</style>\n  </head>`)
  .replace('</body>', () => `  <script type="module">${js}</script>\n  </body>`)

mkdirSync('dist-usb', { recursive: true })
writeFileSync('dist-usb/AgeOfEquations.html', html)
console.log(`dist-usb/AgeOfEquations.html (${Math.round(html.length / 1024)} Ko)`)
