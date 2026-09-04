import '@/styles/index.css'
import { boot } from '@/app/boot'

// The document is parsed before this module runs (type="module" is deferred),
// so there is nothing to wait for.
boot()
