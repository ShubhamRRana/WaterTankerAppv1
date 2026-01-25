import { registerRootComponent } from 'expo';

// #region agent log
fetch('http://127.0.0.1:7242/ingest/e2f12602-3cdd-4886-b458-25ca917e626a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:3',message:'index.ts module loading',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

import App from './App';

// #region agent log
fetch('http://127.0.0.1:7242/ingest/e2f12602-3cdd-4886-b458-25ca917e626a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:9',message:'App import successful, registering root component',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
