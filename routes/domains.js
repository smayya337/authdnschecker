var express = require('express');
var router = express.Router();
const dns = require("dns");

async function catchOrWrap(promise) {
    const output = {};
    try {
        output["error"] = null;
        output["result"] = await promise;
    } catch (e) {
        output["error"] = e;
        output["result"] = null;
    }
    return output;
}

/* GET SOA for domain from all of its authoritative name servers. */
router.get('/:domain/soa', async function(req, res, next) {
    const resolver = new dns.promises.Resolver();
    let nses = await resolver.resolveNs(req.params.domain);
    const reses = [];
    for (const nameserver of nses) {
        const nsAddresses = await resolver.resolve(nameserver);
        const localResolver = new dns.promises.Resolver({timeout: 100, tries: 1});
        localResolver.setServers(nsAddresses);
        const soaPromise = catchOrWrap(localResolver.resolveSoa(req.params.domain));
        reses.push(soaPromise);
    }
    await Promise.all(reses);
    const output = {};
    for (let i = 0; i < nses.length; i++) {
        output[nses[i]] = await reses[i];
    }
    res.json(output);
});

module.exports = router;
