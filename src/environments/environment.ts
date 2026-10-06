/**
 * Local environment. The web app consumes the json-server copy of KidTrackAPI
 * (../kidtrack-api, `npm start` → http://localhost:3000/api/v1).
 */
export const environment = {
  apiBaseUrl: 'https://kidtrack-mockapi-abh4gyegc5byhbb7.centralus-01.azurewebsites.net/api/v1',

  // Endpoint paths per bounded context
  signInEndpointPath: '/authentication/sign-in',
  signUpEndpointPath: '/authentication/sign-up',
  usersEndpointPath: '/users',
  organizationsEndpointPath: '/organizations',
  plansEndpointPath: '/plans',
  subscriptionsEndpointPath: '/subscriptions',
  profilesEndpointPath: '/profiles',
  parentsEndpointPath: '/parents',
  childrenEndpointPath: '/children',
  vehiclesEndpointPath: '/vehicles',
  routesEndpointPath: '/routes',
  tripsEndpointPath: '/trips',
  incidentsEndpointPath: '/incidents',
  notificationsEndpointPath: '/notifications',

  // OpenRouteService — https://openrouteservice.org
  orsBaseUrl: 'https://api.openrouteservice.org',
  orsApiKey: 'YOUR_OPENROUTESERVICE_API_KEY',

  // PayPal sandbox (checkout)
  paypalClientId: 'YOUR_PAYPAL_SANDBOX_CLIENT_ID',

  // Trip animation — total ms for the bus to travel each stop-to-stop segment
  simulationStepMs: 15000,
};
