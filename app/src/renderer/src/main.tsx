import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Widget from './Widget'
import './styles.css'
import './widget-styles.css'

const isWidget = window.location.hash === '#widget' || window.location.search.includes('widget=1')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isWidget ? <Widget /> : <App />}
  </React.StrictMode>
)
