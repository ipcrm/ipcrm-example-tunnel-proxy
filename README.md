<p align="center">
  <img src="https://images.atomist.com/sdm/SDM-Logo-Dark.png">
</p>

# @ipcrm/ipcrm-example-tunnel-proxy

Add to client.config.json

```json
{
  ...
  "sdm": {
    "proxy": {
      "host": "proxyHost", // Defaults to 'localhost'
      "port": "proxyPort", // Defaults to 80
      "localAddress": "localAddress", // Local interface if necessary
      "proxyAuth": "user:password", // Basic authorization for proxy server if necessary
      "headers": { // Header fields for proxy server if necessary
        "User-Agent": "Node"
      }
    },
    ...
  }
}

```

