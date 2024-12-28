import { Platform } from 'react-native';

let Authenticator: any;
let useAuthenticator: any;

if (Platform.OS === 'web') {
  // Web-specific imports
  const AmplifyUIReact = require('@aws-amplify/ui-react');
  Authenticator = AmplifyUIReact.Authenticator;
  useAuthenticator = AmplifyUIReact.useAuthenticator;

  // Import Amplify UI styles for the web
  require('@aws-amplify/ui-react/styles.css');
  
  const root = document.querySelector('div');
  if (root) {
    root.style.justifyContent = 'center';
    root.style.background = 'linear-gradient(#FFE864, #FEB938)'
    root.style.overflowY = 'scroll'; // Force scroll
  }

} else {
  // Native-specific imports
  const AmplifyUIReactNative = require('@aws-amplify/ui-react-native');
  Authenticator = AmplifyUIReactNative.Authenticator;
  useAuthenticator = AmplifyUIReactNative.useAuthenticator;
}

export { Authenticator, useAuthenticator };
