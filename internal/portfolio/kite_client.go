package portfolio

import (
	kiteconnect "github.com/zerodha/gokiteconnect/v4"
)

// KiteClient defines the subset of Kite Connect API methods required for holdings operations.
// This interface allows seamless mocking in tests without making network requests.
type KiteClient interface {
	GetHoldings() (kiteconnect.Holdings, error)
}

// defaultKiteClient wraps a real *kiteconnect.Client.
type defaultKiteClient struct {
	client *kiteconnect.Client
}

func (d *defaultKiteClient) GetHoldings() (kiteconnect.Holdings, error) {
	return d.client.GetHoldings()
}

// ClientFactoryFunc is a constructor function that produces a KiteClient.
type ClientFactoryFunc func(apiKey, accessToken string) KiteClient

// DefaultClientFactory creates a real *kiteconnect.Client configured with the given access token.
func DefaultClientFactory(apiKey, accessToken string) KiteClient {
	kc := kiteconnect.New(apiKey)
	kc.SetAccessToken(accessToken)
	return &defaultKiteClient{client: kc}
}
