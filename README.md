<p align="center">
  <img src="https://images.atomist.com/sdm/SDM-Logo-Dark.png">
</p>

# @ipcrm/ipcrm-example-tunnel-proxy

This example SDM supports using an HTTP/HTTPS proxy that is a tunneling proxy (ie encapsulates https traffic over http).

To use, simply set your `https_proxy` or `HTTPS_PROXY` environment variables.  If you have hosts that should not route
through the proxy simply exclude them by supplying `no_proxy` or `NO_PROXY` (comma separated list).


_For Additional debugging only_

You may also set the environment variable `AXIOS_VERBOSE` equal to `true` and this will cause Axios to log all requests
and their responses.  This mode may not always error out on request failures - so it should be used with caution and
sparingly for troubleshooting purposes only.

