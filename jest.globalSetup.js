// Node caches the timezone on first Date use, so it must be set before any
// test module loads. Fixing it here also keeps date-sensitive suites
// deterministic regardless of the machine or CI runner's local zone.
module.exports = () => { process.env.TZ = 'America/New_York'; };
