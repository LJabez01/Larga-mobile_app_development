import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_MAPBOX_RENDER_ACCESS_TOKEN,
  resolveMapboxAccessToken,
  resolveMapboxDirectionsAccessToken,
} from '@/lib/config/mapbox';

test('render token resolver keeps the project default token unless an explicit override is provided', () => {
  assert.equal(resolveMapboxAccessToken(), DEFAULT_MAPBOX_RENDER_ACCESS_TOKEN);
  assert.equal(
    resolveMapboxAccessToken({
      EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: 'pk.local-render-token-that-should-not-override',
      MAPBOX_ACCESS_TOKEN: 'pk.local-generic-token-that-should-not-override',
    }),
    DEFAULT_MAPBOX_RENDER_ACCESS_TOKEN,
  );
  assert.equal(
    resolveMapboxAccessToken({
      EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN_OVERRIDE: 'pk.validated-mobile-render-override',
    }),
    'pk.validated-mobile-render-override',
  );
});

test('directions token resolver still prefers explicit directions credentials before the render token default', () => {
  assert.equal(
    resolveMapboxDirectionsAccessToken({
      MAPBOX_DIRECTIONS_ACCESS_TOKEN: 'sk.directions-server-token',
      EXPO_PUBLIC_MAPBOX_DIRECTIONS_ACCESS_TOKEN: 'pk.public-directions-token',
      EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: 'pk.render-token',
    }),
    'sk.directions-server-token',
  );
  assert.equal(
    resolveMapboxDirectionsAccessToken({
      EXPO_PUBLIC_MAPBOX_DIRECTIONS_ACCESS_TOKEN: 'pk.public-directions-token',
      EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: 'pk.render-token',
    }),
    'pk.public-directions-token',
  );
  assert.equal(
    resolveMapboxDirectionsAccessToken({
      EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: 'pk.local-render-token-that-should-not-power-directions',
      MAPBOX_ACCESS_TOKEN: 'pk.generic-token-that-should-not-power-directions',
    }),
    DEFAULT_MAPBOX_RENDER_ACCESS_TOKEN,
  );
  assert.equal(resolveMapboxDirectionsAccessToken(), DEFAULT_MAPBOX_RENDER_ACCESS_TOKEN);
});
