Brave Web Search API
Introduction
Brave Web Search API is a REST API to query Brave Search and get back search results from the web. The following sections describe how to curate requests, including parameters and headers, to Brave Web Search API and get a JSON response back.

To try the API on a Free plan, you’ll still need to subscribe — you simply won’t be charged. Once subscribed, you can get an API key in the API Keys section.

Endpoints
Brave Search API exposes multiple endpoints for specific types of data, based on the level of your subscription. If you don’t see the endpoint you’re interested in, you may need to change your subscription.

https://api.search.brave.com/res/v1/web/search

Example
A request has to be made to the web search endpoint. An example CURL request is given below.



curl -s --compressed "https://api.search.brave.com/res/v1/web/search?q=brave+search" \
  -H "Accept: application/json" \
  -H "Accept-Encoding: gzip" \
  -H "X-Subscription-Token: <YOUR_API_KEY>"

The response specification for Web Search API can be seen in the WebSearchApiResponse model.

Next Steps
To learn what parameters are available and what responses can be expected while querying Brave Web Search API, please review the following pages:

Query Parameters
Request Headers
Response Headers
Response Objects
Brave Local Search API
Introduction
Brave Local Search API provides enrichments for location search results.

Access to Local API is available through the Pro plans.

Endpoints
Brave Local Search API is currently available at the following endpoints and exposes an API to get extra information about a location, including pictures and related web results.

https://api.search.brave.com/res/v1/local/pois

The endpoint supports batching and retrieval of extra information of up to 20 locations with a single request.

The local API also includes an endpoint to get an AI generated description for a location.

https://api.search.brave.com/res/v1/local/descriptions

Example
An initial request has to be made to web search endpoint with a given query. An example CURL request is given below.



curl -s --compressed "https://api.search.brave.com/res/v1/web/search?q=greek+restaurants+in+san+francisco" \
  -H "Accept: application/json" \
  -H "Accept-Encoding: gzip" \
  -H "X-Subscription-Token: <YOUR_API_KEY>"

If the query returns a list of locations, as in this case, each location result has an id field, which is a temporary ID that can be used to retrieve extra information about the location. An example from the locations result is given below.

{
  "locations": {
    "results": [
      {
        "id": "1520066f3f39496780c5931d9f7b26a6",
        "title": "Pangea Banquet Mediterranean Food"
      },
      {
        "id": "d00b153c719a427ea515f9eacf4853a2",
        "title": "Park Mediterranean Grill"
      },
      {
        "id": "4b943b378725432aa29f019def0f0154",
        "title": "The Halal Mediterranean Co."
      }
    ]
  }
}

The id value can be used to further fetch extra information about the location. An example request is given below.



curl -s --compressed "https://api.search.brave.com/res/v1/local/pois?ids=1520066f3f39496780c5931d9f7b26a6&ids=d00b153c719a427ea515f9eacf4853a2" \
  -H "accept: application/json" \
  -H "Accept-Encoding: gzip" \
  -H "x-subscription-token: <YOUR_API_KEY>"

An AI generated description associated with a location can be further fetched using the example below.



curl -s --compressed "https://api.search.brave.com/res/v1/local/descriptions?ids=1520066f3f39496780c5931d9f7b26a6&ids=d00b153c719a427ea515f9eacf4853a2" \
  -H "accept: application/json" \
  -H "Accept-Encoding: gzip" \
  -H "x-subscription-token: <YOUR_API_KEY>"

The response specification for Local Search API can be seen in the LocalPoiSearchApiResponse and LocalDescriptionsSearchApiResponse models.