<p align="center">
  <img src="https://images.atomist.com/sdm/SDM-Logo-Dark.png">
</p>

# @ipcrm/ipcrm-example-tunnel-proxy

Config needs:

```
  "sdm": {
    "proxy": {
      "host": "localhost",
      "port": "3128",
      "protocol": "http"
    }
  },
```

Run squid locally:

```
docker run --rm --name squid -p 3128:3128 datadog/squid
```
