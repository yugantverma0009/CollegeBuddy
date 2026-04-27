// Patch ALL DNS resolution to use Google DNS (8.8.8.8)
// MongoDB driver uses dns.Resolver instances + dns.promises internally,
// so just calling dns.setServers() is not enough

const dns = require('dns');
const GOOGLE_DNS = ['8.8.8.8', '8.8.4.4'];
const METHODS = ['resolve', 'resolve4', 'resolve6', 'resolveSrv', 'resolveTxt',
                 'resolveMx', 'resolveNs', 'resolveCname', 'resolveSoa', 'resolvePtr'];

// patch global dns (callback API)
dns.setServers(GOOGLE_DNS);
const resolver = new dns.Resolver();
resolver.setServers(GOOGLE_DNS);
METHODS.forEach(fn => {
  if (typeof resolver[fn] === 'function') dns[fn] = resolver[fn].bind(resolver);
});

// patch dns.promises (promise API - this is what modern mongodb driver uses)
if (dns.promises) {
  dns.promises.setServers(GOOGLE_DNS);
  const pr = new dns.promises.Resolver();
  pr.setServers(GOOGLE_DNS);
  METHODS.forEach(fn => {
    if (typeof pr[fn] === 'function') dns.promises[fn] = pr[fn].bind(pr);
  });
}
